# 1. Resource Group
resource "azurerm_resource_group" "main" {
  name     = "YugiohMarketRG"
  location = "West Europe"
}

# 2. Azure Container Registry
resource "azurerm_container_registry" "acr" {
  name                = "yugiohmarketacr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
}

# 3. Azure Database for PostgreSQL - Flexible Server
resource "azurerm_postgresql_flexible_server" "postgres" {
  name                = "yugioh-db-server"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku_name            = "B_Standard_B1ms" # Burstable, low-cost SKU
  # ... other configs like admin login, password, etc.
}

# 4. Container Apps Environment (The hosting environment)
resource "azurerm_container_app_environment" "main" {
  name                = "yugioh-env"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

# 5. Container App (Backend)
resource "azurerm_container_app" "backend" {
  name                         = "backend-app"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  
  template {
    container {
      name   = "server"
      image  = "yugiohmarketacr.azurecr.io/server:latest"
      # ... CPU, memory, environment variables for DB connection
    }
    min_replicas = 0 # Scale to zero
  }
}

# 6. Container App (Frontend)
# ... Similar resource block for the frontend container.