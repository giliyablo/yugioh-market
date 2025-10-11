#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="me-west1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"
REPO_URL="https://github.com/your-username/your-repo-name"  # Update this with your actual repo URL
BRANCH="main"  # Update this to your default branch

# Check for resume flag
RESUME_FROM=${1:-""}

echo "🚀 Building TCG Marketplace images from GitHub repository..."
echo "📦 Repository: $REPO_URL"
echo "🌿 Branch: $BRANCH"

# If resuming, skip to the failed step
if [ "$RESUME_FROM" = "client" ]; then
    echo "🔄 Resuming build from client..."
    SKIP_SERVER=true
    SKIP_CLIENT=false
elif [ "$RESUME_FROM" = "client-deploy" ]; then
    echo "🔄 Resuming build from client deployment..."
    SKIP_SERVER=true
    SKIP_CLIENT=true
    SKIP_CLIENT_DEPLOY=false
else
    echo "🔄 Starting fresh build..."
    SKIP_SERVER=false
    SKIP_CLIENT=false
    SKIP_CLIENT_DEPLOY=false
fi

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
gcloud services enable sourcerepo.googleapis.com

# Connect repository to Cloud Build (if not already connected)
echo "🔗 Connecting repository to Cloud Build..."
if ! gcloud source repos describe tcg-marketplace &> /dev/null; then
    echo "📁 Creating Cloud Source Repository..."
    gcloud source repos create tcg-marketplace
fi

# Build server image from source (skip if resuming)
if [ "$SKIP_SERVER" = "false" ]; then
    echo "🐳 Building server image from source..."
    gcloud builds submit \
        --config=cloudbuild-server.yaml \
        --substitutions=_SERVICE_NAME=$SERVER_SERVICE,_PROJECT_ID=$PROJECT_ID \
        $REPO_URL
else
    echo "⏭️  Skipping server build (already completed)"
fi

# Build client image from source (skip if resuming from client-deploy)
if [ "$SKIP_CLIENT" = "false" ]; then
    echo "🐳 Building client image from source..."
    gcloud builds submit \
        --config=cloudbuild-client.yaml \
        --substitutions=_SERVICE_NAME=$CLIENT_SERVICE,_PROJECT_ID=$PROJECT_ID \
        $REPO_URL
else
    echo "⏭️  Skipping client build (already completed)"
fi

# Deploy server to Cloud Run
echo "☁️ Deploying server to Cloud Run..."
gcloud run deploy $SERVER_SERVICE \
  --image gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --timeout 3600 \
  --set-env-vars NODE_ENV=production

# Get server URL
SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)')
echo "🔗 Server deployed at: $SERVER_URL"

# Deploy client to Cloud Run (skip if resuming from client-deploy)
if [ "$SKIP_CLIENT_DEPLOY" = "false" ]; then
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
      --timeout 3600 \
      --set-env-vars VITE_API_URL=$SERVER_URL/api
else
    echo "⏭️  Skipping client deployment (already completed)"
fi

# Get client URL
CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Build and deployment complete!"
echo "🌍 Your application is live at: $CLIENT_URL"
echo "🔗 API server: $SERVER_URL"
echo "📊 Monitor your services:"
echo "   Server: https://console.cloud.google.com/run/detail/$REGION/$SERVER_SERVICE/metrics?project=$PROJECT_ID"
echo "   Client: https://console.cloud.google.com/run/detail/$REGION/$CLIENT_SERVICE/metrics?project=$PROJECT_ID"
echo ""
echo "🔄 Resume options for next time:"
echo "   ./deployment/build-gcp.sh client        # Resume from client build"
echo "   ./deployment/build-gcp.sh client-deploy # Resume from client deployment"
