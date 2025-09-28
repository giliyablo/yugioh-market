# main.tf

# --- Provider Configuration ---
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

provider "google" {
  project = "your-gcp-project-id" # CHANGE THIS
  region  = "europe-west1"
}

provider "mongodbatlas" {
  public_key  = "YOUR_ATLAS_PUBLIC_KEY"  # CHANGE THIS
  private_key = "YOUR_ATLAS_PRIVATE_KEY" # CHANGE THIS
}

# --- MongoDB Atlas Configuration ---

# 1. Create a new project in MongoDB Atlas
resource "mongodbatlas_project" "market" {
  name  = "YugiohMarketProject"
  org_id = "YOUR_ATLAS_ORG_ID" # Find this in your Atlas account settings
}

# 2. Create a free-tier (M0) MongoDB cluster
resource "mongodbatlas_cluster" "main" {
  project_id   = mongodbatlas_project.market.id
  name         = "yugioh-market-cluster"
  provider_name = "TENANT"      # Required for M0 clusters
  backing_provider_name = "GCP" # Deploy the DB on GCP infrastructure
  provider_region_name = "EUROPE_WEST_1" # Match your GCP region
  provider_instance_size_name = "M0"     # The free tier
}

# 3. Create a database user to connect with
resource "mongodbatlas_database_user" "main_user" {
  project_id      = mongodbatlas_cluster.main.project_id
  auth_database_name = "admin"
  username           = "marketUser"
  password           = "a-very-strong-password" # CHANGE THIS
  roles {
    role_name     = "readWrite"
    database_name = "yugiohDB" # The name of your main database
  }
}

# 4. Allow connections from anywhere (for Cloud Run)
resource "mongodbatlas_project_ip_access_list" "allow_all" {
  project_id = mongodbatlas_project.market.id
  cidr_block = "0.0.0.0/0"
  comment    = "Allow connections from anywhere for serverless services."
}

# --- Google Cloud Configuration (Mostly the same) ---

# (API services, Artifact Registry repo... see previous response)
# ...

# 5. Store the MongoDB Connection String in Google Secret Manager
resource "google_secret_manager_secret" "mongo_uri_secret" {
  secret_id = "mongo-connection-string"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "mongo_uri_version" {
  secret      = google_secret_manager_secret.mongo_uri_secret.id
  # We construct the connection string using outputs from the Atlas cluster
  # Note: The password here is in plain text. For production, use a variable or another secret.
  secret_data = "mongodb+srv://${mongodbatlas_database_user.main_user.username}:${mongodbatlas_database_user.main_user.password}@${trimsuffix(mongodbatlas_cluster.main.connection_strings[0].standard_srv, "/")}/yugiohDB?retryWrites=true&w=majority"
}

# 6. Deploy the backend server to Cloud Run
resource "google_cloud_run_v2_service" "backend" {
  name     = "yugioh-backend-service"
  location = "europe-west1"

  template {
    containers {
      image = "europe-west1-docker.pkg.dev/your-gcp-project-id/yugioh-market-repo/server:latest" # CHANGE THIS

      env {
        name = "MONGO_URI"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.mongo_uri_secret.secret_id
            version = "latest"
          }
        }
      }
    }
    # ... scaling config ...
  }
}

# 7. Output the URL of the frontend service
output "frontend_url" {
  value = google_cloud_run_v2_service.frontend.uri
}