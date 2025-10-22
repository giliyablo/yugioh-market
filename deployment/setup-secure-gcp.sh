#!/bin/bash

set -e

# --- Configuration ---
PROJECT_ID="fourth-arena-474414-h6"
REGION="us-central1"
NETWORK="tcg-market-vpc"
SUBNET="tcg-market-subnet"
CONNECTOR="tcg-market-connector"
IP_NAME="tcg-market-lb-ip"
ARMOR_POLICY_NAME="tcg-market-waf-policy"
# IMPORTANT: Replace with your actual domain name.
DOMAIN_NAME="tcgsmarketplace.com"
SSL_CERT_NAME="tcg-market-ssl-cert"
SERVICE_ACCOUNT_NAME="tcg-run-sa"

# --- Main Script ---
echo "🚀 Starting secure infrastructure setup for TCG Marketplace on GCP..."

# Pre-flight checks
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed. Please install it first."
    exit 1
fi

echo "📋 Setting GCP project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

echo "🔧 Enabling required APIs..."
gcloud services enable compute.googleapis.com \
    vpcaccess.googleapis.com \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    iam.googleapis.com

# 1. Create Service Account for Cloud Run
echo "--- 🧑‍🔧 Checking for Service Account ---"
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating Service Account: $SERVICE_ACCOUNT_NAME..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="TCG Marketplace Cloud Run Service Account" \
        --project=$PROJECT_ID
else
    echo "  - Service Account '$SERVICE_ACCOUNT_NAME' already exists."
fi

echo "  - Granting Firestore access to Service Account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/datastore.user" \
    --condition=None

# 2. VPC and Subnet
echo "--- 🌐 Checking for VPC and Subnet ---"
if ! gcloud compute networks describe $NETWORK --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating VPC: $NETWORK..."
    gcloud compute networks create $NETWORK --subnet-mode=custom --bgp-routing-mode=regional --project=$PROJECT_ID
else
    echo "  - VPC '$NETWORK' already exists."
fi

if ! gcloud compute networks subnets describe $SUBNET --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating Subnet: $SUBNET..."
    gcloud compute networks subnets create $SUBNET \
        --network=$NETWORK \
        --range=10.8.0.0/28 \
        --region=$REGION \
        --project=$PROJECT_ID
else
    echo "  - Subnet '$SUBNET' already exists."
fi

# 3. Serverless VPC Access Connector
echo "--- 🔌 Checking for Serverless VPC Access Connector ---"
if ! gcloud compute networks vpc-access connectors describe $CONNECTOR --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating VPC Access Connector: $CONNECTOR..."
    gcloud compute networks vpc-access connectors create $CONNECTOR \
        --region=$REGION \
        --subnet=$SUBNET \
        --project=$PROJECT_ID
else
    echo "  - VPC Access Connector '$CONNECTOR' already exists."
fi

# 4. External HTTPS Load Balancer
echo "--- ⚖️  Setting up External HTTPS Load Balancer ---"

if ! gcloud compute addresses describe $IP_NAME --global --project=$PROJECT_ID &>/dev/null; then
    echo "  - Reserving static IP address: $IP_NAME..."
    gcloud compute addresses create $IP_NAME --global --project=$PROJECT_ID
else
    echo "  - Static IP '$IP_NAME' already exists."
fi

if ! gcloud compute network-endpoint-groups describe tcg-client-neg --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating Serverless NEG for client..."
    gcloud compute network-endpoint-groups create tcg-client-neg --region=$REGION --network-endpoint-type=serverless --cloud-run-service=$CLIENT_SERVICE --project=$PROJECT_ID
else
    echo "  - Serverless NEG 'tcg-client-neg' already exists."
fi

if ! gcloud compute network-endpoint-groups describe tcg-server-neg --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating Serverless NEG for server..."
    gcloud compute network-endpoint-groups create tcg-server-neg --region=$REGION --network-endpoint-type=serverless --cloud-run-service=$SERVER_SERVICE --project=$PROJECT_ID
else
    echo "  - Serverless NEG 'tcg-server-neg' already exists."
fi

if ! gcloud compute backend-services describe tcg-client-backend --global --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating backend service for client and attaching NEG..."
    gcloud compute backend-services create tcg-client-backend --global --project=$PROJECT_ID
    gcloud compute backend-services add-backend tcg-client-backend --global --network-endpoint-group=tcg-client-neg --network-endpoint-group-region=$REGION --project=$PROJECT_ID
else
    echo "  - Backend service 'tcg-client-backend' already exists."
fi

if ! gcloud compute backend-services describe tcg-server-backend --global --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating backend service for server and attaching NEG..."
    gcloud compute backend-services create tcg-server-backend --global --project=$PROJECT_ID
    gcloud compute backend-services add-backend tcg-server-backend --global --network-endpoint-group=tcg-server-neg --network-endpoint-group-region=$REGION --project=$PROJECT_ID
else
    echo "  - Backend service 'tcg-server-backend' already exists."
fi

if ! gcloud compute url-maps describe tcg-market-lb --global --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating URL map 'tcg-market-lb'..."
    gcloud compute url-maps create tcg-market-lb --default-service=tcg-client-backend --project=$PROJECT_ID
    gcloud compute url-maps add-path-matcher tcg-market-lb --default-service=tcg-client-backend --path-matcher-name=api-matcher --path-rules="/api/*=tcg-server-backend" --project=$PROJECT_ID
else
    echo "  - URL map 'tcg-market-lb' already exists."
fi

# 5. SSL Certificate
echo "--- 🔐 Setting up SSL Certificate ---"
if ! gcloud compute ssl-certificates describe $SSL_CERT_NAME --global --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating Google-managed SSL certificate: $SSL_CERT_NAME for domain $DOMAIN_NAME..."
    gcloud compute ssl-certificates create $SSL_CERT_NAME --domains=$DOMAIN_NAME --global --project=$PROJECT_ID
else
    echo "  - SSL Certificate '$SSL_CERT_NAME' already exists."
fi

# 6. HTTPS Proxy and Forwarding Rule
echo "--- ➡️  Configuring HTTPS Frontend ---"
if ! gcloud compute target-https-proxies describe tcg-market-https-proxy --global --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating target HTTPS proxy..."
    gcloud compute target-https-proxies create tcg-market-https-proxy --url-map=tcg-market-lb --ssl-certificates=$SSL_CERT_NAME --global --project=$PROJECT_ID
else
    echo "  - Target HTTPS proxy 'tcg-market-https-proxy' already exists."
fi

if ! gcloud compute forwarding-rules describe tcg-market-forwarding-rule --global --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating global forwarding rule..."
    gcloud compute forwarding-rules create tcg-market-forwarding-rule --address=$IP_NAME --target-https-proxy=tcg-market-https-proxy --global --ports=443 --project=$PROJECT_ID
else
    echo "  - Global forwarding rule 'tcg-market-forwarding-rule' already exists."
fi

# 7. Cloud Armor (WAF)
echo "--- 🛡️  Setting up Cloud Armor WAF ---"
if ! gcloud compute security-policies describe $ARMOR_POLICY_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "  - Creating Cloud Armor policy: $ARMOR_POLICY_NAME..."
    gcloud compute security-policies create $ARMOR_POLICY_NAME --description="WAF policy for TCG Marketplace" --project=$PROJECT_ID
    gcloud compute security-policies rules create 1000 --security-policy=$ARMOR_POLICY_NAME --expression="evaluatePreconfiguredExpr('sqli-stable')" --action="deny-403" --description="SQLi Protection" --project=$PROJECT_ID
else
    echo "  - Cloud Armor policy '$ARMOR_POLICY_NAME' already exists."
fi

echo "  - Attaching Cloud Armor policy to backend services..."
gcloud compute backend-services update tcg-client-backend --security-policy=$ARMOR_POLICY_NAME --global --project=$PROJECT_ID
gcloud compute backend-services update tcg-server-backend --security-policy=$ARMOR_POLICY_NAME --global --project=$PROJECT_ID

echo "🎉 Secure infrastructure setup complete."
PUBLIC_IP=$(gcloud compute addresses describe $IP_NAME --global --format 'value(address)' --project=$PROJECT_ID 2>/dev/null)
if [ -n "$PUBLIC_IP" ]; then
    echo "✅ Your public IP address is: $PUBLIC_IP"
    echo "👉 Point your domain's A record ('$DOMAIN_NAME') to this IP address."
fi

