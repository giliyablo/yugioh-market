# Configure the Terraform Azure provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Define variables for location and naming prefixes
variable "location" {
  description = "The Azure region where resources will be created."
  type        = string
  default     = "East US"
}

variable "resource_prefix" {
  description = "A unique prefix for naming resources."
  type        = string
  default     = "yugiohmarket"
}

# 1. Create a Resource Group to organize all resources
resource "azurerm_resource_group" "rg" {
  name     = "${var.resource_prefix}-rg"
  location = var.location
}

# 2. Create an Azure Container Registry (ACR) to store Docker images
resource "azurerm_container_registry" "acr" {
  name                = "${var.resource_prefix}acr"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true # Required for Container Apps to pull images
}

# 3. Create a Cosmos DB account with the MongoDB API for the database
resource "azurerm_cosmosdb_account" "db" {
  name                = "${var.resource_prefix}-cosmosdb"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  offer_type          = "Standard"
  kind                = "MongoDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }
}

# 4. Create a Container App Environment, which is a secure boundary for our apps
resource "azurerm_container_app_environment" "env" {
  name                = "${var.resource_prefix}-env"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

# 5. Create the Container App for the backend server
resource "azurerm_container_app" "server_app" {
  name                         = "${var.resource_prefix}-server-app"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.env.id

  registry {
    server   = azurerm_container_registry.acr.login_server
    username = azurerm_container_registry.acr.admin_username
    password = azurerm_container_registry.acr.admin_password
  }

  template {
    min_replicas = 1
    max_replicas = 1

    container {
      name   = "server"
      image  = "${azurerm_container_registry.acr.login_server}/server:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      # Pass the database connection string as a secure environment variable
      secret {
        name  = "mongo-uri"
        value = azurerm_cosmosdb_account.db.connection_strings[0]
      }
      
      env {
        name        = "MONGO_URI"
        secret_name = "mongo-uri"
      }
    }
  }
}

# 6. Create the Container App for the frontend client
resource "azurerm_container_app" "client_app" {
  name                         = "${var.resource_prefix}-client-app"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.env.id

  registry {
    server   = azurerm_container_registry.acr.login_server
    username = azurerm_container_registry.acr.admin_username
    password = azurerm_container_registry.acr.admin_password
  }

  # Enable Ingress to make the client publicly accessible
  ingress {
    external_enabled = true
    target_port      = 5173
    transport        = "http"
  }

  template {
    min_replicas = 1
    max_replicas = 1

    container {
      name   = "client"
      image  = "${azurerm_container_registry.acr.login_server}/client:latest"
      cpu    = 0.25
      memory = "0.5Gi"
      
      # Pass the server's URL to the client as an environment variable
      env {
        name  = "VITE_API_URL"
        value = "https://${azurerm_container_app.server_app.latest_revision_fqdn}"
      }
    }
  }
}

# Output the public URL of the client application
output "client_url" {
  description = "The public URL of the client web application."
  value       = "https://${azurerm_container_app.client_app.latest_revision_fqdn}"
}