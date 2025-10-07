# Configure the required providers: Google Cloud and MongoDB Atlas
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15"
    }
  }
}

# Configure the Google Cloud provider
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# Configure the MongoDB Atlas provider
provider "mongodbatlas" {
  public_key  = var.mongodbatlas_public_key
  private_key = var.mongodbatlas_private_key
}

# Enable necessary GCP APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
  ])
  project = var.gcp_project_id
  service = each.key
}

# 1. Create a Docker repository in Artifact Registry
resource "google_artifact_registry_repository" "ar" {
  location      = var.gcp_region
  repository_id = "${var.resource_prefix}-repo"
  format        = "DOCKER"
  depends_on    = [google_project_service.apis]
}

# 2. Create a MongoDB Atlas project
resource "mongodbatlas_project" "db_project" {
  name   = "${var.resource_prefix}-project"
  org_id = var.mongodbatlas_org_id
}

# 3. Create a MongoDB Atlas cluster hosted on GCP
resource "mongodbatlas_cluster" "db_cluster" {
  project_id   = mongodbatlas_project.db_project.id
  name         = "${var.resource_prefix}-cluster"
  provider_name = "TENANT"
  backing_provider_name = "GCP"
  provider_region_name = "US_CENTRAL_1"
  provider_instance_size_name = "M0" # M0 is a free tier, suitable for development
}

# 4. Create a database user
resource "mongodbatlas_database_user" "db_user" {
  username           = "yugioh_user"
  password           = "aSecurePassword123!" # IMPORTANT: Change this password
  project_id         = mongodbatlas_project.db_project.id
  auth_database_name = "admin"
  roles {
    role_name     = "readWriteAnyDatabase"
    database_name = "admin"
  }
}

# 5. Allow connections from anywhere (for Cloud Run)
# In production, you should restrict this to specific IPs.
resource "mongodbatlas_project_ip_access_list" "db_access" {
  project_id = mongodbatlas_project.db_project.id
  cidr_block = "0.0.0.0/0"
  comment    = "Allow access from all IPs for Cloud Run services"
}

# 6. Create the Cloud Run service for the backend server
resource "google_cloud_run_v2_service" "server_app" {
  name     = "${var.resource_prefix}-server"
  location = var.gcp_region

  template {
    containers {
      image = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.ar.repository_id}/server:latest"
      ports {
        container_port = 5000 # The port your server listens on
      }
      env {
        name  = "MONGO_URI"
        value = "mongodb+srv://${mongodbatlas_database_user.db_user.username}:${mongodbatlas_database_user.db_user.password}@${mongodbatlas_cluster.db_cluster.srv_address}/yugioh_db?retryWrites=true&w=majority"
      }
    }
  }
  depends_on = [google_project_service.apis, mongodbatlas_project_ip_access_list.db_access]
}

# 7. Create the Cloud Run service for the frontend client
resource "google_cloud_run_v2_service" "client_app" {
  name     = "${var.resource_prefix}-client"
  location = var.gcp_region

  template {
    containers {
      image = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.ar.repository_id}/client:latest"
      ports {
        container_port = 5173 # The port your Vite dev server listens on
      }
      env {
        name  = "VITE_API_URL"
        value = google_cloud_run_v2_service.server_app.uri
      }
    }
  }
  depends_on = [google_cloud_run_v2_service.server_app]
}

# 8. Allow public, unauthenticated access to the client service
resource "google_cloud_run_v2_service_iam_member" "client_public_access" {
  project  = var.gcp_project_id
  location = var.gcp_region
  name     = google_cloud_run_v2_service.client_app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Output the public URL of the client application
output "client_url" {
  description = "The public URL of the client web application."
  value       = google_cloud_run_v2_service.client_app.uri
}