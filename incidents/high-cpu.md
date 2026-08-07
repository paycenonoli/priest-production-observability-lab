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

A controlled CPU stress test was executed using a Kubernetes Job to simulate a High CPU incident within the observability cluster.

The investigation followed a standard SRE workflow using Kubernetes, Prometheus, Grafana, Loki, and Tempo.

The root cause was identified as a CPU stress workload intentionally consuming approximately one CPU core.

No production application was impacted.

---

# Objectives

- Simulate a production High CPU incident.
- Investigate using observability tooling.
- Identify the root cause.
- Restore the cluster to a healthy state.
- Document the investigation.

---

# Symptoms

Observed alert:

- High CPU Usage

Initial observations:

- CPU usage increased significantly.
- Inventory API remained healthy.
- Orders API remained healthy.
- No customer-facing outage.

---

# Investigation

## Step 1 – Verify Pod Resource Usage

Command

```bash
kubectl top pods -n observability
```

Output

```text
cpu-stress-ptnzl          971m CPU
inventory-api               6m CPU
orders-api                  4m CPU
prometheus                 46m CPU
grafana                    10m CPU
```

### Finding

The cpu-stress Job was consuming approximately one full CPU core.

Inventory API CPU usage remained normal.

---

## Step 2 – Grafana Dashboard

Observed

### CPU

Dashboard CPU panel did not display the stress Job because it was scoped to the Inventory API.

### Memory

Memory usage remained stable.

### Service Availability

UP

### Request Rate

Stable.

### P95 Latency

0.0475 ms

### Finding

The application remained healthy despite increased node CPU utilization.

---

## Step 3 – Prometheus

Query

```promql
topk(
  5,
  rate(container_cpu_usage_seconds_total[1m])
)
```

Result

```text
cpu-stress-ptnzl
≈0.964 CPU
```

### Finding

Prometheus confirmed that the cpu-stress workload was consuming nearly one CPU core.

---

## Step 4 – Loki

Query

```logql
{namespace="observability", pod=~"cpu-stress.*"}
```

Result

No logs found.

### Finding

The stress utility does not continuously write to stdout/stderr.

No useful application logs were generated.

---

## Step 5 – Tempo

Search

Service Name

```
cpu-stress
```

Result

No traces.

### Finding

The workload was not instrumented with OpenTelemetry and did not process HTTP requests.

No distributed traces were expected.

---

# Root Cause

A Kubernetes Job named **cpu-stress** intentionally consumed approximately one CPU core.

The workload successfully simulated a High CPU incident without affecting application availability.

---

# Resolution

Delete the Job.

```bash
kubectl delete job cpu-stress -n observability
```

---

# Verification

Commands

```bash
kubectl get jobs -n observability
```

Expected

```text
No resources found.
```

Verify CPU returned to normal.

```bash
kubectl top pods -n observability
```

Result

Inventory API returned to normal CPU usage.

The cpu-stress workload was removed.

---

# Lessons Learned

- Metrics identified the resource bottleneck immediately.
- Prometheus confirmed CPU consumption quantitatively.
- Loki produced no logs because the workload emitted none.
- Tempo produced no traces because the workload was not instrumented.
- Not every incident produces metrics, logs, and traces simultaneously.
- Dashboard scope is important; the current CPU panel only tracks the Inventory API and should be expanded to include cluster-wide CPU usage.

---

# Improvements

Future dashboard enhancements:

- Cluster CPU Usage
- Top CPU-consuming Pods
- Top Memory-consuming Pods
- Node CPU Utilization
- Namespace Resource Usage

---

# Commands Used

```bash
kubectl apply -f cpu-stress-job.yaml

kubectl top pods -n observability

kubectl get jobs -n observability

kubectl get pods -n observability

kubectl describe pod cpu-stress-xxxxx -n observability

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
{namespace="observability", pod=~"cpu-stress.*"}
```

Tempo

```
Search:
cpu-stress
```

---

# Incident Outcome

| Item | Status |
|------|--------|
| Root Cause Identified | ✅ |
| Metrics Collected | ✅ |
| Logs Reviewed | ✅ |
| Traces Reviewed | ✅ |
| Incident Resolved | ✅ |
| Recovery Verified | ✅ |

---

# Conclusion

This incident successfully demonstrated a production-style High CPU investigation using Kubernetes, Prometheus, Grafana, Loki, and Tempo.

Although CPU utilization increased significantly due to a controlled stress workload, the Inventory API remained available and continued serving requests with stable latency.

The incident validated the observability platform and established a repeatable investigation workflow for future operational incidents.
