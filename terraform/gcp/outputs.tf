output "load_balancer_ip" {
  description = "The public static IP address of the External HTTPS Load Balancer. Point your domain's A record to this IP."
  value       = google_compute_global_address.lb_ip.address
}

output "service_account_email" {
  description = "The email of the created service account for Cloud Run services."
  value       = google_service_account.cloud_run_sa.email
}

output "ssl_certificate_status" {
  description = "The provisioning status of the Google-managed SSL certificate. It may take some time to become ACTIVE."
  value       = google_compute_managed_ssl_certificate.ssl_cert.managed.status
}
