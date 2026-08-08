# Incident #2 – High Latency

## Severity

**P2 – High**

---

# Scenario

Users reported that the Inventory API was responding slowly. Requests completed successfully, but response times increased significantly while the service remained available.

---

# Symptoms

- Slow API responses
- Service remained available
- No HTTP 500 errors
- Kubernetes pods remained healthy

---

# Investigation

## 1. Grafana – Microservices Operations Dashboard

### Findings

- HTTP 5xx Error Rate: **0**
- P95 Request Latency increased from approximately **0.05 ms** to **~3 seconds**
- Request Rate remained stable
- Service Availability: **UP**
- CPU Usage remained low
- Memory Usage remained stable
- Event Loop Lag increased slightly
- Heap Usage increased slightly

### Conclusion

The application was healthy but processing requests much more slowly than normal.

---

## 2. Grafana – Cluster Operations Dashboard

### Findings

- Cluster CPU usage remained normal
- Cluster Memory usage remained normal
- Node CPU usage remained normal
- No abnormal resource consumption
- No resource-intensive pods observed

### Conclusion

The Kubernetes cluster was healthy.

The issue appeared to be isolated to the application rather than the infrastructure.

---

## 3. Kubernetes

Commands used:

```bash
kubectl get pods -n observability

kubectl top pods -n observability
```

### Findings

- Inventory API pod was Running
- No pod restarts
- CPU usage remained low
- Memory usage remained stable

### Conclusion

The application container was healthy.

No evidence suggested resource exhaustion.

---

## 4. Logs

Application logs were verified using:

```bash
kubectl logs deployment/inventory-api -n observability
```

Observed log sequence:

```
Incoming request from ...
Calling Orders API...
Orders API returned 2 orders
Response sent successfully
```

### Findings

- Requests completed successfully
- No application exceptions occurred
- No HTTP 500 errors were generated

### Observability Note

Application logs were available through Kubernetes but were not visible in Loki during this investigation. This represents an observability gap that should be investigated separately.

---

## 5. Distributed Tracing (Tempo)

Service:

```
inventory-api
```

Root span:

```
GET /
```

Total trace duration:

```
3.01 seconds
```

Child span:

```
orders-api GET /orders
```

Duration:

```
979 microseconds
```

### Findings

The Inventory API request handler consumed almost the entire request duration.

The downstream Orders API responded in less than one millisecond.

Tempo confirmed that the latency occurred before the downstream HTTP request was made.

---

# Root Cause

An artificial three-second delay had been introduced into the Inventory API request handler before calling the Orders API.

The delay increased end-to-end request latency while leaving CPU usage, memory usage, pod health, and downstream services unaffected.

---

# Resolution

Removed the artificial delay:

```javascript
await new Promise(resolve => setTimeout(resolve, 3000));
```

Rebuilt the container image.

Imported the updated image into K3s.

Updated the Kubernetes Deployment.

Waited for the rollout to complete successfully.

---

# Verification

After deployment:

- P95 latency returned to normal
- HTTP 5xx Error Rate remained zero
- Service Availability remained UP
- CPU usage remained normal
- Memory usage remained stable
- Tempo traces returned to normal durations
- Kubernetes reported healthy pods

The incident was successfully resolved.

---

# Lessons Learned

- Metrics quickly detected the increase in request latency.
- Cluster-level dashboards ruled out infrastructure resource issues.
- Kubernetes confirmed that the application remained healthy throughout the incident.
- Kubernetes logs verified successful request processing without application errors.
- Tempo precisely identified where request time was spent, allowing the downstream Orders API to be ruled out as the source of the latency.
- Distributed tracing is essential for diagnosing latency problems because it shows exactly where time is spent across services.
- A service can remain healthy and available while still providing a poor user experience due to increased latency.
- An observability gap was identified: application logs were available through Kubernetes but were not visible in Loki. This should be addressed to improve future incident investigations.

---

# Tools Used

- Grafana
- Prometheus
- Kubernetes
- Tempo
- kubectl
