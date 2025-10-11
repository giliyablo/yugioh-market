#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="me-west1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"
GITHUB_REPO="giliyablo/yugioh-market"
GITHUB_BRANCH=${1:-"main"}

echo "🚀 Building and deploying CLIENT ONLY from GitHub..."

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

# Get existing server URL for client environment variable
SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)' 2>/dev/null || echo "")
if [ -z "$SERVER_URL" ]; then
    echo "⚠️  Server not found. Client will be deployed without API URL."
    echo "   Deploy server first or update VITE_API_URL manually."
else
    echo "🔗 Using existing server: $SERVER_URL"
fi

# Create a temporary directory and clone the repo
TEMP_DIR=$(mktemp -d)
echo "📁 Cloning repository to temporary directory..."
git clone --branch $GITHUB_BRANCH --depth 1 https://github.com/$GITHUB_REPO.git $TEMP_DIR

# Build client image
echo "🐳 Building client image from GitHub..."
gcloud builds submit \
    --config=cloudbuild-client.yaml \
    --substitutions=_SERVICE_NAME=$CLIENT_SERVICE,_PROJECT_ID=$PROJECT_ID \
    $TEMP_DIR

# Clean up temporary directory
rm -rf $TEMP_DIR

# Deploy client to Cloud Run
echo "☁️ Deploying client to Cloud Run..."
gcloud run deploy $CLIENT_SERVICE \
  --image gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 80 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 5 \
  --timeout 3600 \
  --set-env-vars VITE_API_URL=$SERVER_URL/api

# Get client URL
CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Client build and deployment complete!"
echo "🌍 Client deployed at: $CLIENT_URL"
echo "📊 Monitor your client:"
echo "   https://console.cloud.google.com/run/detail/$REGION/$CLIENT_SERVICE/metrics?project=$PROJECT_ID"
