#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="me-west1"
SERVER_SERVICE="tcg-marketplace-server"
GITHUB_REPO="giliyablo/tcg-market"
GITHUB_BRANCH=${1:-"main"}
# Optional permanent domain. Export before running or set inline:
# SERVER_DOMAIN=api.example.com ./deployment/build-server-only.sh
SERVER_DOMAIN=${SERVER_DOMAIN:-""}

echo "🚀 Building and deploying SERVER ONLY from GitHub..."

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

# Create a temporary directory and clone the repo
TEMP_DIR=$(mktemp -d)
echo "📁 Cloning repository to temporary directory..."
git clone --branch $GITHUB_BRANCH --depth 1 https://github.com/$GITHUB_REPO.git $TEMP_DIR

# Build server image
echo "🐳 Building server image from GitHub..."
gcloud builds submit \
    --config=cloudbuild-server.yaml \
    --substitutions=_SERVICE_NAME=$SERVER_SERVICE,_PROJECT_ID=$PROJECT_ID \
    $TEMP_DIR

# Clean up temporary directory
rm -rf $TEMP_DIR

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
  --timeout 3600 \
  --set-env-vars NODE_ENV=production

# Map custom domain for server if provided
if [ -n "$SERVER_DOMAIN" ]; then
  echo "🔗 Creating domain mapping for server: $SERVER_DOMAIN"
  gcloud run domain-mappings create \
    --service $SERVER_SERVICE \
    --domain $SERVER_DOMAIN \
    --region $REGION || true
  echo "📄 DNS records for $SERVER_DOMAIN:"
  gcloud run domain-mappings describe --domain $SERVER_DOMAIN --region $REGION || true
fi

# Get server URL
SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Server build and deployment complete!"
echo "🔗 Server deployed at: ${SERVER_DOMAIN:-$SERVER_URL}"
echo "📊 Monitor your server:"
echo "   https://console.cloud.google.com/run/detail/$REGION/$SERVER_SERVICE/metrics?project=$PROJECT_ID"
