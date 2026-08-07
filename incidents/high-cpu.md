# Incident #1 – High CPU Usage

## Incident Summary

| Item | Value |
|------|-------|
| Incident ID | INC-001 |
| Severity | P2 |
| Status | Resolved |
| Environment | Kubernetes (K3s) |
| Namespace | observability |
| Date | 2026-08-07 |

---

# Executive Summary

A controlled CPU stress workload was deployed into the Kubernetes cluster to simulate a High CPU production incident.

The investigation leveraged Grafana, Prometheus, Kubernetes, Loki, and Tempo to determine whether the issue originated from the application or the underlying infrastructure.

The investigation concluded that a Kubernetes Job (`cpu-stress`) intentionally consumed nearly one CPU core without degrading application performance.

---

# Incident Timeline

| Time | Event |
|------|-------|
| T0 | CPU stress Job deployed |
| T+1 min | Cluster CPU alert triggered |
| T+2 min | Grafana dashboard reviewed |
| T+4 min | Prometheus confirmed CPU consumer |
| T+6 min | Kubernetes inspection performed |
| T+8 min | Loki logs reviewed |
| T+10 min | Tempo traces reviewed |
| T+12 min | Root cause identified |
| T+14 min | CPU stress Job removed |
| T+16 min | Recovery verified |

---

# Investigation

---

## Step 1 – Dashboard Review (Grafana)

### Observations

| Metric | Observation |
|---------|-------------|
| Cluster CPU | Increased significantly |
| Inventory API CPU | Remained low |
| Cluster Memory | Stable |
| Inventory API Memory | Stable |
| P95 Latency | Stable |
| Request Rate | Stable |
| Service Availability | UP |
| Event Loop Lag | Normal |

### Interpretation

The cluster experienced high CPU utilization, but no evidence suggested application degradation.

---

## Step 2 – Prometheus Investigation

### Query

```promql
topk(
  5,
  rate(container_cpu_usage_seconds_total[1m])
)
```

### Result

```
cpu-stress-ptnzl
≈0.964 CPU
```

### Interpretation

One workload was consuming nearly an entire CPU core.

---

## Step 3 – Kubernetes Investigation

### Commands

```bash
kubectl top pods -n observability
```

```
cpu-stress        971m
inventory-api       6m
orders-api          5m
```

```bash
kubectl get pods -n observability
```

```bash
kubectl describe pod cpu-stress-xxxxx
```

### Findings

- Job running normally
- No CrashLoopBackOff
- No image pull issues
- No scheduling failures
- Resource consumption consistent with the stress workload

### Interpretation

The Kubernetes control plane was healthy.

The CPU consumption originated from the cpu-stress Job.

---

## Step 4 – Log Investigation (Loki)

### Query

```logql
{namespace="observability", pod=~"inventory-api.*"}
```

### Additional Query

```logql
{namespace="observability", pod=~"cpu-stress.*"}
```

### Findings

Inventory API logs showed successful requests.

```
GET /health 200
GET /metrics 200
GET /inventory 200
```

No stack traces.

No exceptions.

No HTTP 500 responses.

No logs were produced by the cpu-stress Job because the stress utility does not continuously write to stdout or stderr.

### Interpretation

The application continued processing requests normally.

No application errors were associated with the CPU spike.

---

## Step 5 – Trace Investigation (Tempo)

### Service Examined

```
inventory-api
```

### Findings

Recent traces completed successfully.

Observed characteristics:

- Normal span durations
- No failed spans
- No retries
- No downstream dependency delays

No traces existed for the cpu-stress Job because it was not instrumented with OpenTelemetry and did not process HTTP requests.

### Interpretation

Application request processing remained healthy.

The CPU increase did not affect request execution time.

---

# Correlation

| Tool | Observation |
|------|-------------|
| Grafana | High cluster CPU |
| Prometheus | cpu-stress consuming ~0.96 CPU |
| kubectl | cpu-stress using ~971m CPU |
| Loki | No application errors |
| Tempo | Request latency remained normal |

---

# Root Cause

A Kubernetes Job named **cpu-stress** intentionally consumed nearly one CPU core.

The workload created infrastructure resource pressure but did not impact application performance.

---

# Resolution

Deleted the stress Job.

```bash
kubectl delete job cpu-stress -n observability
```

---

# Verification

Repeated investigation after mitigation.

### Grafana

- CPU returned to baseline.
- Memory unchanged.
- Availability remained UP.

### Prometheus

CPU usage normalized.

### Kubernetes

```
kubectl top pods
```

No abnormal CPU consumers remained.

### Loki

No application errors observed.

### Tempo

Request durations remained normal.

---

# Lessons Learned

# Lessons Learned

- Metrics are typically the fastest way to detect infrastructure resource issues.
- Prometheus precisely identified the workload responsible for high CPU consumption.
- Kubernetes confirmed the workload was healthy and behaving as configured.
- Loki confirmed that the application continued processing requests without errors.
- Tempo confirmed that request processing latency remained normal despite the CPU spike.
- Correlating metrics, logs, traces, and Kubernetes state provides higher confidence when determining whether an incident is infrastructure-related or application-related.
- Dashboard scope matters. A dashboard focused solely on application metrics may not immediately expose cluster-wide resource issues. Adding a Cluster Operations Dashboard improves visibility during infrastructure incidents.

---

# Commands Used

```bash
kubectl top pods -n observability

kubectl get pods -n observability

kubectl describe pod cpu-stress-xxxxx

kubectl delete job cpu-stress -n observability
```

Prometheus

```promql
topk(
  5,
  rate(container_cpu_usage_seconds_total[1m])
)
```

Loki

```logql
{namespace="observability", pod=~"inventory-api.*"}

{namespace="observability", pod=~"cpu-stress.*"}
```

Tempo

```
Search Service

inventory-api
```

---

# Incident Outcome

| Item | Status |
|------|--------|
| Alert Detected | ✅ |
| Metrics Reviewed | ✅ |
| Prometheus Investigation | ✅ |
| Kubernetes Investigation | ✅ |
| Logs Reviewed | ✅ |
| Traces Reviewed | ✅ |
| Root Cause Identified | ✅ |
| Mitigation Applied | ✅ |
| Recovery Verified | ✅ |

---

# Conclusion

The High CPU incident originated from an intentionally deployed Kubernetes stress workload.

Although cluster CPU utilization increased significantly, application health remained unaffected. Metrics identified the resource bottleneck, while logs and traces confirmed that the Inventory API continued serving requests normally throughout the incident.

The investigation demonstrated the value of correlating metrics, Kubernetes state, logs, and traces to distinguish infrastructure resource pressure from application failures.
