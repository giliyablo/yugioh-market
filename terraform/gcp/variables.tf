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

variable "prefix" {
  description = "A prefix for resource names to ensure uniqueness."
  type        = string
  default     = "tcg-market"
}

variable "domain_name" {
  description = "Your custom domain name (e.g., tcgsmarketplace.com)"
  type        = string
  # IMPORTANT: You must replace this with your actual domain name.
  default     = "example.com"
}

variable "network" {
  description = "The name of the VPC network."
  type        = string
  default     = "tcg-market-vpc"
}

variable "subnet" {
  description = "The name of the VPC subnet."
  type        = string
  default     = "tcg-market-subnet"
}

variable "connector" {
  description = "The name of the Serverless VPC Access Connector."
  type        = string
  default     = "tcg-market-connector"
}

variable "ip_name" {
  description = "The name for the static global IP address."
  type        = string
  default     = "tcg-market-lb-ip"
}

variable "ssl_cert_name" {
  description = "The name for the Google-managed SSL certificate."
  type        = string
  default     = "tcg-market-ssl-cert"
}

variable "armor_policy_name" {
  description = "The name of the Cloud Armor security policy."
  type        = string
  default     = "tcg-market-waf-policy"
}

variable "service_account_name" {
  description = "The name of the IAM service account for Cloud Run."
  type        = string
  default     = "tcg-run-sa"
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
