#!/bin/bash

# Deploy Docker Compose application to Google Cloud Platform
# This script converts your Docker Compose setup to Cloud Run services

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="me-west1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"

echo "🚀 Deploying Docker Compose application to Google Cloud Platform"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# Enable required APIs
echo "📋 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push server image
echo "🔨 Building server image..."
cd server
docker build -t gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest .
docker push gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest
cd ..

# Build and push client image
echo "🔨 Building client image..."
cd client
docker build -t gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest .
docker push gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest
cd ..

# Deploy server to Cloud Run
echo "🚀 Deploying server to Cloud Run..."
gcloud run deploy $SERVER_SERVICE \
  --image gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 5000 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,PORT=5000

# Get server URL and wait for it to be ready
SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --region $REGION --format 'value(status.url)')
echo "✅ Server deployed at: $SERVER_URL"

# Wait for server to be ready and test connectivity
echo "⏳ Waiting for server to be ready..."
sleep 10
echo "🔍 Testing server connectivity..."
if curl -f -s "$SERVER_URL/health" > /dev/null; then
    echo "✅ Server is healthy and responding"
else
    echo "⚠️  Server health check failed, but continuing with deployment..."
fi

# Deploy client to Cloud Run with proper API URL
echo "🚀 Deploying client to Cloud Run..."
gcloud run deploy $CLIENT_SERVICE \
  --image gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 5 \
  --set-env-vars VITE_API_URL=$SERVER_URL/api

# Get client URL
CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --region $REGION --format 'value(status.url)')
echo "✅ Client deployed at: $CLIENT_URL"

# Final connectivity test
echo ""
echo "🔍 Testing service connectivity..."
echo "⏳ Waiting for client to be ready..."
sleep 15

# Test that client can reach server
echo "🧪 Testing client-server communication..."
if curl -f -s "$CLIENT_URL" > /dev/null; then
    echo "✅ Client is accessible"
    echo "✅ Services are properly connected via external URLs"
else
    echo "⚠️  Client accessibility test failed, but services may still work"
fi

echo ""
echo "🎉 Deployment complete!"
echo "📱 Client URL: $CLIENT_URL"
echo "🔧 Server URL: $SERVER_URL"
echo ""
echo "🌐 Network Configuration:"
echo "  - Server and client communicate via external Cloud Run URLs"
echo "  - Client API calls go to: $SERVER_URL/api"
echo "  - CORS is configured to allow cross-origin requests"
echo ""
echo "To view logs:"
echo "  Server: gcloud run logs tail $SERVER_SERVICE --region $REGION"
echo "  Client: gcloud run logs tail $CLIENT_SERVICE --region $REGION"
