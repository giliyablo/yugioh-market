#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="us-central1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"
WORKER_SERVICE="tcg-marketplace-worker"
REPO_URL="https://github.com/giliyablo/yugioh-market"
GITHUB_REPO="giliyablo/yugioh-market"
BRANCH="main"
# Optional permanent domains. Export before running or set inline:
SERVER_DOMAIN=${SERVER_DOMAIN:-"api.tcgsmarketplace.com"}
CLIENT_DOMAIN=${CLIENT_DOMAIN:-"www.tcgsmarketplace.com"}

echo "🚀 Deploying TCG Marketplace to Google Cloud Platform..."
echo "📦 Repository: $REPO_URL"
echo "🌿 Branch: $BRANCH"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable secretmanager.googleapis.com

# --- DEPLOY SERVER ---
echo "🐳 Building and pushing server image..."
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

SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)')
echo "🔗 Server deployed at: $SERVER_URL"

# --- DEPLOY WORKER ---
echo "🐳 Building and pushing worker image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$WORKER_SERVICE:latest ./worker

echo "☁️ Deploying worker to Cloud Run..."
gcloud run deploy $WORKER_SERVICE \
  --image gcr.io/$PROJECT_ID/$WORKER_SERVICE:latest \
  --platform managed \
  --region $REGION \
  --no-allow-unauthenticated \
  --port 5000 \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars NODE_ENV=production \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_SERVICE_ACCOUNT_JSON:latest"

echo "🔗 Worker deployed successfully."

# --- DEPLOY CLIENT ---
echo "🐳 Building and pushing client image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest ./client

echo "☁️ Deploying client to Cloud Run..."
gcloud run deploy $CLIENT_SERVICE \
  --image gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars VITE_API_URL=${SERVER_DOMAIN:+https://$SERVER_DOMAIN/api}${SERVER_DOMAIN:-$SERVER_URL/api}

CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --region $REGION --format 'value(status.url)')
echo "✅ Client deployed at: $CLIENT_URL"

echo "✅ Deployment complete!"
echo "🌍 Your application is live at: ${CLIENT_DOMAIN:-$CLIENT_URL}"
echo "🔗 API server: ${SERVER_DOMAIN:-$SERVER_URL}"
