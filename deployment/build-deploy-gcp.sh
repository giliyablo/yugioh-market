#!/bin/bash

set -e

# --- Configuration ---
PROJECT_ID="fourth-arena-474414-h6"
REGION="us-central1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"
WORKER_SERVICE="tcg-marketplace-worker"

# Optional: Set permanent domains via environment variables
SERVER_DOMAIN=${SERVER_DOMAIN:-""}
CLIENT_DOMAIN=${CLIENT_DOMAIN:-""}

# --- Functions for each service ---

deploy_server() {
  echo "--- 🐳 Building and deploying SERVER ---"
  gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest ./server

  echo "☁️ Deploying server to Cloud Run..."
  gcloud run deploy $SERVER_SERVICE \
    --image gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 5000 \
    --memory 1Gi \
    --cpu 1 \
    --set-env-vars NODE_ENV=production \
    --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_SERVICE_ACCOUNT_JSON:latest"

  local SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)')
  echo "✅ Server deployment complete. URL: $SERVER_URL"
}

deploy_worker() {
  echo "--- 🐳 Building and deploying WORKER ---"
  gcloud builds submit --tag gcr.io/$PROJECT_ID/$WORKER_SERVICE:latest ./worker

  echo "☁️ Deploying worker to Cloud Run..."
  gcloud run deploy $WORKER_SERVICE \
    --image gcr.io/$PROJECT_ID/$WORKER_SERVICE:latest \
    --platform managed \
    --region $REGION \
    --no-allow-unauthenticated \
    --port 4000 \
    --memory 4Gi \
    --cpu 2 \
    --set-env-vars NODE_ENV=production \
    --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_SERVICE_ACCOUNT_JSON:latest"

  echo "✅ Worker deployment complete."
}

deploy_client() {
  echo "--- 🐳 Building and deploying CLIENT ---"
  gcloud builds submit --tag gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest ./client

  echo "🔗 Fetching server URL for client configuration..."
  local SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)')
  if [ -z "$SERVER_URL" ]; then
      echo "❌ Could not retrieve server URL. Please deploy the server first or set SERVER_DOMAIN."
      exit 1
  fi

  local API_URL
  if [ -n "$SERVER_DOMAIN" ]; then
    API_URL="https://$SERVER_DOMAIN/api"
  else
    API_URL="$SERVER_URL/api"
  fi

  echo "☁️ Deploying client to Cloud Run with API URL: $API_URL"
  gcloud run deploy $CLIENT_SERVICE \
    --image gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 3000 \
    --memory 1Gi \
    --cpu 1 \
    --set-env-vars VITE_API_URL=${API_URL}

  local CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --region $REGION --format 'value(status.url)')
  echo "✅ Client deployment complete. URL: ${CLIENT_DOMAIN:-$CLIENT_URL}"
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

echo "📋 Setting GCP project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

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
```

I've refactored your script to be more modular and accept arguments. Here’s how you can use it now:

* **Deploy everything (default):**
    ```bash
    ./deployment/build-deploy-gcp.sh
    # or
    ./deployment/build-deploy-gcp.sh all
    ```
* **Deploy only the server:**
    ```bash
    ./deployment/build-deploy-gcp.sh server
    ```
* **Deploy only the worker:**
    ```bash
    ./deployment/build-deploy-gcp.sh worker
    ```
* **Deploy only the client:**
    ```bash
    ./deployment/build-deploy-gcp.sh client
    
