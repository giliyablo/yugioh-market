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

# --- GCP Service APIs ---
# Enables the APIs required for Cloud Run, Cloud Build, and Secret Manager.
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "secretmanager.googleapis.com"
  ])

  service            = each.value
  disable_on_destroy = false
}

# --- Service Account ---
# A dedicated service account for the Cloud Run services to interact with other GCP services.
resource "google_service_account" "cloud_run_sa" {
  account_id   = "tcg-run-sa"
  display_name = "TCG Marketplace Cloud Run Service Account"
  project      = var.project_id
}

# Grant the service account permissions to access Firestore.
resource "google_project_iam_member" "cloud_run_firestore_access" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# --- Cloud Run Service: Server ---
resource "google_cloud_run_v2_service" "server" {
  name     = var.server_service_name
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.cloud_run_sa.email
    containers {
      image = "gcr.io/${var.project_id}/${var.server_service_name}:latest"
      ports { container_port = 5000 }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      resources {
        limits = { cpu = "1", memory = "1Gi" }
      }
      startup_probe {
        http_get { path = "/api/health", port = 5000 }
      }
    }
  }
  depends_on = [google_project_service.apis]
}

# Allow public access to the server service.
resource "google_cloud_run_v2_service_iam_member" "server_public_access" {
  project  = var.project_id
  location = google_cloud_run_v2_service.server.location
  name     = google_cloud_run_v2_service.server.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --- Cloud Run Service: Worker ---
resource "google_cloud_run_v2_service" "worker" {
  name     = var.worker_service_name
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.cloud_run_sa.email
    containers {
      image = "gcr.io/${var.project_id}/${var.worker_service_name}:latest"
      ports { container_port = 4000 }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      resources {
        limits = { cpu = "2", memory = "2Gi" }
      }
      startup_probe {
        http_get { path = "/health", port = 4000 }
      }
    }
  }
  depends_on = [google_project_service.apis]
}
# Note: No public access IAM member for the worker. It is not publicly invokable.

# --- Cloud Run Service: Client ---
resource "google_cloud_run_v2_service" "client" {
  name     = var.client_service_name
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.cloud_run_sa.email
    containers {
      image = "gcr.io/${var.project_id}/${var.client_service_name}:latest"
      ports { container_port = 3000 }
      env {
        name  = "VITE_API_URL"
        value = "${google_cloud_run_v2_service.server.uri}/api"
      }
      resources {
        limits = { cpu = "1", memory = "1Gi" }
      }
      startup_probe {
        # The client is a static site, so a probe to the root path is sufficient.
        http_get { path = "/", port = 3000 }
      }
    }
  }
  depends_on = [
    google_project_service.apis,
    google_cloud_run_v2_service.server # Ensure server is created first to get its URL
  ]
}

# Allow public access to the client service.
resource "google_cloud_run_v2_service_iam_member" "client_public_access" {
  project  = var.project_id
  location = google_cloud_run_v2_service.client.location
  name     = google_cloud_run_v2_service.client.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
