# Incident #4 — Redis Outage

## Incident Summary

**Incident:** Redis dependency outage  
**Affected Services:** `orders-api`, `inventory-api`  
**Severity:** SEV-2  
**Status:** Resolved  
**Root Cause:** Redis became unavailable while the Redis Kubernetes Service remained present but had no active endpoints.

---

## 1. Symptoms

The incident was identified through the observability stack.

Initial symptoms included:

- Inventory API business operation degraded.
- `orders-api` could not retrieve orders from Redis.
- Redis Service existed, but the Redis workload was unavailable.
- Application requests involving Redis experienced significant latency.
- Tempo showed a failed Redis operation taking approximately 5 seconds.

---

## 2. Initial Checks

Check the application workloads:

```bash
kubectl get pods -n observability

Check Redis specifically:

kubectl get pods -n observability -l app=redis

Check the Redis Service:

kubectl get svc redis -n observability

Check whether the Service has endpoints:

kubectl get endpoints redis -n observability
Key Finding

The Redis Service existed:

redis   ClusterIP   10.43.82.156   <none>   6379/TCP

but there were no Redis endpoints:

redis   <none>

This indicated that Kubernetes DNS and the Service existed, but there was no healthy Redis backend behind the Service.

3. Application-Level Investigation

Check the Orders API logs:

kubectl logs deployment/orders-api -n observability --tail=30

The application reported:

Redis Client Error Error: connect ECONNREFUSED 10.43.82.156:6379

This confirmed that orders-api was attempting to connect to the Redis Service IP but the connection was being refused.

The failure was therefore not caused by DNS resolution.

The application was resolving:

redis -> 10.43.82.156

but there was no Redis backend accepting connections on port 6379.

4. Kubernetes Dependency Verification

Verify the Redis Service:

kubectl get svc redis -n observability

Verify its endpoints:

kubectl get endpoints redis -n observability

If the result is:

ENDPOINTS   <none>

check the Redis workload:

kubectl get pods -n observability -l app=redis

Also check the Redis Deployment:

kubectl get deployment redis -n observability

Inspect events if necessary:

kubectl describe deployment redis -n observability
kubectl get events -n observability --sort-by=.lastTimestamp
5. Loki Investigation

Search the orders-api logs in Loki.

Look for:

ECONNREFUSED

and:

Redis Client Error

The application logs correlated with the Kubernetes state:

Redis Client Error
ECONNREFUSED 10.43.82.156:6379

This established that the Orders API failure was caused by an unavailable Redis dependency.

6. Tempo Investigation

Navigate to:

Grafana → Explore → Tempo

Search:

Service Name: orders-api
Span Name: GET /orders

Open a failed trace.

The dependency chain showed:

inventory-api
    GET /
        |
        v
orders-api
    GET /orders
        |
        v
redis-GET

The failed Redis span showed:

Span Name: redis-GET
Service: orders-api
Duration: ~5 seconds
Status: error
Kind: client
Operation: GET
Database: redis
Query: GET orders

This provided distributed-tracing evidence that the Redis dependency was responsible for the delay and failure.

7. Root Cause

The Redis workload became unavailable.

The Kubernetes Redis Service remained present:

redis
10.43.82.156:6379

but it had no endpoints:

ENDPOINTS: <none>

Consequently, orders-api attempted to connect to:

10.43.82.156:6379

and received:

ECONNREFUSED

The Redis client operation was represented in Tempo as:

redis-GET
Duration: ~5s
Status: error

The failure propagated through:

Redis
   ↓
orders-api
   ↓
inventory-api
8. Remediation

Restore the Redis workload.

Verify the Redis pod:

kubectl get pods -n observability -l app=redis

If the Redis Deployment exists but the pod is unavailable, inspect it:

kubectl describe deployment redis -n observability
kubectl describe pods -n observability -l app=redis

Restore/restart Redis using the appropriate Kubernetes Deployment or manifest.

For example:

kubectl rollout restart deployment/redis -n observability

Then wait for the rollout:

kubectl rollout status deployment/redis -n observability
9. Redis Health Verification

Verify the Redis pod:

kubectl get pods -n observability -l app=redis

Expected:

READY   1/1
STATUS  Running

Verify the Redis Service endpoints:

kubectl get endpoints redis -n observability

Expected:

redis   10.42.x.x:6379

Test Redis directly:

kubectl exec -n observability deployment/redis -- redis-cli ping

Expected:

PONG

Verify the orders stored in Redis:

kubectl exec -n observability deployment/redis -- redis-cli get orders

Expected:

[{"id":1,"item":"Laptop","quantity":2},{"id":2,"item":"Keyboard","quantity":1}]
10. Application Recovery Verification

Test the Inventory API:

curl -i http://localhost:8080/

Expected:

HTTP/1.1 200 OK

with the orders returned successfully.

Check Orders API logs:

kubectl logs deployment/orders-api -n observability --tail=30

Look for successful Redis connectivity and absence of connection errors.

11. Observability Recovery Verification
Prometheus

Check the Microservice Operations Dashboard.

Verify:

HTTP 5xx Error Rate returns to normal.
Request rate returns to normal.
P95 request latency returns to normal.
Service Availability remains healthy.
CPU and memory return to normal operating levels.

If a Redis-specific Prometheus query returns no data, do not treat the absence of the metric as evidence that Redis is healthy or unhealthy. Use Kubernetes state and application telemetry as the source of truth.

Loki

Verify that new orders-api logs no longer contain:

ECONNREFUSED

or:

Redis Client Error
Tempo

Search:

Service Name: orders-api
Span Name: GET /orders

A healthy trace should show:

orders-api GET /orders
    |
    └── redis-GET

with a short Redis duration and successful HTTP status.

During recovery, the observed successful trace showed:

orders-api: GET /orders
HTTP 200
Duration: ~9.54 ms

redis-GET
Duration: ~6 ms

This contrasted with the incident trace:

redis-GET
Duration: ~5 seconds
Status: error
12. Incident Timeline
Detection

Redis-dependent application behavior degraded.

Investigation

Kubernetes showed:

Redis Service: present
Redis endpoints: <none>
Application Evidence

Orders API reported:

ECONNREFUSED 10.43.82.156:6379
Distributed Trace Evidence

Tempo showed:

redis-GET
~5 seconds
Status: error
Root Cause Identified

Redis workload unavailable, leaving the Redis Service without endpoints.

Remediation

Redis workload restored.

Recovery

Redis returned:

PONG

The Redis Service regained an endpoint.

Orders API successfully retrieved orders.

Tempo showed:

redis-GET ~6 ms
HTTP 200
Resolution

Incident resolved.

13. Lessons Learned
A Kubernetes Service can exist and still have no usable backend.
Always check Service endpoints when investigating dependency failures.
ECONNREFUSED is different from DNS failure.
Distributed tracing can identify the exact dependency responsible for latency.
Loki provides application-level evidence that complements Kubernetes state.
Prometheus, Loki, and Tempo should be correlated rather than investigated independently.
A successful HTTP response does not necessarily mean the underlying business operation succeeded; application response semantics must also be examined.
Dependency health checks and alerting should be considered for critical services such as Redis.
14. Standard Investigation Checklist
# 1. Check workloads
kubectl get pods -n observability

# 2. Check Redis
kubectl get pods -n observability -l app=redis

# 3. Check Redis Service
kubectl get svc redis -n observability

# 4. Check Redis endpoints
kubectl get endpoints redis -n observability

# 5. Check Orders API logs
kubectl logs deployment/orders-api -n observability --tail=50

# 6. Test Redis
kubectl exec -n observability deployment/redis -- redis-cli ping

# 7. Test Redis data
kubectl exec -n observability deployment/redis -- redis-cli get orders

# 8. Test Inventory API
curl -i http://localhost:8080/

# 9. Check recent events
kubectl get events -n observability --sort-by=.lastTimestamp
15. Final Root Cause Statement

Redis became unavailable, leaving the redis Kubernetes Service with zero endpoints. The orders-api Redis client continued attempting GET orders operations, resulting in ECONNREFUSED and approximately five seconds of latency per failed Redis operation. The failure propagated through orders-api to inventory-api. Restoring Redis re-established the Service endpoint, returned successful Redis operations, and restored normal application behavior.

Incident #4: RESOLVED
