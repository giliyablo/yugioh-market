output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer."
  value       = aws_lb.main.dns_name
}

output "client_ecr_repository_url" {
  description = "The URL of the ECR repository for the client."
  value       = aws_ecr_repository.client.repository_url
}

output "server_ecr_repository_url" {
  description = "The URL of the ECR repository for the server."
  value       = aws_ecr_repository.server.repository_url
}

output "worker_ecr_repository_url" {
  description = "The URL of the ECR repository for the worker."
  value       = aws_ecr_repository.worker.repository_url
}
