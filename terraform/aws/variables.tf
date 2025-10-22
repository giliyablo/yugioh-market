variable "aws_region" {
  description = "The AWS region to deploy resources in."
  type        = string
  default     = "us-east-1"
}

variable "prefix" {
  description = "A prefix to add to all resource names."
  type        = string
  default     = "tcg-market"
}

variable "acm_certificate_arn" {
  description = "The ARN of the AWS Certificate Manager (ACM) certificate for the domain."
  type        = string
  # You must create this certificate in the AWS console for your domain
  # and provide the ARN here.
}

variable "client_repo_name" {
  description = "The name of the ECR repository for the client."
  type        = string
  default     = "tcg-marketplace-client"
}

variable "server_repo_name" {
  description = "The name of the ECR repository for the server."
  type        = string
  default     = "tcg-marketplace-server"
}

variable "worker_repo_name" {
  description = "The name of the ECR repository for the worker."
  type        = string
  default     = "tcg-marketplace-worker"
}

variable "ecs_cluster_name" {
  description = "The name of the ECS cluster."
  type        = string
  default     = "tcg-market-cluster"
}

variable "client_service_name" {
  description = "The name of the ECS service for the client."
  type        = string
  default     = "tcg-client-service"
}

variable "server_service_name" {
  description = "The name of the ECS service for the server."
  type        = string
  default     = "tcg-server-service"
}

variable "worker_service_name" {
  description = "The name of the ECS service for the worker."
  type        = string
  default     = "tcg-worker-service"
}
