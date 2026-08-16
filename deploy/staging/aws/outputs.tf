output "instance_id" {
  description = "Staging EC2 instance identifier."
  value       = aws_instance.staging_host.id
}

output "public_ipv4" {
  description = "Elastic IPv4 address to publish in the staging DNS record."
  value       = aws_eip.staging_host.public_ip
}

output "staging_url" {
  description = "Expected public staging origin after DNS and TLS are ready."
  value       = "https://${var.domain_name}"
}

output "ssm_start_session_command" {
  description = "Operator command; no inbound SSH rule or key pair is created."
  value       = "aws ssm start-session --target ${aws_instance.staging_host.id} --region ${var.aws_region}"
}
