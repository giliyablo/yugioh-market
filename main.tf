terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = "your-gcp-project-id" # CHANGE THIS
  region  = "europe-west1"         # Example: Belgium
}

# 1. Enable necessary APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com"
  ])
  project = "your-gcp-project-id" # CHANGE THIS
  service = each.key
}

# 2. Create a Docker repository in Artifact Registry
resource "google_artifact_registry_repository" "repo" {
  location      = "europe-west1"
  repository_id = "yugioh-market-repo"
  format        = "DOCKER"
  depends_on    = [google_project_service.apis]
}

# 3. Create a PostgreSQL database instance on Cloud SQL
resource "google_sql_database_instance" "postgres" {
  name             = "yugioh-db-instance"
  database_version = "POSTGRES_14"
  region           = "europe-west1"
  settings {
    tier = "db-f1-micro" # Smallest, cheapest tier for development/low traffic
    ip_configuration {
      authorized_networks {
        name  = "allow-all"
        value = "0.0.0.0/0" # WARNING: Allows all IPs. For production, restrict this.
      }
    }
  }
  deletion_protection = false # Set to true for production
  depends_on          = [google_project_service.apis]
}

# 4. Store the database password securely in Secret Manager
resource "google_secret_manager_secret" "db_password_secret" {
  secret_id = "db-password"
  replication {
    automatic = true
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password_secret.id
  secret_data = "your-strong-password" # CHANGE THIS
}

# 5. Deploy the backend server to Cloud Run
resource "google_cloud_run_v2_service" "backend" {
  name     = "yugioh-backend-service"
  location = "europe-west1"

  template {
    containers {
      image = "europe-west1-docker.pkg.dev/your-gcp-project-id/yugioh-market-repo/server:latest" # CHANGE THIS path to your image
      ports {
        container_port = 5000 # The port your Node.js app listens on
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql://postgres:${google_sql_database_instance.postgres.root_password}@${google_sql_database_instance.postgres.public_ip_address}:5432/yugioh_db"
      }
      # A better way for production: using the secret created above
      # env {
      #   name = "DB_PASSWORD"
      #   value_source {
      #     secret_key_ref {
      #       secret = google_secret_manager_secret.db_password_secret.secret_id
      #       version = "latest"
      #     }
      #   }
      # }
    }
    scaling {
      min_instance_count = 0 # Scale to zero when idle
      max_instance_count = 2 # Max instances for cost control
    }
  }
  depends_on = [google_project_service.apis]
}

# 6. Deploy the frontend server to Cloud Run
resource "google_cloud_run_v2_service" "frontend" {
  name     = "yugioh-frontend-service"
  location = "europe-west1"
  ingress  = "INGRESS_TRAFFIC_ALL" # Make it publicly accessible

  template {
    containers {
      image = "europe-west1-docker.pkg.dev/your-gcp-project-id/yugioh-market-repo/client:latest" # CHANGE THIS path to your image
      ports {
        container_port = 80 # The port your Nginx container listens on
      }
    }
    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }
  }
  depends_on = [google_project_service.apis]
}

# 7. Output the URL of the frontend service
output "frontend_url" {
  value = google_cloud_run_v2_service.frontend.uri
}