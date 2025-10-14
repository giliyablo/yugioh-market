Deployment Guide
This guide covers all deployment options for the Yu-Gi-Oh! Marketplace application, which consists of three core services: the server (API), worker (background jobs), and client (frontend).

🐳 Docker for Local Development
The most straightforward way to run the entire stack locally is by using the provided shell script, which acts as a wrapper around Docker Compose.

Using the Script
Prerequisites: Docker and Docker Compose must be installed and running.

Run Services:

# Start all services in the background
./deployment/build-deploy-local.sh all

# Start only a specific service
./deployment/build-deploy-local.sh server

# Stop and remove all containers
./deployment/build-deploy-local.sh down

🚀 Google Cloud Platform (Cloud Run)
The primary deployment target is GCP, using Cloud Build to create container images and Cloud Run to host the services.

Using the Scripts
Flexible deployment scripts allow you to deploy all services or target a specific one.

GCP Build & Deploy (gcloud builds submit)
This method uses Cloud Build to build the Docker image within GCP, which is recommended for CI/CD.

# Deploy all three services
./deployment/build-deploy-gcp.sh all

# Deploy only the worker
./deployment/build-deploy-gcp.sh worker

Quick Local Build & Deploy (docker build)
This method builds the Docker image on your local machine and pushes it to Google Container Registry. It's faster for quick updates during development.

# Deploy only the client
./deployment/build-deploy-quick.sh client

☸️ Kubernetes
For users who prefer Kubernetes, manifests are provided for deploying to any cluster (e.g., GKE, minikube).

Using the Script
The deploy-k8s.sh script automates the process of building local images and applying the Kubernetes manifests.

Prerequisites: kubectl must be configured to point to a running cluster. A local Docker daemon is required for image building.

Run Commands:

# Build images and deploy all services, including ingress
./deployment/deploy-k8s.sh all

# Deploy only the server
./deployment/deploy-k8s.sh server

# Delete all resources and the namespace
./deployment/deploy-k8s.sh delete

🔄 CI/CD Pipeline (GitHub Actions)
The .github/workflows/deploy.yml workflow automates testing and deployment.

Automatic Trigger: On a push to main or develop, the workflow runs tests and then deploys all services to Cloud Run.

Manual Trigger: You can manually trigger the workflow from the "Actions" tab in GitHub. This allows you to choose which specific service (all, server, worker, or client) to deploy.

🔧 Environment Configuration
Local: Create a .env file in the project root and populate it with your Firebase service account JSON.

GCP: The FIREBASE_SERVICE_ACCOUNT_JSON is managed as a secret in Google Secret Manager and securely mounted into the Cloud Run services. The VITE_API_URL for the client is set automatically during deployment by fetching the server's public URL.

Kubernetes: A configmap.yaml file is used to manage environment variables.

📊 Health Checks & Monitoring
Server: GET /api/health

Worker: GET /health

Client: The client is a static build served by a simple server; health is determined by its ability to start.

Logs: For GCP deployments, logs for all services can be viewed in the Cloud Run section of the Google Cloud Console.
