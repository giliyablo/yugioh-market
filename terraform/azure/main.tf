# ==============================================================================
# Azure Provider Configuration
# ==============================================================================
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# ==============================================================================
# Core Resources (Resource Group, VNet, Subnets)
# ==============================================================================

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_virtual_network" "main" {
  name                = "${var.prefix}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_subnet" "app_gateway" {
  name                 = "app-gateway-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "container_apps" {
  name                 = "container-apps-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/23"]
  delegation {
    name = "containerapps"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# ==============================================================================
# Container Registry & Log Analytics
# ==============================================================================

resource "azurerm_container_registry" "main" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.prefix}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# ==============================================================================
# Application Gateway & WAF
# ==============================================================================

resource "azurerm_public_ip" "app_gateway" {
  name                = "${var.prefix}-app-gateway-pip"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_application_gateway" "main" {
  name                = "${var.prefix}-app-gateway"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "app-gateway-ip-config"
    subnet_id = azurerm_subnet.app_gateway.id
  }

  frontend_port {
    name = "http-port"
    port = 80
  }

  frontend_port {
    name = "https-port"
    port = 443
  }

  frontend_ip_configuration {
    name                 = "app-gateway-frontend-ip"
    public_ip_address_id = azurerm_public_ip.app_gateway.id
  }

  # Backend pools will be empty initially and populated after container apps are created
  backend_address_pool {
    name = "${var.prefix}-client-pool"
  }
  backend_address_pool {
    name = "${var.prefix}-server-pool"
  }

  backend_http_settings {
    name                  = "${var.prefix}-http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 20
  }

  http_listener {
    name                           = "${var.prefix}-http-listener"
    frontend_ip_configuration_name = "app-gateway-frontend-ip"
    frontend_port_name             = "http-port"
    protocol                       = "Http"
  }
  
  # Placeholder for HTTPS listener. You need to add a certificate manually
  # or via Terraform after provisioning it.
  # http_listener {
  #   name                           = "${var.prefix}-https-listener"
  #   frontend_ip_configuration_name = "app-gateway-frontend-ip"
  #   frontend_port_name             = "https-port"
  #   protocol                       = "Https"
  #   ssl_certificate_name           = "your-ssl-cert-name"
  # }

  request_routing_rule {
    name               = "path-based-routing"
    rule_type          = "PathBasedRouting"
    http_listener_name = "${var.prefix}-http-listener" # Change to https listener later
    url_path_map_name  = "path-map"
  }
  
  url_path_map {
    name                     = "path-map"
    default_backend_address_pool_name = "${var.prefix}-client-pool"
    default_backend_http_settings_name = "${var.prefix}-http-settings"

    path_rule {
      name = "api-rule"
      paths = ["/api/*"]
      backend_address_pool_name = "${var.prefix}-server-pool"
      backend_http_settings_name = "${var.prefix}-http-settings"
    }
  }

  waf_configuration {
    enabled                  = true
    firewall_mode            = "Prevention"
    rule_set_type            = "OWASP"
    rule_set_version         = "3.2"
  }
}

# ==============================================================================
# Container Apps
# ==============================================================================

resource "azurerm_container_app_environment" "main" {
  name                       = "${var.prefix}-ca-env"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.id
  infrastructure_subnet_id   = azurerm_subnet.container_apps.id
}

resource "azurerm_container_app" "client" {
  name                         = var.client_app_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  template {
    container {
      name   = "client-container"
      image  = "${azurerm_container_registry.main.login_server}/${var.client_app_name}:latest"
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  ingress {
    external_enabled = false
    internal_only    = true
    target_port      = 3000
    transport        = "http"
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    username = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

   secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }
}

resource "azurerm_container_app" "server" {
  name                         = var.server_app_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  
  template {
     container {
      name   = "server-container"
      image  = "${azurerm_container_registry.main.login_server}/${var.server_app_name}:latest"
      cpu    = 0.5
      memory = "1Gi"
    }
  }

  ingress {
    external_enabled = false
    internal_only    = true
    target_port      = 5000
    transport        = "http"
  }
  
  registry {
    server   = azurerm_container_registry.main.login_server
    username = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

   secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }
}

resource "azurerm_container_app" "worker" {
  name                         = var.worker_app_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  template {
    container {
      name   = "worker-container"
      image  = "${azurerm_container_registry.main.login_server}/${var.worker_app_name}:latest"
      cpu    = 1.0
      memory = "2Gi"
    }
  }

  # No ingress for the worker
  ingress {
    target_port = 4000
    transport   = "http"
    external_enabled = false
    internal_only = true
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    username = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

   secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }
}

# Update App Gateway backend pools with the FQDNs of the container apps
resource "azurerm_application_gateway" "main_update" {
  name                = azurerm_application_gateway.main.name
  resource_group_name = azurerm_application_gateway.main.resource_group_name
  location            = azurerm_application_gateway.main.location
  
  # All other properties must be repeated from the original resource
  sku                 = azurerm_application_gateway.main.sku
  gateway_ip_configuration = azurerm_application_gateway.main.gateway_ip_configuration
  frontend_port       = azurerm_application_gateway.main.frontend_port
  frontend_ip_configuration = azurerm_application_gateway.main.frontend_ip_configuration
  backend_http_settings = azurerm_application_gateway.main.backend_http_settings
  request_routing_rule = azurerm_application_gateway.main.request_routing_rule
  url_path_map        = azurerm_application_gateway.main.url_path_map
  waf_configuration   = azurerm_application_gateway.main.waf_configuration

  backend_address_pool {
    name  = "${var.prefix}-client-pool"
    fqdns = [azurerm_container_app.client.latest_revision_fqdn]
  }

  backend_address_pool {
    name  = "${var.prefix}-server-pool"
    fqdns = [azurerm_container_app.server.latest_revision_fqdn]
  }

  depends_on = [
    azurerm_container_app.client,
    azurerm_container_app.server
  ]

  lifecycle {
    ignore_changes = [tags]
  }
}
