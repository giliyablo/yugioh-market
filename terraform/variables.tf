variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "fourth-arena-474414-h6"
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
