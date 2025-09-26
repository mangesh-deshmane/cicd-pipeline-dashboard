# Outputs for CI/CD Pipeline Dashboard Infrastructure

# Network Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

# Load Balancer Outputs
output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "load_balancer_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

# Application URLs
output "application_url" {
  description = "URL to access the CI/CD Pipeline Dashboard"
  value       = "http://${aws_lb.main.dns_name}"
}

output "api_url" {
  description = "URL to access the API"
  value       = "http://${aws_lb.main.dns_name}/api"
}

output "health_check_url" {
  description = "URL for health check endpoint"
  value       = "http://${aws_lb.main.dns_name}/health"
}

output "api_docs_url" {
  description = "URL for API documentation"
  value       = "http://${aws_lb.main.dns_name}/docs"
}

# Database Outputs
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "database_username" {
  description = "Database username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.main.name
}

output "ecs_task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = aws_ecs_task_definition.app.arn
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ID of the ECS tasks security group"
  value       = aws_security_group.ecs_tasks.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

# ECR Repository Output
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = var.create_ecr_repository ? aws_ecr_repository.app[0].repository_url : var.ecr_repository_url
}

# CloudWatch Outputs
output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.app.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.app.arn
}

# IAM Role Outputs
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}

# SSM Parameter Outputs
output "ssm_parameter_names" {
  description = "Names of SSM parameters created"
  value = {
    slack_webhook_url = aws_ssm_parameter.slack_webhook_url.name
    smtp_password     = aws_ssm_parameter.smtp_password.name
    write_key         = aws_ssm_parameter.write_key.name
  }
}

# Connection Information
output "database_connection_string" {
  description = "Database connection string (without password)"
  value       = "postgresql://${aws_db_instance.main.username}:PASSWORD@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = true
}

# Webhook Configuration
output "webhook_url" {
  description = "Webhook URL for GitHub Actions"
  value       = "http://${aws_lb.main.dns_name}/api/webhook/github-actions"
}

# Deployment Information
output "deployment_info" {
  description = "Key deployment information"
  value = {
    environment           = var.environment
    region               = var.aws_region
    application_url      = "http://${aws_lb.main.dns_name}"
    ecs_cluster          = aws_ecs_cluster.main.name
    database_endpoint    = aws_db_instance.main.endpoint
    log_group           = aws_cloudwatch_log_group.app.name
  }
}

# Auto Scaling Information
output "autoscaling_target_resource_id" {
  description = "Resource ID for auto scaling target"
  value       = aws_appautoscaling_target.ecs_target.resource_id
}

output "autoscaling_policies" {
  description = "Auto scaling policy ARNs"
  value = {
    cpu_policy    = aws_appautoscaling_policy.ecs_policy_cpu.arn
    memory_policy = aws_appautoscaling_policy.ecs_policy_memory.arn
  }
}
