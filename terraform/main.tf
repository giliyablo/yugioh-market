terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "containerregistry.googleapis.com",
    "firestore.googleapis.com",
    "firebase.googleapis.com",
    "storage.googleapis.com",
    "compute.googleapis.com"
  ])

  service = each.value
  disable_on_destroy = false
}

# Cloud Storage bucket for static assets
resource "google_storage_bucket" "static_assets" {
  name          = "${var.project_id}-static-assets"
  location      = "US"
  force_destroy = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Cloud Storage bucket for uploads
resource "google_storage_bucket" "uploads" {
  name          = "${var.project_id}-uploads"
  location      = "US"
  force_destroy = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# IAM binding for Cloud Run service account
resource "google_project_iam_member" "cloud_run_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "cloud_run_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Service account for Cloud Run
resource "google_service_account" "cloud_run" {
  account_id   = "TCG-marketplace-run"
  display_name = "TCG Marketplace Cloud Run Service Account"
}

# Cloud Run service
resource "google_cloud_run_v2_service" "tcg_marketplace" {
  name     = "TCG-marketplace"
  location = var.region

  template {
    service_account = google_service_account.cloud_run.email
    
    containers {
      image = "gcr.io/${var.project_id}/tcg-marketplace:latest"
      
      ports {
        container_port = 5000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "5000"
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
        cpu_idle = true
        startup_cpu_boost = true
      }

      startup_probe {
        http_get {
          path = "/test-firestore"
          port = 5000
        }
        initial_delay_seconds = 10
        timeout_seconds = 3
        period_seconds = 3
        failure_threshold = 1
      }

      liveness_probe {
        http_get {
          path = "/test-firestore"
          port = 5000
        }
        initial_delay_seconds = 30
        timeout_seconds = 3
        period_seconds = 10
        failure_threshold = 3
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
  }

  depends_on = [google_project_service.apis]
}

# Allow unauthenticated access to Cloud Run
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.tcg_marketplace.location
  name     = google_cloud_run_v2_service.tcg_marketplace.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Load Balancer
resource "google_compute_global_address" "default" {
  name = "tcg-marketplace-ip"
}

resource "google_compute_url_map" "default" {
  name            = "tcg-marketplace-lb"
  default_service = google_compute_backend_service.default.id
}

resource "google_compute_backend_service" "default" {
  name        = "tcg-marketplace-backend"
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30

  backend {
    group = google_compute_region_network_endpoint_group.cloudrun_neg.id
  }
}

resource "google_compute_region_network_endpoint_group" "cloudrun_neg" {
  name                  = "tcg-marketplace-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_v2_service.tcg_marketplace.name
  }
}

resource "google_compute_global_forwarding_rule" "default" {
  name       = "tcg-marketplace-forwarding-rule"
  target     = google_compute_target_http_proxy.default.id
  port_range = "5000"
  ip_address = google_compute_global_address.default.id
}

resource "google_compute_target_http_proxy" "default" {
  name    = "tcg-marketplace-proxy"
  url_map = google_compute_url_map.default.id
}

# Outputs
output "cloud_run_url" {
  value = google_cloud_run_v2_service.tcg_marketplace.uri
}

output "load_balancer_ip" {
  value = google_compute_global_address.default.address
}

output "static_assets_bucket" {
  value = google_storage_bucket.static_assets.name
}
