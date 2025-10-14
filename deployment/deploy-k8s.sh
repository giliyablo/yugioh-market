#!/bin/bash

set -e

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

# Deploys a single service (builds image, applies manifests)
deploy_service() {
    local service_name=$1 # e.g., "server"
    local service_name_k8s="tcg-market-${service_name}" # e.g., "tcg-market-server"

    echo "--- 🐳 Building Docker image for $service_name ---"
    # Ensure Docker daemon is running, this command assumes a local docker build environment
    docker build -t "$service_name_k8s:latest" -f "$service_name/Dockerfile" "$service_name/"

    echo "--- 📦 Applying Kubernetes manifests for $service_name ---"
    kubectl apply -f "deployment/k8s/${service_name}-deployment.yaml"
    kubectl apply -f "deployment/k8s/${service_name}-service.yaml"

    echo "--- ⏳ Waiting for $service_name_k8s deployment to be ready ---"
    kubectl wait --for=condition=available --timeout=300s "deployment/$service_name_k8s" -n tcg-market
    echo "✅ $service_name is ready."
}

# Deploys all services
deploy_all() {
    echo "--- 📦 Applying common Kubernetes manifests (namespace, configmap) ---"
    kubectl apply -f deployment/k8s/namespace.yaml
    kubectl apply -f deployment/k8s/configmap.yaml

    deploy_service "server"
    deploy_service "worker"
    deploy_service "client"

    echo "--- 🌐 Applying Ingress ---"
    kubectl apply -f deployment/k8s/ingress.yaml

    echo "✅ All services deployed successfully!"
}

# Deletes all resources in the namespace
delete_all() {
    echo "--- 🗑️  Deleting all tcg-market resources from Kubernetes ---"
    # --ignore-not-found=true prevents an error if the namespace doesn't exist
    kubectl delete namespace tcg-market --ignore-not-found=true
    echo "✅ Namespace 'tcg-market' and all its resources have been deleted."
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

echo "🚀 Managing Kubernetes deployment for tcg Market..."
check_kubernetes

case $COMMAND in
    "all")
        deploy_all
        ;;
    "server"|"worker"|"client")
        # For individual deployments, ensure namespace and configmap exist first
        kubectl apply -f deployment/k8s/namespace.yaml
        kubectl apply -f deployment/k8s/configmap.yaml
        deploy_service "$COMMAND"
        # Re-apply ingress if we are touching client or server
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
