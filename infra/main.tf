# 1. Resource group (az group create)
resource "azurerm_resource_group" "this" {
  count    = var.create_resource_group ? 1 : 0
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

data "azurerm_resource_group" "existing" {
  count = var.create_resource_group ? 0 : 1
  name  = var.resource_group_name
}

locals {
  resource_group_name = var.create_resource_group ? azurerm_resource_group.this[0].name : data.azurerm_resource_group.existing[0].name
}

# 2. Storage account required by Azure Functions (az storage account create --sku Standard_LRS)
resource "azurerm_storage_account" "func" {
  name                     = var.storage_account_name
  resource_group_name      = local.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = var.tags
}

# Application Insights (az functionapp create provisions this by default)
resource "azurerm_application_insights" "func" {
  name                = "${var.function_app_name}-ai"
  resource_group_name = local.resource_group_name
  location            = var.location
  application_type    = "Node.JS"
  tags                = var.tags

  # Azure auto-assigns a workspace; ignore it to avoid perpetual diffs.
  lifecycle {
    ignore_changes = [workspace_id]
  }
}

# 3. Consumption plan (az functionapp create --consumption-plan-location)
resource "azurerm_service_plan" "func" {
  name                = "${var.function_app_name}-plan"
  resource_group_name = local.resource_group_name
  location            = var.location
  os_type             = "Windows"
  sku_name            = "Y1"
  tags                = var.tags
}

# Function App (az functionapp create --runtime node --functions-version 4)
resource "azurerm_windows_function_app" "this" {
  name                = var.function_app_name
  resource_group_name = local.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.func.id

  storage_account_name       = azurerm_storage_account.func.name
  storage_account_access_key = azurerm_storage_account.func.primary_access_key

  functions_extension_version = "~4"
  https_only                  = true

  site_config {
    application_insights_connection_string = azurerm_application_insights.func.connection_string

    application_stack {
      node_version = var.node_version
    }

    # az functionapp cors add --allowed-origins ...
    cors {
      allowed_origins = var.cors_allowed_origins
    }
  }

  app_settings = var.app_settings

  tags = var.tags

  # `func azure functionapp publish` manages these settings; don't fight it.
  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["WEBSITE_ENABLE_SYNC_UPDATE_SITE"],
    ]
  }
}
