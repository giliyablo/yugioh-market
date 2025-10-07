variable "gcp_project_id" {
  description = "Your Google Cloud project ID."
  type        = string
}

variable "gcp_region" {
  description = "The GCP region where resources will be created."
  type        = string
  default     = "us-central1"
}

variable "resource_prefix" {
  description = "A unique prefix for naming resources."
  type        = string
  default     = "yugiohmarket"
}

variable "mongodbatlas_public_key" {
  description = "Your MongoDB Atlas public API key."
  type        = string
  sensitive   = true
}

variable "mongodbatlas_private_key" {
  description = "Your MongoDB Atlas private API key."
  type        = string
  sensitive   = true
}

variable "mongodbatlas_org_id" {
  description = "Your MongoDB Atlas Organization ID."
  type        = string
}