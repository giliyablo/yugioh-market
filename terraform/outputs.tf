output "server_service_url" {
  description = "URL of the deployed server Cloud Run service"
  value       = google_cloud_run_v2_service.server.uri
}

output "worker_service_name" {
  description = "Name of the deployed worker Cloud Run service (not publicly accessible)"
  value       = google_cloud_run_v2_service.worker.name
}

output "client_service_url" {
  description = "URL of the deployed client Cloud Run service"
  value       = google_cloud_run_v2_service.client.uri
}
