#!/bin/bash

# Quick deployment script for Google Cloud
set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="us-central1"
# Optional permanent domains. Export before running or set inline:
# SERVER_DOMAIN=api.example.com CLIENT_DOMAIN=app.example.com ./deployment/quick-deploy.sh
SERVER_DOMAIN=${SERVER_DOMAIN:-"api.tcgsmarketplace.com"}
CLIENT_DOMAIN=${CLIENT_DOMAIN:-"www.tcgsmarketplace.com"}

echo "🚀 Quick deployment to Google Cloud Run"

# Build and deploy server
echo "🔨 Building server..."
cd server
docker build -t gcr.io/$PROJECT_ID/tcg-server:latest .
docker push gcr.io/$PROJECT_ID/tcg-server:latest

echo "🚀 Deploying server to Cloud Run..."
gcloud run deploy tcg-server \
  --image gcr.io/$PROJECT_ID/tcg-server:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 5000 \
  --memory 2Gi \
  --cpu 2

# Map custom domain for server if provided
if [ -n "$SERVER_DOMAIN" ]; then
  echo "🔗 Creating domain mapping for server: $SERVER_DOMAIN"
  gcloud run domain-mappings create \
    --service tcg-server \
    --domain $SERVER_DOMAIN \
    --platform managed \
    --region $REGION || true
  echo "📄 DNS records for $SERVER_DOMAIN:"
  gcloud run domain-mappings describe --domain $SERVER_DOMAIN --platform managed --region $REGION || true
fi

# Get server URL
SERVER_URL=$(gcloud run services describe tcg-server --region $REGION --format 'value(status.url)')
echo "✅ Server deployed at: $SERVER_URL"

# Build and deploy client
echo "🔨 Building client..."
cd ../client
docker build -t gcr.io/$PROJECT_ID/tcg-client:latest .
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

# Map custom domain for client if provided
if [ -n "$CLIENT_DOMAIN" ]; then
  echo "🔗 Creating domain mapping for client: $CLIENT_DOMAIN"
  gcloud run domain-mappings create \
    --service tcg-client \
    --domain $CLIENT_DOMAIN \
    --platform managed \
    --region $REGION || true
  echo "📄 DNS records for $CLIENT_DOMAIN:"
  gcloud run domain-mappings describe --domain $CLIENT_DOMAIN --platform managed --region $REGION || true
fi

# Get client URL
CLIENT_URL=$(gcloud run services describe tcg-client --region $REGION --format 'value(status.url)')
echo "✅ Client deployed at: $CLIENT_URL"

echo ""
echo "🎉 Deployment complete!"
echo "🌍 Your app: ${CLIENT_DOMAIN:-$CLIENT_URL}"
echo "🔧 API: ${SERVER_DOMAIN:-$SERVER_URL}"
