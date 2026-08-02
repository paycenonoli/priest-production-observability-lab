#!/bin/bash

set -e

echo "========================================"
echo "Installing Prometheus Stack"
echo "========================================"

helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
    --namespace observability \
    --version 77.11.0 \
    -f observability/prometheus/values.yaml

echo ""
echo "Waiting for Prometheus Stack to become ready..."

kubectl rollout status deployment/monitoring-grafana -n observability

echo ""
echo "Current Pods:"
kubectl get pods -n observability

echo ""
echo "Prometheus Stack installed successfully!"
