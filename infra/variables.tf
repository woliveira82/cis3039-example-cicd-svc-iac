variable "subscription_id" {
  description = "Azure subscription ID. Leave null to use ARM_SUBSCRIPTION_ID / the current az CLI subscription."
  type        = string
  default     = null
}

variable "location" {
  description = "Permitted Azure location (see README: az policy assignment list ...), e.g. uksouth."
  type        = string
  default     = "uksouth"
}

variable "resource_group_name" {
  description = "Resource group name, following the naming convention, e.g. shopping-lab-ab47-rg."
  type        = string
}

variable "create_resource_group" {
  description = "Set to false to use an existing resource group instead of creating one."
  type        = bool
  default     = true
}

variable "storage_account_name" {
  description = "Globally unique storage account name for the Function App (3-24 lowercase letters and numbers)."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "storage_account_name must be 3-24 characters, lowercase letters and numbers only."
  }
}

variable "function_app_name" {
  description = "Globally unique Function App name (becomes <name>.azurewebsites.net)."
  type        = string
}

variable "node_version" {
  description = "Node.js version for the Function App runtime."
  type        = string
  default     = "~22"
}

variable "cors_allowed_origins" {
  description = "Origins allowed to call the API cross-domain, e.g. [\"http://localhost:5173\"]."
  type        = list(string)
  default     = []
}

variable "app_settings" {
  description = "Additional application settings (e.g. PRODUCT_UPDATED_BASE_URL)."
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default     = {}
}
