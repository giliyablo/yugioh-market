#!/bin/bash

set -e

PROJECT_ID="fourth-arena-474414-h6"
REGION="me-west1"
GITHUB_REPO="giliyablo/tcg-market"  # Update this with your actual GitHub repo
GITHUB_TOKEN="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"  # You'll need to provide this

echo "🔗 Setting up GitHub integration with Google Cloud Build..."

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
gcloud services enable sourcerepo.googleapis.com

# Create GitHub App connection (requires manual setup)
echo "🔑 Setting up GitHub App connection..."
echo "📝 You'll need to:"
echo "   1. Go to: https://console.cloud.google.com/cloud-build/triggers"
echo "   2. Click 'Connect Repository'"
echo "   3. Select 'GitHub'"
echo "   4. Authenticate with GitHub"
echo "   5. Select your repository: $GITHUB_REPO"
echo ""

# Create build triggers
echo "⚙️  Creating build triggers..."

# Server trigger
echo "📦 Creating server build trigger..."
gcloud builds triggers create github \
    --repo-name=$GITHUB_REPO \
    --repo-owner=$(echo $GITHUB_REPO | cut -d'/' -f1) \
    --branch-pattern="^main$" \
    --build-config="cloudbuild-server.yaml" \
    --name="tcg-server-trigger" \
    --description="Build server image on push to main" \
    --substitutions="_SERVICE_NAME=tcg-marketplace-server,_PROJECT_ID=$PROJECT_ID"

# Client trigger
echo "📦 Creating client build trigger..."
gcloud builds triggers create github \
    --repo-name=$GITHUB_REPO \
    --repo-owner=$(echo $GITHUB_REPO | cut -d'/' -f1) \
    --branch-pattern="^main$" \
    --build-config="cloudbuild-client.yaml" \
    --name="tcg-client-trigger" \
    --description="Build client image on push to main" \
    --substitutions="_SERVICE_NAME=tcg-marketplace-client,_PROJECT_ID=$PROJECT_ID"

echo "✅ GitHub integration setup complete!"
echo ""
echo "🚀 Your builds will now trigger automatically on:"
echo "   - Push to main branch"
echo "   - Pull request to main branch"
echo ""
echo "📊 Monitor builds at:"
echo "   https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
echo ""
echo "⚙️  Manage triggers at:"
echo "   https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"

