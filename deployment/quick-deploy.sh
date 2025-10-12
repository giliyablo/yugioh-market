#!/bin/bash

# Quick deployment script for Google Cloud
set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="me-west1"

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
  --set-env-vars VITE_API_URL=$SERVER_URL/api

# Get client URL
CLIENT_URL=$(gcloud run services describe tcg-client --region $REGION --format 'value(status.url)')
echo "✅ Client deployed at: $CLIENT_URL"

echo ""
echo "🎉 Deployment complete!"
echo "🌍 Your app: $CLIENT_URL"
echo "🔧 API: $SERVER_URL"
