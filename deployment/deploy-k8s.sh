#!/bin/bash

set -e

# --- Configuration ---
# NOTE: This script assumes you have a Kubernetes cluster with an Ingress controller
# (like NGINX) already set up. It also relies on locally built Docker images.
# For GKE, you would typically use a CI/CD pipeline to push images to GCR.

NAMESPACE="tcg-market"

# --- Pre-flight checks ---
check_kubernetes() {
    if ! command -v kubectl &> /dev/null; then
        echo "❌ kubectl is not installed. Please install it first."
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        echo "❌ Cannot connect to a Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
}

# --- Deployment Functions ---

deploy_service() {
    local service_name=$1
    local service_name_k8s="tcg-market-${service_name}"

    echo "--- 🐳 Building Docker image for $service_name ---"
    docker build -t "$service_name_k8s:latest" -f "$service_name/Dockerfile" "$service_name/"

    echo "--- 📦 Applying Kubernetes manifests for $service_name ---"
    # Here you would use templating (like Helm or Kustomize) to inject secrets
    kubectl apply -f "deployment/k8s/${service_name}-deployment.yaml"
    kubectl apply -f "deployment/k8s/${service_name}-service.yaml"

    echo "--- ⏳ Waiting for $service_name_k8s deployment to be ready ---"
    kubectl wait --for=condition=available --timeout=300s "deployment/$service_name_k8s" -n $NAMESPACE
    echo "✅ $service_name is ready."
}

deploy_all() {
    echo "--- 📦 Applying common Kubernetes manifests (namespace, configmap) ---"
    kubectl apply -f deployment/k8s/namespace.yaml
    # NOTE: In a real scenario, FIREBASE_SERVICE_ACCOUNT_JSON would be a Kubernetes secret, not a ConfigMap
    kubectl apply -f deployment/k8s/configmap.yaml

    deploy_service "server"
    deploy_service "worker"
    deploy_service "client"

    echo "--- 🌐 Applying Ingress ---"
    kubectl apply -f deployment/k8s/ingress.yaml

    echo "✅ All services deployed successfully!"
    echo "👉 You may need to update your /etc/hosts file or DNS to point 'tcg-market.local' to your Ingress controller's IP."
}

delete_all() {
    echo "--- 🗑️  Deleting all tcg-market resources from Kubernetes ---"
    kubectl delete namespace $NAMESPACE --ignore-not-found=true
    echo "✅ Namespace '$NAMESPACE' and all its resources have been deleted."
}

# --- Usage instructions ---
usage() {
    echo "Usage: $0 [all|server|worker|client|delete]"
    echo "  all       (default) Builds images and applies all k8s manifests."
    echo "  server    Builds and deploys only the server."
    echo "  worker    Builds and deploys only the worker."
    echo "  client    Builds and deploys only the client."
    echo "  delete    Deletes all tcg-market resources from the cluster."
    exit 1
}

# --- Main script execution ---

COMMAND=${1:-"all"}

echo "🚀 Managing Kubernetes deployment for TCG Market..."
check_kubernetes

case $COMMAND in
    "all")
        deploy_all
        ;;
    "server"|"worker"|"client")
        kubectl apply -f deployment/k8s/namespace.yaml
        kubectl apply -f deployment/k8s/configmap.yaml
        deploy_service "$COMMAND"
        if [ "$COMMAND" = "server" ] || [ "$COMMAND" = "client" ]; then
            echo "--- 🌐 Applying Ingress ---"
            kubectl apply -f deployment/k8s/ingress.yaml
        fi
        ;;
    "delete")
        delete_all
        ;;
    *)
        echo "❌ Invalid argument: $COMMAND"
        usage
        ;;
esac

echo "🎉 Kubernetes script finished for command '$COMMAND'."
