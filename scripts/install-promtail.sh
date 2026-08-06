#!/bin/bash

set -e

helm upgrade --install promtail grafana/promtail \
  -n observability \
  -f observability/loki/promtail-values.yaml
