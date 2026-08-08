# Incident #5 — High CPU / CPU Saturation

## Incident Summary

**Incident:** High CPU utilization on `inventory-api`
**Affected Service:** `inventory-api`
**Severity:** SEV-2
**Status:** Resolved
**Root Cause:** A runaway CPU-consuming process inside the `inventory-api` container caused sustained CPU saturation.

---

## 1. Incident Overview

The incident was deliberately introduced by running a CPU-intensive process inside the `inventory-api` container.

The service remained available during the incident, but the workload consumed approximately one full CPU core and caused node CPU utilization to increase significantly.

This represents an important production scenario:

> High CPU utilization can be an early warning condition even when the application is still returning successful HTTP responses.

---

## 2. Baseline

Before introducing the incident, the following baseline was observed.

### Inventory API

```text
CPU: approximately 6m
Memory: approximately 64Mi
Node
CPU: 427m
CPU utilization: 21%
Memory: 4015Mi
Memory utilization: 51%

The Kubernetes workloads were healthy and running normally.

3. Detection

The CPU spike was identified using Kubernetes resource metrics.

Check all pods:

kubectl top pods -n observability

Check the specific service:

kubectl top pod -n observability -l app=inventory-api

Check node utilization:

kubectl top node

During the incident, inventory-api increased from approximately:

6m

to approximately:

955m - 971m

The node increased from approximately:

21%

to approximately:

64% - 68%

This identified inventory-api as the primary CPU consumer.

4. Prometheus Investigation

The Inventory API CPU utilization was queried from Prometheus.

Example query:

rate(container_cpu_usage_seconds_total{
  namespace="observability",
  pod=~"inventory-api-.*",
  container="inventory-api"
}[5m])

The resulting graph showed a sharp increase from the normal baseline to sustained CPU consumption.

Node CPU was also queried:

100 * (
  1 - avg by (instance) (
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  )
)

The Prometheus data correlated with the Kubernetes kubectl top results.

5. Application Impact Investigation

The next question was whether the CPU spike had caused customer-facing impact.

Test the application:

curl -i http://localhost:8080/

The service continued returning:

HTTP/1.1 200 OK

The response was:

{
  "service": "inventory-api",
  "orders": []
}

The application logs also showed successful requests:

Calling Orders API...
Orders API returned 0 orders
Response sent successfully
GET / 200

Therefore, the service remained operational despite the high CPU condition.

6. Request Metrics

The Inventory API request metric was inspected:

http_request_duration_seconds_count{
  service="inventory-api"
}

The observed series included:

/health       200
/metrics      200
/             200
/favicon.ico  404
/             304

No HTTP 5xx series were observed during the incident.

The total request rate was approximately:

0.274 requests/second

P95 request latency was approximately:

0.048 seconds

or:

48 ms

This demonstrated that the CPU saturation had not yet resulted in significant application-level degradation.

7. Tempo Investigation

The incident was also investigated through Grafana Tempo.

Search for:

Service Name: inventory-api
Span Name: GET /

The trace showed the normal dependency chain:

inventory-api
    GET /
       |
       v
orders-api
    GET /orders
       |
       v
redis-GET

A representative trace during the CPU incident showed approximately:

inventory-api GET /     ~25.81 ms
orders-api GET /orders   ~2.85 ms
redis-GET                 ~1.18 ms

No dependency error was identified in the trace.

This confirmed that:

Orders API remained healthy.
Redis remained healthy.
The CPU problem was isolated to the Inventory API workload.
The CPU spike had not yet caused a dependency failure.
8. Loki Investigation

Check Inventory API logs:

kubectl logs deployment/inventory-api -n observability --tail=50

The logs continued to show successful requests:

GET /health 200
GET /metrics 200
Calling Orders API...
Orders API returned 0 orders
Response sent successfully
GET / 200

No evidence indicated an Orders API or Redis failure.

Loki therefore supported the conclusion that the application remained operational while CPU utilization was elevated.

9. Root Cause

The root cause was a runaway CPU-consuming process running inside the inventory-api container.

The process caused the container to consume approximately one full CPU core.

The CPU increase was isolated to the Inventory API workload and was not caused by:

Redis
Orders API
Loki
Tempo
Prometheus
Kubernetes control-plane components
10. Remediation

The CPU-consuming process could not be terminated directly using the application container's user because the process belonged to another user and returned:

kill: can't kill pid 18: Permission denied

Rather than attempting to manipulate the process manually, the affected Kubernetes workload was restarted.

Execute:

kubectl rollout restart deployment/inventory-api -n observability

Wait for the rollout:

kubectl rollout status deployment/inventory-api -n observability

The replacement pod became healthy:

inventory-api-579bfd5b75-lfs9j
READY: 1/1
STATUS: Running

The original pod terminated.

11. Recovery Verification

Verify the Inventory API pod:

kubectl get pods -n observability \
  -l app=inventory-api \
  -o wide

Verify CPU:

kubectl top pods -n observability | grep inventory-api

The new pod returned to approximately:

6m CPU

Verify node CPU:

kubectl top node

Node CPU returned to approximately:

357m
17%

This was consistent with the original healthy baseline.

12. Application Recovery

Test the application:

curl -i http://localhost:8080/

The first request during the pod transition returned:

curl: (52) Empty reply from server

This occurred while the old pod was terminating and the replacement pod was becoming ready.

A subsequent request returned successfully:

HTTP/1.1 200 OK

with:

{
  "service": "inventory-api",
  "orders": []
}

The transient empty response was therefore treated as part of the Kubernetes pod transition rather than the root cause of the incident.

13. Final State

Final CPU state:

inventory-api: approximately 6m
node: approximately 357m / 17%

Final application state:

HTTP 200 OK

Final Kubernetes state:

inventory-api pod: 1/1 Running

The CPU-consuming process was eliminated when the original pod was terminated.

14. Incident Timeline
Detection

Inventory API CPU increased dramatically.

6m → ~955-971m
Scope

Node CPU increased:

21% → ~64-68%
Application Investigation

Inventory API continued returning:

HTTP 200

No HTTP 5xx errors were observed.

Prometheus Investigation

Prometheus confirmed sustained CPU consumption by the Inventory API.

Loki Investigation

Application logs continued showing successful requests.

Tempo Investigation

Distributed traces showed healthy calls through:

inventory-api
    ↓
orders-api
    ↓
Redis

No dependency errors were observed.

Root Cause

Runaway CPU-consuming process inside the Inventory API container.

Remediation

Restarted the Inventory API Deployment:

kubectl rollout restart deployment/inventory-api -n observability
Recovery

Inventory API CPU returned to:

~6m

Node CPU returned to:

~17%

Application returned:

HTTP 200 OK
Resolution

Incident resolved.

15. Lessons Learned
High CPU utilization does not necessarily mean the application is already failing.
CPU saturation can be an early warning signal before HTTP errors appear.
kubectl top is useful for quickly identifying the workload consuming node resources.
Prometheus provides historical and time-series evidence of CPU saturation.
Loki can confirm whether the application is still processing requests successfully.
Tempo can determine whether downstream dependencies are contributing to the problem.
A healthy trace does not invalidate a CPU incident; it can demonstrate that the problem is isolated to resource consumption.
When a runaway process cannot be safely terminated from the application container, restarting the affected Kubernetes workload is an appropriate remediation.
Recovery should be verified at multiple levels: Kubernetes, resource utilization, application response, and observability telemetry.
A transient connection failure during a rolling restart should be distinguished from the original incident.
16. Standard Investigation Checklist
# 1. Check all workloads
kubectl get pods -n observability

# 2. Check pod resource usage
kubectl top pods -n observability

# 3. Check node resource usage
kubectl top node

# 4. Identify Inventory API pod
kubectl get pods -n observability -l app=inventory-api

# 5. Check Inventory API logs
kubectl logs deployment/inventory-api -n observability --tail=50

# 6. Test the application
curl -i http://localhost:8080/

# 7. Check Inventory API CPU in Prometheus
# rate(container_cpu_usage_seconds_total{...}[5m])

# 8. Check request metrics
# http_request_duration_seconds_count{service="inventory-api"}

# 9. Investigate traces in Tempo
# Service: inventory-api
# Span: GET /

# 10. Restart workload if runaway process cannot be safely terminated
kubectl rollout restart deployment/inventory-api -n observability

# 11. Verify rollout
kubectl rollout status deployment/inventory-api -n observability

# 12. Verify CPU recovery
kubectl top pods -n observability
kubectl top node

# 13. Verify application recovery
curl -i http://localhost:8080/
17. Final Root Cause Statement

A runaway CPU-consuming process inside the inventory-api container caused sustained CPU saturation, increasing container CPU utilization from approximately 6m to approximately 955-971m and node CPU utilization from approximately 21% to approximately 64-68%. The application remained available and continued returning HTTP 200 responses, with no observed HTTP 5xx errors or downstream dependency failures. The affected Deployment was restarted, terminating the runaway process. The replacement pod returned to approximately 6m CPU and node utilization returned to approximately 17%, confirming recovery.

Incident #5: RESOLVED
