# Keeps the globally unique storage account and Function App names from
# clashing. Stored in state, so it stays the same across applies.
resource "random_string" "suffix" {
  length  = 6
  upper   = false
  special = false
}

locals {
  # Follows our naming convention, e.g. shopping-lab-x7k2qm-rg.
  name_prefix = "${var.project}-${var.environment}-${random_string.suffix.result}"

  # Storage account names allow only lowercase letters and digits, 3-24 characters.
  storage_account_name = "${replace(local.name_prefix, "-", "")}st"
}

# 1. Resource group (az group create)
resource "azurerm_resource_group" "this" {
  name     = "${local.name_prefix}-rg"
  location = var.location
}

# 2. Storage account required by Azure Functions (az storage account create --sku Standard_LRS)
resource "azurerm_storage_account" "func" {
  name                            = local.storage_account_name
  resource_group_name             = azurerm_resource_group.this.name
  location                        = azurerm_resource_group.this.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false

  lifecycle {
    precondition {
      condition     = length(local.storage_account_name) <= 24
      error_message = "project + environment are too long: the storage account name '${local.storage_account_name}' exceeds 24 characters."
    }
  }
}

# `az functionapp create` adds this implicitly, named after the Function App.
resource "azurerm_application_insights" "this" {
  name                = "${local.name_prefix}-func"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  application_type    = "web"

  # Azure auto-assigns a workspace; ignore it to avoid perpetual diffs.
  lifecycle {
    ignore_changes = [workspace_id]
  }
}

# 3. Consumption plan (az functionapp create --consumption-plan-location)
resource "azurerm_service_plan" "this" {
  name                = "${local.name_prefix}-plan"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  os_type             = "Windows"
  sku_name            = "Y1"
}

# Function App (az functionapp create --runtime node --functions-version 4)
resource "azurerm_windows_function_app" "this" {
  name                = "${local.name_prefix}-func"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  service_plan_id     = azurerm_service_plan.this.id
  https_only          = true

  storage_account_name       = azurerm_storage_account.func.name
  storage_account_access_key = azurerm_storage_account.func.primary_access_key

  functions_extension_version = "~4"

  app_settings = var.product_updated_base_url == "" ? {} : {
    PRODUCT_UPDATED_BASE_URL = var.product_updated_base_url
  }

  site_config {
    application_insights_connection_string = azurerm_application_insights.this.connection_string

    application_stack {
      node_version = var.node_version
    }

    # az functionapp cors add --allowed-origins ...
    dynamic "cors" {
      for_each = length(var.cors_allowed_origins) > 0 ? [1] : []

      content {
        allowed_origins = var.cors_allowed_origins
      }
    }
  }

  # `func azure functionapp publish` manages these settings; don't fight it.
  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["WEBSITE_ENABLE_SYNC_UPDATE_SITE"],
    ]
  }
}
