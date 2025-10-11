#!/bin/bash

set -e

echo "🗑️  Deleting tcg Market from Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install it first."
    exit 1
fi

# Delete the entire namespace (this will delete all resources)
kubectl delete namespace tcg-market

echo "✅ tcg Market deployment deleted successfully!"
