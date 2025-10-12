#!/bin/bash

set -e

echo "🚀 Deploying tcg Market to Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install it first."
    exit 1
fi

# Check if we can connect to a cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

# Build Docker images
echo "🐳 Building Docker images..."
docker build -t tcg-market-server:latest -f server/Dockerfile server/
docker build -t tcg-market-client:latest -f client/Dockerfile client/

# Apply Kubernetes manifests
echo "📦 Applying Kubernetes manifests..."

# Create namespace first
kubectl apply -f deployment/k8s/namespace.yaml

# Apply ConfigMap
kubectl apply -f deployment/k8s/configmap.yaml

# Apply server resources
kubectl apply -f deployment/k8s/server-deployment.yaml
kubectl apply -f deployment/k8s/server-service.yaml

# Apply client resources
kubectl apply -f deployment/k8s/client-deployment.yaml
kubectl apply -f deployment/k8s/client-service.yaml

# Apply ingress
kubectl apply -f deployment/k8s/ingress.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/tcg-market-server -n tcg-market
kubectl wait --for=condition=available --timeout=300s deployment/tcg-market-client -n tcg-market

# Get service information
echo "✅ Deployment completed!"
echo ""
echo "📊 Service Status:"
kubectl get pods -n tcg-market
kubectl get services -n tcg-market
kubectl get ingress -n tcg-market

echo ""
echo "🌍 Access your application:"
echo "   Local: http://tcg-market.local (add to /etc/hosts)"
echo "   Or use port-forward: kubectl port-forward -n tcg-market svc/tcg-market-client 5000:5000"
echo ""
echo "📊 View logs:"
echo "   kubectl logs -f deployment/tcg-market-server -n tcg-market"
echo "   kubectl logs -f deployment/tcg-market-client -n tcg-market"
echo ""
echo "🛑 Delete deployment:"
echo "   kubectl delete namespace tcg-market"
