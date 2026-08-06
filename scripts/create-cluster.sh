#!/bin/bash

set -euo pipefail

CLUSTER_NAME="observability"

echo "======================================="
echo "Creating KIND Observability Cluster"
echo "======================================="

echo
echo "[1/5] Deleting any existing cluster..."
kind delete cluster --name "${CLUSTER_NAME}" >/dev/null 2>&1 || true

echo
echo "[2/5] Creating KIND cluster..."
kind create cluster --name "${CLUSTER_NAME}" --config kind-config.yaml

echo
echo "[3/5] Waiting for nodes to become Ready..."
kubectl wait \
  --for=condition=Ready \
  nodes \
  --all \
  --timeout=180s

echo
echo "[4/5] Creating observability namespace..."
kubectl create namespace observability \
  --dry-run=client \
  -o yaml | kubectl apply -f -

echo
echo "[5/5] Cluster status"
kubectl get nodes -o wide

echo
echo "✅ KIND cluster '${CLUSTER_NAME}' is ready."
ku
