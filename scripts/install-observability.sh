#!/bin/bash

set -euo pipefail

echo "========================================"
echo "Installing Observability Platform"
echo "========================================"

echo
echo "[1/7] Adding Helm repositories..."

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null 2>&1 || true
helm repo add grafana https://grafana.github.io/helm-charts >/dev/null 2>&1 || true

echo
echo "[2/7] Updating Helm repositories..."
helm repo update

echo
echo "[3/7] Installing Prometheus Stack..."
bash scripts/install-prometheus.sh

echo
echo "[4/7] Installing Loki..."
bash scripts/install-loki.sh

echo
echo "[5/7] Installing Tempo..."
bash scripts/install-tempo.sh

echo
echo "[6/7] Installing OpenTelemetry Collector..."
bash scripts/install-otel-collector.sh

echo
echo "[7/7] Waiting for observability pods..."

kubectl wait \
    --for=condition=Ready \
    pods \
    --all \
    -n observability \
    --timeout=300s

echo
kubectl get pods -n observability

echo
echo "========================================"
echo "✅ Observability Platform Installed!"
echo "========================================"
