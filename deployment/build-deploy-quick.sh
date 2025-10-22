#!/bin/bash

set -e

# --- Configuration ---
PROJECT_ID="fourth-arena-474414-h6"
REGION="us-central1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"
WORKER_SERVICE="tcg-marketplace-worker"
VPC_CONNECTOR="tcg-market-connector" # This must match the name from the setup script

# --- Functions ---

check_run_path() {
    echo "--- 🔎 Verifying execution directory ---"
    if [ ! -d "./server" ] || [ ! -d "./client" ] || [ ! -d "./worker" ]; then
        echo "❌ This script must be run from the root of the project directory (e.g., './deployment/build-deploy-gcp.sh')."
        exit 1
    fi
    echo "  ✅ Script is running from the correct directory."
}

check_prerequisites() {
    echo "--- 🔎 Verifying GCP prerequisites ---"
    if ! gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR --region=$REGION --project=$PROJECT_ID &>/dev/null; then
        echo "❌ VPC Access Connector '$VPC_CONNECTOR' not found in region '$REGION'."
        echo "   Please run the 'setup-secure-gcp.sh' script first to create the necessary infrastructure."
        exit 1
    fi
    echo "  ✅ VPC Connector found."
}

deploy_server() {
  if [ ! -d "./server" ]; then echo "❌ 'server' directory not found. Skipping deployment."; return; fi
  echo "--- 🐳 Building and deploying SERVER to private VPC ---"
  gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest ./server --project=$PROJECT_ID

  echo "☁️ Deploying server service..."
  gcloud run deploy $SERVER_SERVICE \
    --image gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest \
    --platform managed \
    --region $REGION \
    --ingress=internal-and-cloud-load-balancing \
    --vpc-connector=$VPC_CONNECTOR \
    --port 5000 \
    --memory 1Gi \
    --cpu 1 \
    --set-env-vars NODE_ENV=production \
    --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_SERVICE_ACCOUNT_JSON:latest" \
    --project=$PROJECT_ID
}

deploy_worker() {
  if [ ! -d "./worker" ]; then echo "❌ 'worker' directory not found. Skipping deployment."; return; fi
  echo "--- 🐳 Building and deploying WORKER to private VPC ---"
  gcloud builds submit --tag gcr.io/$PROJECT_ID/$WORKER_SERVICE:latest ./worker --project=$PROJECT_ID

  echo "☁️ Deploying worker service..."
  gcloud run deploy $WORKER_SERVICE \
    --image gcr.io/$PROJECT_ID/$WORKER_SERVICE:latest \
    --platform managed \
    --region $REGION \
    --no-ingress \
    --vpc-connector=$VPC_CONNECTOR \
    --port 4000 \
    --memory 4Gi \
    --cpu 2 \
    --set-env-vars NODE_ENV=production \
    --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_SERVICE_ACCOUNT_JSON:latest" \
    --project=$PROJECT_ID
}

deploy_client() {
  if [ ! -d "./client" ]; then echo "❌ 'client' directory not found. Skipping deployment."; return; fi
  echo "--- 🐳 Building and deploying CLIENT to private VPC ---"
  gcloud builds submit --tag gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest ./client --project=$PROJECT_ID

  echo "☁️ Deploying client service..."
  gcloud run deploy $CLIENT_SERVICE \
    --image gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest \
    --platform managed \
    --region $REGION \
    --ingress=internal-and-cloud-load-balancing \
    --vpc-connector=$VPC_CONNECTOR \
    --port 3000 \
    --memory 1Gi \
    --cpu 1 \
    --set-env-vars VITE_API_URL=/api \
    --project=$PROJECT_ID
}

usage() {
    echo "Usage: $0 [all|server|worker|client]"
    echo "  all       (default) Deploys the server, worker, and client."
    echo "  server    Deploys only the server."
    echo "  worker    Deploys only the worker."
    echo "  client    Deploys only the client."
    exit 1
}

# --- Main script execution ---

SERVICE_TO_DEPLOY=${1:-"all"}

echo "🚀 Deploying TCG Marketplace to Google Cloud Platform..."

# Pre-flight checks
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed. Please install it first."
    exit 1
fi

check_run_path

echo "📋 Setting GCP project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

check_prerequisites

case $SERVICE_TO_DEPLOY in
    "all")
        deploy_server
        deploy_worker
        deploy_client
        ;;
    "server")
        deploy_server
        ;;
    "worker")
        deploy_worker
        ;;
    "client")
        deploy_client
        ;;
    *)
        echo "❌ Invalid argument: $SERVICE_TO_DEPLOY"
        usage
        ;;
esac

echo "🎉 Deployment process finished for '$SERVICE_TO_DEPLOY'."

