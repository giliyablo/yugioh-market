variable "resource_group_name" {
  description = "The name of the Azure Resource Group."
  type        = string
  default     = "tcg-market-rg"
}

variable "location" {
  description = "The Azure region to deploy resources in."
  type        = string
  default     = "East US"
}

variable "prefix" {
  description = "A prefix to add to resource names."
  type        = string
  default     = "tcgmarket"
}

variable "acr_name" {
  description = "The globally unique name for the Azure Container Registry."
  type        = string
  default     = "tcgmarketacr" # CHANGE THIS to something unique
}

variable "client_app_name" {
  description = "The name of the Container App for the client."
  type        = string
  default     = "tcg-marketplace-client"
}

variable "server_app_name" {
  description = "The name of the Container App for the server."
  type        = string
  default     = "tcg-marketplace-server"
}

variable "worker_app_name" {
  description = "The name of the Container App for the worker."
  type        = string
  default     = "tcg-marketplace-worker"
}
