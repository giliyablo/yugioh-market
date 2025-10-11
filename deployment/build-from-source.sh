#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="me-west1"
SERVER_SERVICE="tcg-marketplace-server"
CLIENT_SERVICE="tcg-marketplace-client"

# Configuration options
SOURCE_TYPE=${1:-"local"}  # local, github, gcs
BUILD_TARGET=${2:-"both"}  # server, client, both
GITHUB_REPO=${3:-"giliyablo/yugioh-market"}       # Format: owner/repo
GITHUB_BRANCH=${4:-"main"} # Branch to build from
GCS_BUCKET=${5:-"tcg-marketplace-source"}        # GCS bucket with source code

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

# Function to build based on target
build_target() {
    local source_path=$1
    local target=$2
    
    case $target in
        "server")
            build_server $source_path
            ;;
        "client")
            build_client $source_path
            ;;
        "both")
            build_server $source_path
            build_client $source_path
            ;;
        *)
            echo "❌ Invalid build target: $target"
            echo "Valid options: server, client, both"
            exit 1
            ;;
    esac
}

# Function to deploy services
deploy_services() {
    local target=$1
    
    case $target in
        "server")
            echo "☁️ Deploying server to Cloud Run..."
            gcloud run deploy $SERVER_SERVICE \
              --image gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest \
              --platform managed \
              --region $REGION \
              --allow-unauthenticated \
              --port 80 \
              --memory 2Gi \
              --cpu 2 \
              --min-instances 1 \
              --max-instances 10 \
              --timeout 3600 \
              --set-env-vars NODE_ENV=production

            # Get server URL
            SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)')
            echo "🔗 Server deployed at: $SERVER_URL"
            ;;
        "client")
            # Get existing server URL for client environment variable
            SERVER_URL=$(gcloud run services describe $SERVER_SERVICE --platform managed --region $REGION --format 'value(status.url)' 2>/dev/null || echo "")
            if [ -z "$SERVER_URL" ]; then
                echo "⚠️  Server not found. Client will be deployed without API URL."
                echo "   Deploy server first or update VITE_API_URL manually."
            else
                echo "🔗 Using existing server: $SERVER_URL"
            fi
            
            echo "☁️ Deploying client to Cloud Run..."
            gcloud run deploy $CLIENT_SERVICE \
              --image gcr.io/$PROJECT_ID/$CLIENT_SERVICE:latest \
              --platform managed \
              --region $REGION \
              --allow-unauthenticated \
              --port 80 \
              --memory 1Gi \
              --cpu 1 \
              --min-instances 1 \
              --max-instances 5 \
              --timeout 3600 \
              --set-env-vars VITE_API_URL=$SERVER_URL/api

            # Get client URL
            CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --platform managed --region $REGION --format 'value(status.url)')
            echo "🔗 Client deployed at: $CLIENT_URL"
            ;;
        "both")
            echo "☁️ Deploying server to Cloud Run..."
            gcloud run deploy $SERVER_SERVICE \
              --image gcr.io/$PROJECT_ID/$SERVER_SERVICE:latest \
              --platform managed \
              --region $REGION \
              --allow-unauthenticated \
              --port 80 \
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
              --port 80 \
              --memory 1Gi \
              --cpu 1 \
              --min-instances 1 \
              --max-instances 5 \
              --timeout 3600 \
              --set-env-vars VITE_API_URL=$SERVER_URL/api

            # Get client URL
            CLIENT_URL=$(gcloud run services describe $CLIENT_SERVICE --platform managed --region $REGION --format 'value(status.url)')
            echo "🔗 Client deployed at: $CLIENT_URL"
            ;;
    esac
}

# Main build logic based on source type
case $SOURCE_TYPE in
    "local")
        echo "📁 Building from local source code..."
        build_target . $BUILD_TARGET
        deploy_services $BUILD_TARGET
        ;;
    
    "github")
        if [ -z "$GITHUB_REPO" ]; then
            echo "❌ GitHub repository not specified. Usage:"
            echo "   ./deployment/build-from-source.sh github [target] owner/repo [branch]"
            exit 1
        fi
        
        echo "🐙 Building from GitHub repository: $GITHUB_REPO (branch: $GITHUB_BRANCH)"
        
        # Create a temporary directory and clone the repo
        TEMP_DIR=$(mktemp -d)
        echo "📁 Cloning repository to temporary directory..."
        git clone --branch $GITHUB_BRANCH --depth 1 https://github.com/$GITHUB_REPO.git $TEMP_DIR
        
        # Build based on target
        build_target $TEMP_DIR $BUILD_TARGET
        
        # Clean up temporary directory
        rm -rf $TEMP_DIR
        
        deploy_services $BUILD_TARGET
        ;;
    
    "gcs")
        if [ -z "$GCS_BUCKET" ]; then
            echo "❌ GCS bucket not specified. Usage:"
            echo "   ./deployment/build-from-source.sh gcs [target] bucket-name"
            exit 1
        fi
        
        echo "☁️ Building from GCS bucket: $GCS_BUCKET"
        GCS_URL="gs://$GCS_BUCKET"
        build_target $GCS_URL $BUILD_TARGET
        deploy_services $BUILD_TARGET
        ;;
    
    *)
        echo "❌ Invalid source type: $SOURCE_TYPE"
        echo "Valid options: local, github, gcs"
        echo ""
        echo "Usage examples:"
        echo "  ./deployment/build-from-source.sh local [server|client|both]"
        echo "  ./deployment/build-from-source.sh github [server|client|both] owner/repo [branch]"
        echo "  ./deployment/build-from-source.sh gcs [server|client|both] bucket-name"
        exit 1
        ;;
esac

echo "✅ Build and deployment complete!"
echo "🌍 Your application is live at: $CLIENT_URL"
echo "🔗 API server: $SERVER_URL"
echo "📊 Monitor your services:"
echo "   Server: https://console.cloud.google.com/run/detail/$REGION/$SERVER_SERVICE/metrics?project=$PROJECT_ID"
echo "   Client: https://console.cloud.google.com/run/detail/$REGION/$CLIENT_SERVICE/metrics?project=$PROJECT_ID"
