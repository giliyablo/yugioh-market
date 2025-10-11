#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="us-central1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"

echo "🚀 Deploying TCG Marketplace to Google Cloud Platform..."

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

# Build and push server image
echo "🐳 Building and pushing server image..."
cd server
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest .
cd ..

# Build and push client image
echo "🐳 Building and pushing client image..."
cd client
gcloud builds submit --tag gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest .
cd ..

# Deploy server to Cloud Run
echo "☁️ Deploying server to Cloud Run..."
gcloud run deploy $SERVER_SERVICE \
  --image gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 5000 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,PORT=5000

# Get server URL
SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)')
echo "🔗 Server deployed at: $SERVER_URL"

# Deploy client to Cloud Run
echo "☁️ Deploying client to Cloud Run..."
gcloud run deploy $CLIENT_SERVICE \
  --image gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 5 \
  --set-env-vars VITE_API_URL=$SERVER_URL/api

# Get client URL
CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Deployment complete!"
echo "🌍 Your application is live at: $CLIENT_URL"
echo "🔗 API server: $SERVER_URL"
echo "📊 Monitor your services:"
echo "   Server: https://console.cloud.google.com/run/detail/$REGION/$SERVER_SERVICE/metrics?project=$PROJECT_ID"
echo "   Client: https://console.cloud.google.com/run/detail/$REGION/$CLIENT_SERVICE/metrics?project=$PROJECT_ID"
