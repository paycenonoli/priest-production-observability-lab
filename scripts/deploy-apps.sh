#!/bin/bash

set -euo pipefail

echo "======================================="
echo "Deploying Applications"
echo "======================================="

kubectl apply -f k8s/inventory-api/

echo
echo "Waiting for inventory-api deployment..."

kubectl rollout status deployment/inventory-api \
    -n observability \
    --timeout=180s

echo
kubectl get pods -n observability

echo
echo "✅ Applications deployed successfully."
