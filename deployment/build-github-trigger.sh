#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="me-west1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"
GITHUB_REPO="giliyablo/tcg-market"
GITHUB_BRANCH=${1:-"main"}

echo "🚀 Building TCG Marketplace images using Cloud Build triggers..."

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

# Check if triggers exist, if not create them
echo "🔍 Checking for existing build triggers..."

# Check server trigger
if ! gcloud builds triggers describe tcg-server-trigger &> /dev/null; then
    echo "📦 Creating server build trigger..."
    gcloud builds triggers create github \
        --repo-name=$GITHUB_REPO \
        --repo-owner=$(echo $GITHUB_REPO | cut -d'/' -f1) \
        --branch-pattern="^$GITHUB_BRANCH$" \
        --build-config="cloudbuild-server.yaml" \
        --name="tcg-server-trigger" \
        --description="Build server image on push to $GITHUB_BRANCH" \
        --substitutions="_SERVICE_NAME=$SERVER_SERVICE,_PROJECT_ID=$PROJECT_ID"
else
    echo "✅ Server trigger already exists"
fi

# Check client trigger
if ! gcloud builds triggers describe tcg-client-trigger &> /dev/null; then
    echo "📦 Creating client build trigger..."
    gcloud builds triggers create github \
        --repo-name=$GITHUB_REPO \
        --repo-owner=$(echo $GITHUB_REPO | cut -d'/' -f1) \
        --branch-pattern="^$GITHUB_BRANCH$" \
        --build-config="cloudbuild-client.yaml" \
        --name="tcg-client-trigger" \
        --description="Build client image on push to $GITHUB_BRANCH" \
        --substitutions="_SERVICE_NAME=$CLIENT_SERVICE,_PROJECT_ID=$PROJECT_ID"
else
    echo "✅ Client trigger already exists"
fi

# Manually trigger builds
echo "🚀 Manually triggering builds..."

# Trigger server build
echo "🐳 Triggering server build..."
gcloud builds triggers run tcg-server-trigger \
    --branch=$GITHUB_BRANCH

# Wait for server build to complete
echo "⏳ Waiting for server build to complete..."
SERVER_BUILD_ID=$(gcloud builds list --filter="trigger.name=tcg-server-trigger" --limit=1 --format="value(id)")
gcloud builds log $SERVER_BUILD_ID --stream

# Trigger client build
echo "🐳 Triggering client build..."
gcloud builds triggers run tcg-client-trigger \
    --branch=$GITHUB_BRANCH

# Wait for client build to complete
echo "⏳ Waiting for client build to complete..."
CLIENT_BUILD_ID=$(gcloud builds list --filter="trigger.name=tcg-client-trigger" --limit=1 --format="value(id)")
gcloud builds log $CLIENT_BUILD_ID --stream

# Deploy services
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

# Get server URL
SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)')
echo "🔗 Server deployed at: $SERVER_URL"

echo "☁️ Deploying client to Cloud Run..."
gcloud run deploy $CLIENT_SERVICE \
  --image gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 5000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 5 \
  --timeout 3600 \
  --set-env-vars VITE_API_URL=$SERVER_URL/api

# Get client URL
CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Build and deployment complete!"
echo "🌍 Your application is live at: $CLIENT_URL"
echo "🔗 API server: $SERVER_URL"
echo "📊 Monitor your services:"
echo "   Server: https://console.cloud.google.com/run/detail/$REGION/$SERVER_SERVICE/metrics?project=$PROJECT_ID"
echo "   Client: https://console.cloud.google.com/run/detail/$REGION/$CLIENT_SERVICE/metrics?project=$PROJECT_ID"
