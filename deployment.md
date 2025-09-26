# 🚀 CI/CD Pipeline Dashboard - Deployment Guide

This comprehensive guide covers deploying the CI/CD Pipeline Dashboard to AWS using Terraform, Docker, and various deployment strategies.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [AWS Infrastructure Deployment](#aws-infrastructure-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Configuration Management](#configuration-management)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## 🛠️ Prerequisites

### Required Tools

```bash
# Install required tools
brew install terraform          # Terraform >= 1.0
brew install aws-cli           # AWS CLI v2
brew install docker            # Docker >= 20.10
brew install kubectl           # Kubernetes CLI (optional)
brew install helm              # Helm (optional)
```

### AWS Account Setup

1. **AWS Account**: Active AWS account with appropriate permissions
2. **IAM User**: Create IAM user with following policies:
   - `AmazonECS_FullAccess`
   - `AmazonRDS_FullAccess`
   - `AmazonVPC_FullAccess`
   - `AmazonEC2_FullAccess`
   - `AmazonRoute53_FullAccess` (if using custom domain)
   - `AmazonCertificateManager_FullAccess` (if using HTTPS)

3. **AWS CLI Configuration**:
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter output format (json)
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# Application Configuration
ENVIRONMENT=dev
PROJECT_NAME=cicd-pipeline-dashboard

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/cicd_dashboard

# Alert Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=alerts@yourdomain.com

# Security
WRITE_KEY=your-secure-webhook-key
SECRET_KEY=your-secret-key-for-sessions
```

## 🏠 Local Development Setup

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/cicd-pipeline-dashboard.git
cd cicd-pipeline-dashboard

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Database Setup

```bash
# Start PostgreSQL (using Docker)
docker run --name postgres-dev \
  -e POSTGRES_DB=cicd_dashboard \
  -e POSTGRES_USER=cicd_user \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  -d postgres:15-alpine

# Initialize database
python backend/init_db.py
```

### 3. Run Development Server

```bash
# Start backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In another terminal, serve frontend (optional)
cd frontend
python -m http.server 8080
```

### 4. Verify Local Setup

```bash
# Check health endpoint
curl http://localhost:8000/health

# Check API documentation
open http://localhost:8000/docs

# Check frontend
open http://localhost:8080
```

## ☁️ AWS Infrastructure Deployment

### 1. Prepare Terraform Configuration

```bash
# Navigate to infrastructure directory
cd infra

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
vim terraform.tfvars
```

### 2. Configure Terraform Variables

Edit `terraform.tfvars`:

```hcl
# AWS Configuration
aws_region  = "us-east-1"
environment = "production"

# Project Configuration
project_name = "cicd-pipeline-dashboard"

# Network Configuration
vpc_cidr               = "10.0.0.0/16"
public_subnet_cidrs    = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs   = ["10.0.10.0/24", "10.0.20.0/24"]

# Database Configuration
db_instance_class     = "db.t3.small"  # Adjust for production
db_allocated_storage  = 100
db_engine_version     = "15.4"

# ECS Configuration
ecs_task_cpu              = 1024  # 1 vCPU
ecs_task_memory           = 2048  # 2GB RAM
ecs_service_desired_count = 3     # High availability

# Auto Scaling
ecs_autoscaling_min_capacity = 2
ecs_autoscaling_max_capacity = 10

# Secrets (set these securely)
slack_webhook_url = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
smtp_password     = "your-smtp-app-password"
write_key         = "your-secure-webhook-key-32-chars-long"
```

### 3. Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply infrastructure (review plan first!)
terraform apply

# Note the outputs
terraform output
```

### 4. Build and Push Docker Image

```bash
# Build Docker image
docker build -t cicd-pipeline-dashboard:latest .

# Tag for ECR
ECR_URI=$(terraform output -raw ecr_repository_url)
docker tag cicd-pipeline-dashboard:latest $ECR_URI:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URI

# Push image
docker push $ECR_URI:latest
```

### 5. Update ECS Service

```bash
# Force new deployment
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw ecs_service_name) \
  --force-new-deployment
```

## 🐳 Docker Deployment

### 1. Docker Compose (Development)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Docker Compose (Production)

```bash
# Use production compose file
docker-compose -f ops/compose.prod.yml up -d

# Scale services
docker-compose -f ops/compose.prod.yml up -d --scale cicd-dashboard=3
```

### 3. Docker Swarm (Multi-node)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c ops/compose.prod.yml cicd-dashboard

# Check services
docker service ls
docker service logs cicd-dashboard_cicd-dashboard
```

## 🏭 Production Deployment

### 1. Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Database backups enabled
- [ ] SSL certificates ready
- [ ] Monitoring configured
- [ ] Log aggregation setup
- [ ] Security groups reviewed
- [ ] Auto-scaling policies tested
- [ ] Disaster recovery plan documented

### 2. Blue-Green Deployment

```bash
# Create new environment
terraform workspace new green
terraform apply -var="environment=green"

# Test green environment
curl -f http://green-alb-dns-name/health

# Switch traffic (update Route53 or ALB)
# Monitor metrics and logs

# Cleanup old environment
terraform workspace select blue
terraform destroy
```

### 3. Rolling Deployment

```bash
# Update task definition with new image
aws ecs register-task-definition \
  --family cicd-pipeline-dashboard \
  --task-definition-arn $(terraform output -raw ecs_task_definition_arn) \
  --container-definitions '[{
    "name": "cicd-dashboard",
    "image": "your-ecr-uri:new-tag"
  }]'

# Update service
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw ecs_service_name) \
  --task-definition cicd-pipeline-dashboard:LATEST
```

### 4. Canary Deployment

```bash
# Deploy canary version (10% traffic)
aws elbv2 modify-listener \
  --listener-arn $(terraform output -raw alb_listener_arn) \
  --default-actions Type=forward,ForwardConfig='{
    "TargetGroups": [
      {"TargetGroupArn": "prod-tg-arn", "Weight": 90},
      {"TargetGroupArn": "canary-tg-arn", "Weight": 10}
    ]
  }'

# Monitor metrics, gradually increase canary traffic
# If successful, switch 100% to canary
# If issues, rollback to production
```

## ⚙️ Configuration Management

### 1. Environment-Specific Configurations

```bash
# Development
export ENVIRONMENT=development
export DEBUG=true
export LOG_LEVEL=debug

# Staging
export ENVIRONMENT=staging
export DEBUG=false
export LOG_LEVEL=info

# Production
export ENVIRONMENT=production
export DEBUG=false
export LOG_LEVEL=warning
```

### 2. Secrets Management

```bash
# Store secrets in AWS Systems Manager
aws ssm put-parameter \
  --name "/cicd-dashboard/slack-webhook-url" \
  --value "https://hooks.slack.com/services/..." \
  --type "SecureString"

aws ssm put-parameter \
  --name "/cicd-dashboard/smtp-password" \
  --value "your-smtp-password" \
  --type "SecureString"

# Retrieve secrets in application
aws ssm get-parameter \
  --name "/cicd-dashboard/slack-webhook-url" \
  --with-decryption
```

### 3. Feature Flags

```python
# In your application
import os

FEATURES = {
    'slack_notifications': os.getenv('FEATURE_SLACK_NOTIFICATIONS', 'true').lower() == 'true',
    'email_notifications': os.getenv('FEATURE_EMAIL_NOTIFICATIONS', 'true').lower() == 'true',
    'auto_scaling': os.getenv('FEATURE_AUTO_SCALING', 'false').lower() == 'true',
}
```

## 📊 Monitoring and Logging

### 1. CloudWatch Setup

```bash
# Create custom metrics
aws logs create-log-group --log-group-name /ecs/cicd-dashboard

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "cicd-dashboard-high-cpu" \
  --alarm-description "High CPU utilization" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### 2. Application Metrics

```python
# Add to your FastAPI application
from prometheus_client import Counter, Histogram, generate_latest

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path).inc()
    REQUEST_DURATION.observe(duration)
    
    return response

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### 3. Log Aggregation

```bash
# Configure log shipping to external service
# Example: Elasticsearch, Splunk, or Datadog

# Fluentd configuration
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd-containers.log.pos
  tag kubernetes.*
  format json
</source>

<match kubernetes.**>
  @type elasticsearch
  host elasticsearch.logging.svc.cluster.local
  port 9200
  index_name kubernetes
</match>
```

## 🔧 Troubleshooting

### 1. Common Issues

#### Application Won't Start

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --services $(terraform output -raw ecs_service_name)

# Check task logs
aws logs tail /ecs/cicd-dashboard --follow

# Check task definition
aws ecs describe-task-definition \
  --task-definition $(terraform output -raw ecs_task_definition_arn)
```

#### Database Connection Issues

```bash
# Test database connectivity
aws rds describe-db-instances \
  --db-instance-identifier $(terraform output -raw database_name)

# Check security groups
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw rds_security_group_id)

# Test from ECS task
aws ecs execute-command \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --task TASK_ID \
  --container cicd-dashboard \
  --interactive \
  --command "/bin/bash"
```

#### Load Balancer Issues

```bash
# Check ALB health
aws elbv2 describe-load-balancers \
  --load-balancer-arns $(terraform output -raw load_balancer_arn)

# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw backend_target_group_arn)

# Check listener rules
aws elbv2 describe-listeners \
  --load-balancer-arn $(terraform output -raw load_balancer_arn)
```

### 2. Performance Issues

```bash
# Check CPU and memory usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=$(terraform output -raw ecs_service_name) \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average

# Scale service manually
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw ecs_service_name) \
  --desired-count 5
```

### 3. Security Issues

```bash
# Check security group rules
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw ecs_security_group_id)

# Audit IAM permissions
aws iam get-role-policy \
  --role-name $(terraform output -raw ecs_task_role_name) \
  --policy-name TaskRolePolicy

# Check SSL certificate
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw certificate_arn)
```

## 🔄 Maintenance

### 1. Regular Updates

```bash
# Update dependencies
pip install --upgrade -r requirements.txt

# Update Docker base image
docker pull python:3.11-slim
docker build -t cicd-dashboard:latest .

# Update Terraform providers
terraform init -upgrade
```

### 2. Database Maintenance

```bash
# Create manual backup
aws rds create-db-snapshot \
  --db-instance-identifier $(terraform output -raw database_name) \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d)

# Update database engine
aws rds modify-db-instance \
  --db-instance-identifier $(terraform output -raw database_name) \
  --engine-version 15.5 \
  --apply-immediately
```

### 3. Cleanup

```bash
# Remove old Docker images
docker system prune -a

# Remove old CloudWatch logs
aws logs delete-log-group --log-group-name /ecs/old-service

# Remove unused ECR images
aws ecr list-images \
  --repository-name cicd-pipeline-dashboard \
  --filter tagStatus=UNTAGGED \
  --query 'imageIds[?imageDigest!=null]' \
  --output json | \
  aws ecr batch-delete-image \
    --repository-name cicd-pipeline-dashboard \
    --image-ids file:///dev/stdin
```

### 4. Disaster Recovery

```bash
# Backup Terraform state
aws s3 cp terraform.tfstate s3://your-backup-bucket/terraform-state/

# Export database
pg_dump $(terraform output -raw database_connection_string) > backup.sql

# Restore from backup
psql $(terraform output -raw database_connection_string) < backup.sql

# Restore infrastructure
terraform init
terraform plan
terraform apply
```

## 📚 Additional Resources

- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

## 🆘 Support

For issues and questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review application logs: `docker-compose logs -f`
3. Check AWS CloudWatch logs
4. Create an issue in the GitHub repository
5. Contact the DevOps team

---

**Note**: Always test deployments in a staging environment before applying to production. Keep backups of your data and infrastructure state files.
