output "resource_group_name" {
  value = local.resource_group_name
}

output "function_app_name" {
  value = azurerm_windows_function_app.this.name
}

output "function_app_url" {
  value = "https://${azurerm_windows_function_app.this.default_hostname}"
}

output "products_endpoint" {
  value = "https://${azurerm_windows_function_app.this.default_hostname}/api/products"
}
