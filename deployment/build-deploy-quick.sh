#!/bin/bash

# Quick deployment script for Google Cloud
set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="us-central1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"
WORKER_SERVICE="tcg-marketplace-worker" # <-- NEW
REPO_URL="https://github.com/giliyablo/yugioh-market"
GITHUB_REPO="giliyablo/yugioh-market"
BRANCH="main"
# Optional permanent domains. Export before running or set inline:
SERVER_DOMAIN=${SERVER_DOMAIN:-"api.tcgsmarketplace.com"}
CLIENT_DOMAIN=${CLIENT_DOMAIN:-"www.tcgsmarketplace.com"}

echo "🚀 Quick deployment to Google Cloud Run"

# --- SERVER ---
echo "🔨 Building server..."
docker build -t gcr.io/$PROJECT_ID/tcg-server:latest ./server
docker push gcr.io/$PROJECT_ID/tcg-server:latest

echo "🚀 Deploying server to Cloud Run..."
gcloud run deploy tcg-server \
  --image gcr.io/$PROJECT_ID/tcg-server:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 5000 \
  --memory 1Gi \
  --cpu 1 \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_SERVICE_ACCOUNT_JSON:latest"

SERVER_URL=$(gcloud run services describe tcg-server --region $REGION --format 'value(status.url)')
echo "✅ Server deployed at: $SERVER_URL"

# --- WORKER ---
echo "🔨 Building worker..."
docker build -t gcr.io/$PROJECT_ID/tcg-worker:latest ./worker
docker push gcr.io/$PROJECT_ID/tcg-worker:latest

echo "🚀 Deploying worker to Cloud Run..."
gcloud run deploy tcg-worker \
  --image gcr.io/$PROJECT_ID/tcg-worker:latest \
  --region $REGION \
  --platform managed \
  --no-allow-unauthenticated \
  --port 4000 \
  --memory 2Gi \
  --cpu 2 \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_SERVICE_ACCOUNT_JSON:latest"

echo "✅ Worker deployed successfully."

# --- CLIENT ---
echo "🔨 Building client..."
docker build -t gcr.io/$PROJECT_ID/tcg-client:latest ./client
docker push gcr.io/$PROJECT_ID/tcg-client:latest

echo "🚀 Deploying client to Cloud Run..."
gcloud run deploy tcg-client \
  --image gcr.io/$PROJECT_ID/tcg-client:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars VITE_API_URL=${SERVER_DOMAIN:+https://$SERVER_DOMAIN/api}${SERVER_DOMAIN:-$SERVER_URL/api}

CLIENT_URL=$(gcloud run services describe tcg-client --region $REGION --format 'value(status.url)')
echo "✅ Client deployed at: $CLIENT_URL"

echo "🎉 Deployment complete!"
echo "🌍 Your app: ${CLIENT_DOMAIN:-$CLIENT_URL}"
echo "🔧 API: ${SERVER_DOMAIN:-$SERVER_URL}"
