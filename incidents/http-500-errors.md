# Incident #3 – HTTP 500 Errors

## Incident Summary

The Inventory API began returning HTTP 500 errors for business requests.

The Inventory API pod remained healthy and Kubernetes reported the workload as Running. The failure was caused by an incorrect downstream service hostname configured in the Inventory API.

## Severity

Medium

## Impact

Approximately 94% of Inventory API business requests were returning HTTP 500 errors.

The Inventory API itself remained available, including its health endpoint.

## Detection

The incident was detected through the Microservice Operations Dashboard.

Observed:

- HTTP 5xx Error Rate: ~4.35 req/sec
- Request Rate: ~4.55 req/sec
- Approximately 94% of requests failing
- Service Availability: UP
- CPU usage: normal
- Memory usage: normal
- P95 latency: normal

The incident demonstrated that a service can remain technically available while its business functionality is failing.

## Investigation

### 1. Grafana

The Microservice Operations Dashboard showed a significant increase in HTTP 5xx responses.

The service remained marked as UP because the health endpoint continued returning HTTP 200.

### 2. Prometheus

The following PromQL query confirmed the 5xx rate:

```promql
sum(rate(http_request_duration_seconds_count{service="inventory-api",status_code=~"5.."}[5m]))

Result:

4.35 req/sec

Total request rate:

sum(rate(http_request_duration_seconds_count{service="inventory-api"}[5m]))

Result:

4.62 req/sec

This indicated that approximately 94% of Inventory API requests were failing.

3. Kubernetes

The Inventory API was healthy:

inventory-api     1/1 Running

The Orders API was also healthy:

orders-api        1/1 Running

The Orders API Service existed:

orders-api   ClusterIP   10.43.8.167   8081/TCP

Its endpoint was healthy:

10.42.0.70:8081

Therefore, the downstream Orders API itself was not the problem.

4. Application Logs

The Inventory API logs revealed:

TypeError: fetch failed

with the underlying error:

code: 'ENOTFOUND'
hostname: 'orders-apix'

This identified a DNS resolution failure.

The application was attempting to reach:

orders-apix

while the actual Kubernetes Service was:

orders-api
5. Loki

The corresponding application logs were not returned from Loki.

This was documented as a logging/query limitation during the incident.

The application logs obtained through Kubernetes were sufficient to identify the root cause.

6. Tempo

Tempo confirmed the failed request path.

The trace for:

inventory-api: GET /

showed the request entering the Inventory API and failing during the downstream connection/DNS lookup.

The trace contained failed spans associated with:

tcp.connect
GET
dns.lookup

This corroborated the application log evidence.

Root Cause

The Inventory API contained an incorrect downstream hostname:

orders-apix

The correct Kubernetes Service name was:

orders-api

Because orders-apix could not be resolved by Kubernetes DNS, the fetch() call failed.

The application caught the exception and returned HTTP 500:

{
  "error": "Unable to reach Orders API"
}
Remediation

The incorrect hostname was changed from:

http://orders-apix:8081/orders

to:

http://orders-api:8081/orders

A new Inventory API image was built and deployed.

The deployment was rolled out successfully.

Verification

After remediation:

Inventory API returned HTTP 200.
Orders API requests succeeded.
Inventory API logs showed successful Orders API responses.
HTTP 5xx errors returned to normal.
Service functionality was restored.

Example successful log sequence:

Calling Orders API...
Orders API returned 2 orders
Response sent successfully
GET / 200
Lessons Learned
A Kubernetes pod being Running does not mean the application is functioning correctly.
Health endpoints can remain healthy while business endpoints return errors.
Prometheus quickly quantified the scope of the failure.
Kubernetes confirmed that both application workloads were healthy.
Application logs identified the exact DNS failure and incorrect hostname.
Tempo provided distributed request evidence supporting the log findings.
Loki should be investigated separately because the expected application logs were not available through the Loki query.
Service-name/DNS configuration is a critical dependency in Kubernetes microservices.
Correlating metrics, Kubernetes state, logs, and traces provides much higher confidence when determining root cause.
