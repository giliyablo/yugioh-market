Google Cloud Platform Setup Guide
This guide details how to set up your GCP project to host the TCG Marketplace application on Cloud Run. The architecture consists of three separate Cloud Run services.

🚀 Quick Start with Scripts
The fastest way to deploy is using the provided scripts. Ensure you have the Google Cloud SDK installed and authenticated.

# Authenticate with GCP
gcloud auth login
gcloud config set project fourth-arena-474414-h6

# Run the deployment script (builds on GCP)
./deployment/build-deploy-gcp.sh all

🔧 Manual GCP Deployment
If you prefer to deploy manually, follow these steps.

1. Enable APIs
Enable the necessary APIs for your project.

gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable iam.googleapis.com

2. Build and Push Images
For each service (server, worker, client), build the image using Cloud Build and push it to Google Container Registry.

# Build the server image
gcloud builds submit --tag gcr.io/fourth-arena-474414-h6/tcg-marketplace-server:latest ./server

# Build the worker image
gcloud builds submit --tag gcr.io/fourth-arena-474414-h6/tcg-marketplace-worker:latest ./worker

# Build the client image
gcloud builds submit --tag gcr.io/fourth-arena-474414-h6/tcg-marketplace-client:latest ./client

3. Deploy to Cloud Run
Deploy each image as a separate Cloud Run service.

Deploy Server:

gcloud run deploy tcg-marketplace-server \
  --image gcr.io/fourth-arena-474414-h6/tcg-marketplace-server:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 5000 \
  --memory 1Gi \
  --cpu 1 \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_SERVICE_ACCOUNT_JSON:latest"

Deploy Worker: (Note: no public access)

gcloud run deploy tcg-marketplace-worker \
  --image gcr.io/fourth-arena-474414-h6/tcg-marketplace-worker:latest \
  --region us-central1 \
  --platform managed \
  --no-allow-unauthenticated \
  --port 4000 \
  --memory 2Gi \
  --cpu 2 \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_SERVICE_ACCOUNT_JSON:latest"

Deploy Client:
First, get the server URL:

SERVER_URL=$(gcloud run services describe tcg-marketplace-server --region us-central1 --format 'value(status.url)')

Then, deploy the client with the server URL as an environment variable:

gcloud run deploy tcg-marketplace-client \
  --image gcr.io/fourth-arena-474414-h6/tcg-marketplace-client:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars "VITE_API_URL=$SERVER_URL/api"

🏗️ Infrastructure as Code (Terraform)
The terraform/ directory is configured to manage all three Cloud Run services and their associated IAM permissions.

Initialize Terraform:

cd terraform
terraform init

Apply Configuration:

terraform apply

This will create the service account, enable APIs, and define all three Cloud Run services according to the specifications in main.tf.

🔄 CI/CD with GitHub Actions
To enable automated deployments from GitHub, you need a GCP service account with appropriate permissions.

Create Service Account Key: Follow the instructions in DEPLOYMENT.md to create a service account and export its key.

Add GitHub Secret: Add the content of the key file as a secret named GCP_SA_KEY in your GitHub repository settings.

Permissions: Ensure the service account has the following roles:

Cloud Run Admin: To deploy and manage services.

Cloud Build Editor: To submit builds.

Service Account User: To act as the service account during deployments.

📊 Monitoring
Cloud Run Console: Visit the Cloud Run dashboard to view metrics and logs for each individual service (tcg-marketplace-server, tcg-marketplace-worker, tcg-marketplace-client).

CLI Logs:

# View logs for a specific service
gcloud run services logs read tcg-marketplace-worker --region us-central1 --limit 100
