#!/bin/bash

set -e

echo "========================================"
echo "Installing Observability Platform"
echo "========================================"

echo ""
echo "Adding Helm repositories..."

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts || true
helm repo add grafana https://grafana.github.io/helm-charts || true

echo ""
echo "Updating Helm repositories..."

helm repo update

echo ""
echo "Installing Prometheus Stack..."
bash scripts/install-prometheus.sh

echo ""
echo "Installing Loki..."
bash scripts/install-loki.sh

echo ""
echo "Installing Tempo..."
bash scripts/install-tempo.sh

echo ""
echo "Installing OpenTelemetry Collector..."
bash scripts/install-otel-collector.sh

echo ""
echo "========================================"
echo "Observability Platform Installed!"
echo "========================================"
