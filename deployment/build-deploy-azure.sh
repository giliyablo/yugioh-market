#!/bin/bash

set -e

# ==============================================================================
# AZURE DEPLOYMENT SCRIPT
# ==============================================================================
# This script builds and deploys the client, server, and worker services to
# Azure Container Apps.
#
# ------------------------------------------------------------------------------
# !! IMPORTANT PREREQUISITES !!
# This script ASSUMES you have already provisioned the following Azure infrastructure,
# ideally using a tool like Terraform or Bicep.
#
# 1.  Core Resources:
#     - A Resource Group to hold all your services.
#     - An Azure Container Registry (ACR) to store your Docker images.
#
# 2.  Networking & Security:
#     - A Virtual Network (VNet).
#     - Two subnets: one for the Application Gateway and one for the Container Apps.
#     - A Public IP address for the Application Gateway.
#     - An Application Gateway with the WAF_v2 SKU. It needs to be configured with:
#       - A backend pool pointing to the FQDNs of the client and server Container Apps.
#       - HTTP settings and listeners for port 443.
#       - A request routing rule with path-based routing:
#         - '/*' forwards to the client backend.
#         - '/api/*' forwards to the server backend.
#       - An attached WAF policy with managed rules.
#
# 3.  Container Apps:
#     - A Container Apps Environment configured to use your VNet.
#     - Three Container Apps (client, server, worker) created within this environment.
#       - Ingress for the client and server should be set to 'internal'.
#       - Ingress for the worker should be disabled.
# ------------------------------------------------------------------------------


# --- Configuration ---
RESOURCE_GROUP="tcg-market-rg"
ACR_NAME="tcgmarketacr" # Must be globally unique
LOCATION="eastus"

CLIENT_APP_NAME="tcg-marketplace-client"
SERVER_APP_NAME="tcg-marketplace-server"
WORKER_APP_NAME="tcg-marketplace-worker"

# --- Functions ---

build_and_push() {
    local service_dir=$1
    local app_name=$2
    local image_tag=${3:-"latest"}
    local acr_login_server="${ACR_NAME}.azurecr.io"
    local image_name="${acr_login_server}/${app_name}:${image_tag}"

    echo "--- 🐳 Building and pushing image for $service_dir ---"

    # Build the image using ACR's quick build command
    az acr build --registry $ACR_NAME --image "$app_name:$image_tag" "./$service_dir"

    echo "  ✅ Image pushed to $image_name"
}

deploy_container_app() {
    local app_name=$1
    local image_tag=${2:-"latest"}
    local acr_login_server="${ACR_NAME}.azurecr.io"
    local image_name="${acr_login_server}/${app_name}:${image_tag}"

    echo "--- 🚀 Deploying $app_name to Azure Container Apps ---"

    # Update the container app to use the newly pushed image.
    # This will trigger a new revision.
    az containerapp update \
        --name $app_name \
        --resource-group $RESOURCE_GROUP \
        --image $image_name \
        --query "properties.latestRevisionFqdn"

    echo "  ✅ Deployment for $app_name initiated."
}

# --- Main Execution ---
echo "🚀 Starting deployment to Azure..."

# Login to Azure and ACR
az login
az acr login --name $ACR_NAME

# You can add logic here to select which service to deploy.
# For simplicity, this script deploys all services.

build_and_push "client" $CLIENT_APP_NAME
build_and_push "server" $SERVER_APP_NAME
build_and_push "worker" $WORKER_APP_NAME

deploy_container_app $CLIENT_APP_NAME
deploy_container_app $SERVER_APP_NAME
deploy_container_app $WORKER_APP_NAME

echo "🎉 Azure deployment process finished successfully."
APP_GW_IP=$(az network public-ip show --resource-group $RESOURCE_GROUP --name myAppGatewayPip --query ipAddress --output tsv)
if [ -n "$APP_GW_IP" ]; then
    echo "👉 Your application should be available at the public IP of your Application Gateway: $APP_GW_IP"
    echo "   (Remember to point your domain's A record to this IP address)."
fi
