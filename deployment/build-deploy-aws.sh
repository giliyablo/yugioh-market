#!/bin/bash

set -e

# ==============================================================================
# AWS DEPLOYMENT SCRIPT
# ==============================================================================
# This script builds and deploys the client, server, and worker services to
# AWS Elastic Container Service (ECS) using the Fargate launch type.
#
# ------------------------------------------------------------------------------
# !! IMPORTANT PREREQUISITES !!
# This script ASSUMES you have already provisioned the following AWS infrastructure,
# ideally using a tool like Terraform or CloudFormation.
#
# 1.  VPC & Networking:
#     - An Amazon VPC with public and private subnets across multiple Availability Zones.
#     - An Internet Gateway (for the public subnet).
#     - A NAT Gateway (in the public subnet) to allow services in the private
#       subnet (like the worker) to access the internet.
#     - Route Tables to correctly route traffic.
#
# 2.  Load Balancing & Security:
#     - An Application Load Balancer (ALB) with a public IP.
#     - An AWS WAF Web ACL associated with the ALB.
#     - Target Groups for the 'client' and 'server' services.
#     - An HTTPS listener on the ALB with an ACM SSL certificate.
#     - Path-based routing rules on the listener:
#       - '/*' forwards to the client target group.
#       - '/api/*' forwards to the server target group.
#
# 3.  ECS (Elastic Container Service):
#     - An ECS Cluster (e.g., 'tcg-market-cluster').
#     - ECS Task Definitions for each service (client, server, worker).
#     - ECS Services that run these tasks on Fargate within your private subnets.
#
# 4.  ECR (Elastic Container Registry):
#     - ECR repositories for the client, server, and worker images.
#
# 5.  IAM (Identity and Access Management):
#     - An ECS Task Execution Role with permissions to pull from ECR.
#     - An ECS Task Role (optional) if your services need to talk to other AWS APIs.
# ------------------------------------------------------------------------------

# --- Configuration ---
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

CLIENT_REPO_NAME="tcg-marketplace-client"
SERVER_REPO_NAME="tcg-marketplace-server"
WORKER_REPO_NAME="tcg-marketplace-worker"

ECS_CLUSTER_NAME="tcg-market-cluster"
CLIENT_SERVICE_NAME="tcg-client-service"
SERVER_SERVICE_NAME="tcg-server-service"
WORKER_SERVICE_NAME="tcg-worker-service"

# --- Functions ---

# Function to build, tag, and push a Docker image to ECR
build_and_push() {
    local service_dir=$1
    local repo_name=$2
    local image_tag=${3:-"latest"}
    local repo_uri="${ECR_REGISTRY}/${repo_name}"

    echo "--- 🐳 Building and pushing image for $service_dir ---"

    # Authenticate Docker to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

    # Build the image
    docker build -t "$repo_name:$image_tag" "./$service_dir"

    # Tag the image
    docker tag "$repo_name:$image_tag" "$repo_uri:$image_tag"

    # Push the image to ECR
    docker push "$repo_uri:$image_tag"

    echo "  ✅ Image pushed to $repo_uri:$image_tag"
}

# Function to deploy a service by updating its ECS service to force a new deployment
# This is the simplest way to roll out an update. ECS pulls the 'latest' tagged image.
deploy_service() {
    local service_name=$1
    echo "--- 🚀 Deploying $service_name to ECS Fargate ---"

    # Force a new deployment of the service. This tells ECS to pull the latest
    # image and replace the running tasks.
    aws ecs update-service --cluster $ECS_CLUSTER_NAME --service $service_name --force-new-deployment --region $AWS_REGION > /dev/null

    echo "  - Deployment for $service_name initiated. Waiting for it to become stable..."
    aws ecs wait services-stable --cluster $ECS_CLUSTER_NAME --services $service_name --region $AWS_REGION
    echo "  ✅ Service $service_name is stable."
}

# --- Main Execution ---
echo "🚀 Starting deployment to AWS..."

# You can add logic here to select which service to deploy, similar to the GCP script.
# For simplicity, this script deploys all services.

build_and_push "client" $CLIENT_REPO_NAME
build_and_push "server" $SERVER_REPO_NAME
build_and_push "worker" $WORKER_REPO_NAME

deploy_service $CLIENT_SERVICE_NAME
deploy_service $SERVER_SERVICE_NAME
deploy_service $WORKER_SERVICE_NAME

echo "🎉 AWS deployment process finished successfully."
ALB_DNS_NAME=$(aws elbv2 describe-load-balancers --query "LoadBalancers[?contains(LoadBalancerName, 'tcg-market-lb')].DNSName" --output text --region $AWS_REGION)
if [ -n "$ALB_DNS_NAME" ]; then
    echo "👉 Your application should be available at: https://${ALB_DNS_NAME}"
    echo "   (Remember to point your domain's CNAME record to this DNS name)."
fi
