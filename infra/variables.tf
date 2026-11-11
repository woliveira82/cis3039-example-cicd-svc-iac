variable "subscription_id" {
  description = "Azure subscription to deploy into (see `az account show`). Leave null to use the current az CLI subscription."
  type        = string
  default     = null
}

variable "location" {
  description = "Azure region, which must be permitted by your subscription's policy (e.g. uksouth)."
  type        = string
  default     = "uksouth"
}

variable "project" {
  description = "First part of the resource names, e.g. shopping in shopping-lab-x7k2qm-rg."
  type        = string
  default     = "shopping"
}

variable "environment" {
  description = "Second part of the resource names, e.g. lab in shopping-lab-x7k2qm-rg."
  type        = string
  default     = "lab"
}

variable "node_version" {
  description = "Node.js version for the Function App runtime."
  type        = string
  default     = "~22"
}

variable "product_updated_base_url" {
  description = "Base URL of the product-updated event receiver, without a trailing slash. Leave empty to leave the setting unset."
  type        = string
  default     = ""

  validation {
    condition     = can(regex("^$|^https?://.*[^/]$", var.product_updated_base_url))
    error_message = "Must be empty, or an http(s) URL without a trailing slash."
  }
}

variable "cors_allowed_origins" {
  description = "Origins allowed to make cross-domain calls, e.g. http://localhost:5173."
  type        = list(string)
  default     = []
}
