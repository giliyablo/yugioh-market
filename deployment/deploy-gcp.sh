#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="us-central1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"
# Optional permanent domains. Export before running or set inline:
# SERVER_DOMAIN=api.example.com CLIENT_DOMAIN=app.example.com ./deployment/deploy-gcp.sh
SERVER_DOMAIN=${SERVER_DOMAIN:-"api.tcgsmarketplace.com"}
CLIENT_DOMAIN=${CLIENT_DOMAIN:-"www.tcgsmarketplace.com"}

# Check for resume flag
RESUME_FROM=${1:-""}

echo "🚀 Deploying TCG Marketplace to Google Cloud Platform..."

# If resuming, skip to the failed step
if [ "$RESUME_FROM" = "client" ]; then
    echo "🔄 Resuming deployment from client build..."
    SKIP_SERVER=true
    SKIP_CLIENT_BUILD=false
elif [ "$RESUME_FROM" = "client-deploy" ]; then
    echo "🔄 Resuming deployment from client deployment..."
    SKIP_SERVER=true
    SKIP_CLIENT_BUILD=true
    SKIP_CLIENT_DEPLOY=false
else
    echo "🔄 Starting fresh deployment..."
    SKIP_SERVER=false
    SKIP_CLIENT_BUILD=false
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

# Build and push server image (skip if resuming)
if [ "$SKIP_SERVER" = "false" ]; then
    echo "🐳 Building and pushing server image..."
    cd server
    gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest .
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
      --timeout 3600 \
      --set-env-vars NODE_ENV=production

    # Map custom domain for server if provided
    if [ -n "$SERVER_DOMAIN" ]; then
        echo "🔗 Creating domain mapping for server: $SERVER_DOMAIN"
        gcloud run domain-mappings create \
          --service $SERVER_SERVICE \
          --domain $SERVER_DOMAIN \
          --platform managed \
          --region $REGION || true
        echo "📄 DNS records for $SERVER_DOMAIN:"
        gcloud run domain-mappings describe --domain $SERVER_DOMAIN --platform managed --region $REGION || true
    fi

    # Get server URL
    SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)')
    echo "🔗 Server deployed at: $SERVER_URL"
else
    echo "⏭️  Skipping server build and deployment (already completed)"
    # Get existing server URL
    SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)')
    echo "🔗 Using existing server at: $SERVER_URL"
fi

# Build and push client image (skip if resuming from client-deploy)
if [ "$SKIP_CLIENT_BUILD" = "false" ]; then
    echo "🐳 Building and pushing client image..."
    cd client
    gcloud builds submit --tag gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest .
    cd ..
else
    echo "⏭️  Skipping client build (already completed)"
fi

# Deploy client to Cloud Run (skip if resuming from client-deploy)
if [ "$SKIP_CLIENT_DEPLOY" = "false" ]; then
    echo "☁️ Deploying client to Cloud Run..."
    gcloud run deploy $CLIENT_SERVICE \
      --image gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest \
      --platform managed \
      --region $REGION \
      --allow-unauthenticated \
      --port 3000 \
      --memory 1Gi \
      --cpu 1 \
      --min-instances 1 \
      --max-instances 5 \
      --timeout 3600 \
      --set-env-vars VITE_API_URL=${SERVER_DOMAIN:+https://$SERVER_DOMAIN/api}${SERVER_DOMAIN:-$SERVER_URL/api}

    # Map custom domain for client if provided
    if [ -n "$CLIENT_DOMAIN" ]; then
        echo "🔗 Creating domain mapping for client: $CLIENT_DOMAIN"
        gcloud run domain-mappings create \
          --service $CLIENT_SERVICE \
          --domain $CLIENT_DOMAIN \
          --platform managed \
          --region $REGION || true
        echo "📄 DNS records for $CLIENT_DOMAIN:"
        gcloud run domain-mappings describe --domain $CLIENT_DOMAIN --platform managed --region $REGION || true
    fi
else
    echo "⏭️  Skipping client deployment (already completed)"
fi

# Get client URL
CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Deployment complete!"
echo "🌍 Your application is live at: ${CLIENT_DOMAIN:-$CLIENT_URL}"
echo "🔗 API server: ${SERVER_DOMAIN:-$SERVER_URL}"
echo "📊 Monitor your services:"
echo "   Server: https://console.cloud.google.com/run/detail/$REGION/$SERVER_SERVICE/metrics?project=$PROJECT_ID"
echo "   Client: https://console.cloud.google.com/run/detail/$REGION/$CLIENT_SERVICE/metrics?project=$PROJECT_ID"
echo ""
echo "🔄 Resume options for next time:"
echo "   ./deployment/deploy-gcp.sh client        # Resume from client build"
echo "   ./deployment/deploy-gcp.sh client-deploy # Resume from client deployment"
