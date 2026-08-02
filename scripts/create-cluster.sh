#!/bin/bash

set -e

echo "Creating KIND cluster..."

kind create cluster --config kind-config.yaml

echo ""
echo "Creating observability namespace..."

kubectl create namespace observability || true

echo ""
kubectl get nodes
