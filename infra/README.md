# 🏗️ Terraform Infrastructure for CI/CD Pipeline Dashboard

This directory contains Terraform configurations to deploy the CI/CD Pipeline Dashboard to AWS using modern cloud-native services.

## 🏛️ Architecture Overview

The infrastructure deploys:

- **VPC**: Custom VPC with public/private subnets across multiple AZs
- **ECS Fargate**: Containerized application hosting
- **RDS PostgreSQL**: Managed database service
- **Application Load Balancer**: Traffic distribution and SSL termination
- **Auto Scaling**: Automatic scaling based on CPU/memory metrics
- **CloudWatch**: Logging and monitoring
- **SSM Parameter Store**: Secure secrets management
- **ECR**: Container image registry

## 📁 File Structure

```
infra/
├── main.tf                    # Main infrastructure configuration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── terraform.tfvars.example   # Example variables file
├── README.md                  # This file
└── modules/                   # Reusable modules (optional)
```

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install required tools
brew install terraform aws-cli

# Configure AWS CLI
aws configure

# Verify access
aws sts get-caller-identity
```

### 2. Setup Configuration

```bash
# Clone repository and navigate to infra directory
cd infra

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit variables file
vim terraform.tfvars
```

### 3. Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Deploy infrastructure
terraform apply

# Save important outputs
terraform output > deployment-info.txt
```

## ⚙️ Configuration

### Required Variables

Edit `terraform.tfvars` with your specific values:

```hcl
# Basic Configuration
aws_region   = "us-east-1"
environment  = "production"
project_name = "cicd-pipeline-dashboard"

# Network Configuration
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]

# Database Configuration
db_instance_class    = "db.t3.small"
db_allocated_storage = 100

# ECS Configuration
ecs_task_cpu              = 1024
ecs_task_memory           = 2048
ecs_service_desired_count = 2

# Secrets (IMPORTANT: Set these!)
slack_webhook_url = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
smtp_password     = "your-smtp-password"
write_key         = "your-secure-webhook-key"
```

### Optional Variables

```hcl
# Custom Domain (Optional)
domain_name     = "dashboard.yourdomain.com"
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."

# Auto Scaling
ecs_autoscaling_min_capacity = 1
ecs_autoscaling_max_capacity = 10

# Monitoring
enable_container_insights = true
log_retention_days       = 30
```

## 🔐 Security Configuration

### 1. Secrets Management

The infrastructure uses AWS Systems Manager Parameter Store for secure secrets:

```bash
# Secrets are automatically created as SecureString parameters:
# - /cicd-pipeline-dashboard/slack-webhook-url
# - /cicd-pipeline-dashboard/smtp-password  
# - /cicd-pipeline-dashboard/write-key

# Update secrets after deployment:
aws ssm put-parameter \
  --name "/cicd-pipeline-dashboard/slack-webhook-url" \
  --value "https://hooks.slack.com/services/..." \
  --type "SecureString" \
  --overwrite
```

### 2. Network Security

- **VPC**: Isolated network environment
- **Security Groups**: Restrictive ingress/egress rules
- **Private Subnets**: Application and database in private subnets
- **NAT Gateway**: Outbound internet access for private resources

### 3. IAM Roles

- **ECS Task Execution Role**: Minimal permissions for container startup
- **ECS Task Role**: Application-specific permissions
- **Auto Scaling Role**: Permissions for scaling operations

## 📊 Monitoring and Logging

### CloudWatch Integration

```bash
# View application logs
aws logs tail /ecs/cicd-pipeline-dashboard --follow

# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=cicd-pipeline-dashboard-service \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average
```

### Health Checks

- **ALB Health Check**: `/health` endpoint
- **ECS Health Check**: Container-level health monitoring
- **RDS Monitoring**: Database performance metrics

## 🔄 Deployment Workflow

### 1. Initial Deployment

```bash
# 1. Deploy infrastructure
terraform apply

# 2. Build and push Docker image
ECR_URI=$(terraform output -raw ecr_repository_url)
docker build -t cicd-dashboard .
docker tag cicd-dashboard:latest $ECR_URI:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URI

# Push image
docker push $ECR_URI:latest

# 3. Update ECS service
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw ecs_service_name) \
  --force-new-deployment
```

### 2. Updates and Rollbacks

```bash
# Update application
docker build -t cicd-dashboard:v2.0 .
docker tag cicd-dashboard:v2.0 $ECR_URI:v2.0
docker push $ECR_URI:v2.0

# Update task definition (modify main.tf)
terraform apply

# Rollback if needed
terraform apply -var="app_image_tag=v1.0"
```

## 🌍 Multi-Environment Setup

### Environment-Specific Configurations

```bash
# Development
terraform workspace new development
terraform apply -var-file="environments/dev.tfvars"

# Staging  
terraform workspace new staging
terraform apply -var-file="environments/staging.tfvars"

# Production
terraform workspace new production
terraform apply -var-file="environments/prod.tfvars"
```

### Environment Variable Files

Create `environments/` directory with:

```hcl
# environments/dev.tfvars
environment = "development"
db_instance_class = "db.t3.micro"
ecs_service_desired_count = 1
ecs_autoscaling_max_capacity = 3

# environments/prod.tfvars
environment = "production"
db_instance_class = "db.t3.large"
ecs_service_desired_count = 3
ecs_autoscaling_max_capacity = 20
```

## 📈 Scaling Configuration

### Auto Scaling Policies

The infrastructure includes:

- **CPU-based scaling**: Scale when CPU > 70%
- **Memory-based scaling**: Scale when Memory > 80%
- **Target tracking**: Maintains desired performance metrics

### Manual Scaling

```bash
# Scale ECS service
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw ecs_service_name) \
  --desired-count 5

# Scale database (requires downtime)
aws rds modify-db-instance \
  --db-instance-identifier $(terraform output -raw database_name) \
  --db-instance-class db.t3.large \
  --apply-immediately
```

## 🔧 Troubleshooting

### Common Issues

#### 1. ECS Service Won't Start

```bash
# Check service events
aws ecs describe-services \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --services $(terraform output -raw ecs_service_name) \
  --query 'services[0].events'

# Check task definition
aws ecs describe-task-definition \
  --task-definition $(terraform output -raw ecs_task_definition_arn)
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
aws rds describe-db-instances \
  --db-instance-identifier $(terraform output -raw database_name)

# Check security groups
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw rds_security_group_id)
```

#### 3. Load Balancer Issues

```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw backend_target_group_arn)

# Check ALB configuration
aws elbv2 describe-load-balancers \
  --load-balancer-arns $(terraform output -raw load_balancer_arn)
```

### Debug Commands

```bash
# Get all outputs
terraform output

# Show current state
terraform show

# Validate configuration
terraform validate

# Format code
terraform fmt -recursive

# Check for security issues
terraform plan -out=plan.out
terraform show -json plan.out | jq '.planned_values'
```

## 🧹 Cleanup

### Destroy Infrastructure

```bash
# Destroy all resources (BE CAREFUL!)
terraform destroy

# Destroy specific resources
terraform destroy -target=aws_ecs_service.main

# Remove workspace
terraform workspace delete development
```

### Backup Before Cleanup

```bash
# Backup database
pg_dump $(terraform output -raw database_connection_string) > backup.sql

# Backup Terraform state
cp terraform.tfstate terraform.tfstate.backup

# Export configuration
terraform show > infrastructure-backup.txt
```

## 📚 Additional Resources

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/)

## 🆘 Support

For infrastructure issues:

1. Check the troubleshooting section above
2. Review Terraform plan output
3. Check AWS CloudWatch logs
4. Verify IAM permissions
5. Contact DevOps team

---

**Important**: Always review `terraform plan` output before applying changes to production environments.
