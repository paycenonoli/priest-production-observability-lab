
#!/bin/bash

set -euo pipefail

echo "======================================="
echo "Verifying Observability Platform"
echo "======================================="

echo
echo "Nodes"
kubectl get nodes

echo
echo "Pods"
kubectl get pods -n observability

echo
echo "Services"
kubectl get svc -n observability

echo
echo "ServiceMonitors"
kubectl get servicemonitors -n observability

echo
echo "Ingress"
kubectl get ingress -n observability

echo
echo "======================================="
echo "Verification Complete"
echo "======================================="



































