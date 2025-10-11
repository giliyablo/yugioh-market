#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="me-west1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"

# Configuration options
SOURCE_TYPE=${1:-"local"}  # local, github, gcs
GITHUB_REPO=${2:-"giliyablo/yugioh-market"}       # Format: owner/repo
GITHUB_BRANCH=${3:-"main"} # Branch to build from
GCS_BUCKET=${4:-"tcg-marketplace-source"}        # GCS bucket with source code

echo "🚀 Building TCG Marketplace images from $SOURCE_TYPE source..."

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

# Function to build server
build_server() {
    local source_path=$1
    echo "🐳 Building server image from $source_path..."
    
    gcloud builds submit \
        --config=cloudbuild-server.yaml \
        --substitutions=_SERVICE_NAME=$SERVER_SERVICE,_PROJECT_ID=$PROJECT_ID \
        $source_path
}

# Function to build client
build_client() {
    local source_path=$1
    echo "🐳 Building client image from $source_path..."
    
    gcloud builds submit \
        --config=cloudbuild-client.yaml \
        --substitutions=_SERVICE_NAME=$CLIENT_SERVICE,_PROJECT_ID=$PROJECT_ID \
        $source_path
}

# Function to deploy services
deploy_services() {
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

    # Get client URL
    CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --platform managed --region $REGION --format 'value(status.url)')
    echo "🔗 Client deployed at: $CLIENT_URL"
}

# Main build logic based on source type
case $SOURCE_TYPE in
    "local")
        echo "📁 Building from local source code..."
        build_server .
        build_client .
        deploy_services
        ;;
    
    "github")
        if [ -z "$GITHUB_REPO" ]; then
            echo "❌ GitHub repository not specified. Usage:"
            echo "   ./deployment/build-from-source.sh github owner/repo [branch]"
            exit 1
        fi
        
        echo "🐙 Building from GitHub repository: $GITHUB_REPO (branch: $GITHUB_BRANCH)"
        GITHUB_URL="https://github.com/$GITHUB_REPO.git"
        build_server $GITHUB_URL
        build_client $GITHUB_URL
        deploy_services
        ;;
    
    "gcs")
        if [ -z "$GCS_BUCKET" ]; then
            echo "❌ GCS bucket not specified. Usage:"
            echo "   ./deployment/build-from-source.sh gcs bucket-name"
            exit 1
        fi
        
        echo "☁️ Building from GCS bucket: $GCS_BUCKET"
        GCS_URL="gs://$GCS_BUCKET"
        build_server $GCS_URL
        build_client $GCS_URL
        deploy_services
        ;;
    
    *)
        echo "❌ Invalid source type: $SOURCE_TYPE"
        echo "Valid options: local, github, gcs"
        echo ""
        echo "Usage examples:"
        echo "  ./deployment/build-from-source.sh local"
        echo "  ./deployment/build-from-source.sh github owner/repo main"
        echo "  ./deployment/build-from-source.sh gcs my-source-bucket"
        exit 1
        ;;
esac

echo "✅ Build and deployment complete!"
echo "🌍 Your application is live at: $CLIENT_URL"
echo "🔗 API server: $SERVER_URL"
echo "📊 Monitor your services:"
echo "   Server: https://console.cloud.google.com/run/detail/$REGION/$SERVER_SERVICE/metrics?project=$PROJECT_ID"
echo "   Client: https://console.cloud.google.com/run/detail/$REGION/$CLIENT_SERVICE/metrics?project=$PROJECT_ID"
