#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="me-west1"
CLIENT_SERVICE="tcg-marketplace-client"

echo "🔧 Fixing client deployment issues..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Test locally first (optional)
echo "🧪 Testing client container locally..."
cd client
docker build -t test-client .
echo "✅ Local build successful"

# Test with different ports
echo "🔍 Testing port configuration..."
docker run --rm -d --name test-client -p 8080:8080 -e PORT=8080 test-client
sleep 5
echo "🔍 Checking container status..."
docker ps -a | grep test-client
echo "🔍 Checking logs..."
docker logs test-client
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Client works on port 8080"
    docker stop test-client
else
    echo "❌ Client failed on port 8080"
    docker stop test-client
fi

# Build and deploy to Cloud Run
echo "🐳 Building and deploying client to Cloud Run..."
cd ..
gcloud builds submit \
    --config=cloudbuild-client.yaml \
    --substitutions=_SERVICE_NAME=$CLIENT_SERVICE,_PROJECT_ID=$PROJECT_ID \
    ./client

# Deploy with extended timeout and better configuration
echo "☁️ Deploying client to Cloud Run with extended timeout..."
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
  --concurrency 1000 \
  --max-instances 10

# Get client URL
CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Client deployment complete!"
echo "🌍 Client deployed at: $CLIENT_URL"
echo "🔍 Test the health endpoint: $CLIENT_URL/health"
echo "📊 Monitor your client:"
echo "   https://console.cloud.google.com/run/detail/$REGION/$CLIENT_SERVICE/metrics?project=$PROJECT_ID"
