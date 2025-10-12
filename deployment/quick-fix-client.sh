#!/bin/bash

echo "🚀 Quick fix for client deployment using simpler approach..."

# Backup original Dockerfile
cp client/Dockerfile client/Dockerfile.backup

# Use the envsubst approach
cp client/Dockerfile.envsubst client/Dockerfile

# Build and test locally
echo "🧪 Testing locally with new approach..."
cd client
docker build -t test-client-fixed .
echo "✅ Build successful"

# Test the container
echo "🔍 Testing container..."
docker run --rm -d --name test-client-fixed -p 5000:5000 -e PORT=5000 test-client-fixed
sleep 5
echo "🔍 Container status:"
docker ps -a | grep test-client-fixed
echo "🔍 Container logs:"
docker logs test-client-fixed

if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Client works on port 5000"
    docker stop test-client-fixed
    echo "🚀 Deploying to Cloud Run..."
    cd ..
    gcloud builds submit \
        --config=cloudbuild-client.yaml \
        --substitutions=_SERVICE_NAME=tcg-marketplace-client,_PROJECT_ID=fourth-arena-474414-h6 \
        ./client
    
    # Deploy to Cloud Run
    gcloud run deploy tcg-marketplace-client \
      --image gcr.io/fourth-arena-474414-h6/tcg-marketplace-client:latest \
      --platform managed \
      --region me-west1 \
      --allow-unauthenticated \
      --port 5000 \
      --memory 1Gi \
      --cpu 1 \
      --min-instances 1 \
      --max-instances 5 \
      --timeout 3600
    
    echo "✅ Client deployed successfully!"
else
    echo "❌ Client still failing locally"
    docker stop test-client-fixed
    echo "🔍 Full logs:"
    docker logs test-client-fixed
fi
