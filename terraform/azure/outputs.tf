output "application_gateway_public_ip" {
  description = "The public IP address of the Application Gateway."
  value       = azurerm_public_ip.app_gateway.ip_address
}

output "container_registry_login_server" {
  description = "The login server for the Azure Container Registry."
  value       = azurerm_container_registry.main.login_server
}
