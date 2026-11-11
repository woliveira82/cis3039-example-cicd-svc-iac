output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "function_app_name" {
  value = azurerm_windows_function_app.this.name
}

output "products_url" {
  value = "https://${azurerm_windows_function_app.this.default_hostname}/api/products"
}

output "application_insights_name" {
  value = azurerm_application_insights.this.name
}
