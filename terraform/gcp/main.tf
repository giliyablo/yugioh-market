# ==============================================================================
# GCP Provider & Project Configuration
# ==============================================================================
terraform {
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

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "secretmanager.googleapis.com",
    "compute.googleapis.com",
    "vpcaccess.googleapis.com"
  ])

  service            = each.value
  disable_on_destroy = false
}

# ==============================================================================
# Service Account for Cloud Run Services
# ==============================================================================
resource "google_service_account" "cloud_run_sa" {
  project      = var.project_id
  account_id   = var.service_account_name
  display_name = "TCG Marketplace Cloud Run Service Account"
  depends_on   = [google_project_service.apis]
}

resource "google_project_iam_member" "cloud_run_firestore_access" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# ==============================================================================
# Networking (VPC, Subnet, VPC Connector)
# ==============================================================================
resource "google_compute_network" "main" {
  project                 = var.project_id
  name                    = var.network
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "main" {
  project       = var.project_id
  name          = var.subnet
  ip_cidr_range = "10.8.0.0/28"
  region        = var.region
  network       = google_compute_network.main.id
}

resource "google_vpc_access_connector" "main" {
  project       = var.project_id
  name          = var.connector
  region        = var.region
  subnet {
    name = google_compute_subnetwork.main.name
  }
  machine_type = "e2-micro"
  depends_on   = [google_project_service.apis]
}

# ==============================================================================
# External HTTPS Load Balancer & WAF
# ==============================================================================

# 1. Reserve Static IP
resource "google_compute_global_address" "lb_ip" {
  project = var.project_id
  name    = var.ip_name
}

# 2. Create Serverless NEGs (Network Endpoint Groups)
resource "google_compute_region_network_endpoint_group" "client_neg" {
  project                = var.project_id
  name                   = "${var.prefix}-client-neg"
  network_endpoint_type  = "SERVERLESS"
  region                 = var.region
  cloud_run {
    service = var.client_service_name
  }
}

resource "google_compute_region_network_endpoint_group" "server_neg" {
  project                = var.project_id
  name                   = "${var.prefix}-server-neg"
  network_endpoint_type  = "SERVERLESS"
  region                 = var.region
  cloud_run {
    service = var.server_service_name
  }
}

# 3. Create Cloud Armor Security Policy (WAF)
resource "google_compute_security_policy" "waf_policy" {
  project     = var.project_id
  name        = var.armor_policy_name
  description = "WAF policy for TCG Marketplace"

  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-stable')"
      }
    }
    description = "SQLi Protection"
  }
}

# 4. Create Backend Services
resource "google_compute_backend_service" "client_backend" {
  project         = var.project_id
  name            = "${var.prefix}-client-backend"
  protocol        = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy = google_compute_security_policy.waf_policy.self_link

  backend {
    group = google_compute_region_network_endpoint_group.client_neg.id
  }
}

resource "google_compute_backend_service" "server_backend" {
  project         = var.project_id
  name            = "${var.prefix}-server-backend"
  protocol        = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy = google_compute_security_policy.waf_policy.self_link
  
  backend {
    group = google_compute_region_network_endpoint_group.server_neg.id
  }
}

# 5. Create URL Map for routing
resource "google_compute_url_map" "lb_map" {
  project         = var.project_id
  name            = "${var.prefix}-lb-map"
  default_service = google_compute_backend_service.client_backend.id

  host_rule {
    hosts        = [var.domain_name]
    path_matcher = "api-matcher"
  }

  path_matcher {
    name            = "api-matcher"
    default_service = google_compute_backend_service.client_backend.id

    path_rule {
      paths   = ["/api/*"]
      service = google_compute_backend_service.server_backend.id
    }
  }
}

# 6. Create Google-managed SSL Certificate
resource "google_compute_managed_ssl_certificate" "ssl_cert" {
  project = var.project_id
  name    = var.ssl_cert_name
  managed {
    domains = [var.domain_name]
  }
}

# 7. Create Target HTTPS Proxy
resource "google_compute_target_https_proxy" "https_proxy" {
  project         = var.project_id
  name            = "${var.prefix}-https-proxy"
  url_map         = google_compute_url_map.lb_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.ssl_cert.id]
}

# 8. Create Global Forwarding Rule (Frontend)
resource "google_compute_global_forwarding_rule" "forwarding_rule" {
  project      = var.project_id
  name         = "${var.prefix}-forwarding-rule"
  target       = google_compute_target_https_proxy.https_proxy.id
  ip_address   = google_compute_global_address.lb_ip.address
  port_range   = "443"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
