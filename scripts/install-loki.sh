#!/bin/bash

set -e

echo "========================================"
echo "Installing Loki"
echo "========================================"

helm upgrade --install loki grafana/loki \
    --namespace observability \
    --version 6.55.0 \
    -f observability/loki/values.yaml

echo ""
echo "Waiting for Loki..."

kubectl rollout status statefulset/loki -n observability

echo ""
kubectl get pods -n observability | grep loki

echo ""
echo "Loki installed successfully!"
