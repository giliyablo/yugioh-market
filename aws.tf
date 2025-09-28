# 1. ECR (Container Registry)
resource "aws_ecr_repository" "app_repo" {
  name = "yugioh-market"
}

# 2. RDS (PostgreSQL Database)
resource "aws_db_instance" "postgres" {
  engine               = "postgres"
  instance_class       = "db.t3.micro" # Small, burstable instance
  # ... other configs like storage, username, password, VPC settings
}

# 3. ECS Cluster (A logical grouping for services)
resource "aws_ecs_cluster" "main" {
  name = "yugioh-cluster"
}

# 4. Fargate Service (Backend)
resource "aws_ecs_service" "backend" {
  name            = "backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  launch_type     = "FARGATE"
  desired_count   = 1 # For autoscaling, you'd set this to 0 and configure policies

  # ... network configuration (VPC, subnets, security groups)
}

# 5. Fargate Service (Frontend) + Application Load Balancer
# ... This would be similar to the backend service but would also require
# ... aws_lb, aws_lb_target_group, and aws_lb_listener resources to expose it.