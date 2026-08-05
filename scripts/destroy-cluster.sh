#!/bin/bash

set -euo pipefail

CLUSTER_NAME="observability"

echo "======================================="
echo "Destroying KIND Cluster"
echo "======================================="

kind delete cluster --name "${CLUSTER_NAME}"

echo
echo "✅ Cluster deleted successfully."
