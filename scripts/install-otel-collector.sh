#!/bin/bash

set -e

echo "========================================"
echo "Installing OpenTelemetry Collector"
echo "========================================"

kubectl apply -f ~/priest-production-observability-lab/observability/otel-collector

echo ""
echo "Waiting for Collector..."

kubectl rollout status deployment/otel-collector -n observability

echo ""
kubectl get pods -n observability | grep otel

echo ""
echo "Collector installed successfully!"
