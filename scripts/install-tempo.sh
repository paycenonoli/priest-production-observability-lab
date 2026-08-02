#!/bin/bash

set -e

echo "========================================"
echo "Installing Tempo"
echo "========================================"

helm upgrade --install tempo grafana/tempo \
    --namespace observability \
    --version 1.23.2 \
    -f observability/tempo/values.yaml

echo ""
echo "Waiting for Tempo..."

kubectl rollout status statefulset/tempo -n observability

echo ""
kubectl get pods -n observability | grep tempo

echo ""
echo "Tempo installed successfully!"
