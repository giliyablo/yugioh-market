variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "fourth-arena-474414-h6"
}

variable "region" {
  description = "The GCP region for the resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

variable "server_service_name" {
  description = "The name of the server Cloud Run service"
  type        = string
  default     = "tcg-marketplace-server"
}

variable "worker_service_name" {
  description = "The name of the worker Cloud Run service"
  type        = string
  default     = "tcg-marketplace-worker"
}

variable "client_service_name" {
  description = "The name of the client Cloud Run service"
  type        = string
  default     = "tcg-marketplace-client"
}
