variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name tag and prefix"
  type        = string
  default     = "fcaj-event-workshop"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "dynamodb_table_name" {
  description = "Name of DynamoDB table"
  type        = string
  default     = "fcaj-project-events"
}

variable "allowed_origins" {
  description = "Comma separated allowed origins for CORS and Auth (use * or CloudFront domain)"
  type        = string
  default     = "*"
}

