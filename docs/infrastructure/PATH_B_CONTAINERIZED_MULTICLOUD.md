<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-05-20 -->
# PATH B: CONTAINERIZED MULTI-CLOUD

## Verification Status Legend

> VERIFIED — Confirmed by implementation or repo evidence in this snapshot.
> PROPOSED — Architecturally supported and documented, but not verified in this snapshot.
> ARCHITECTURALLY POSSIBLE / UNVERIFIED — Compatible by design, but not yet verified in this snapshot.
> All listed providers remain valid portability targets; none are deprecated by this legend.

## Canonical Provider Portability Status

| Provider | Status |
|---|---|
| Cloudflare | VERIFIED |
| Supabase | VERIFIED |
| Temporal | VERIFIED |
| Vite | VERIFIED |
| AWS | PROPOSED |
| Azure | PROPOSED |
| GCP | PROPOSED |
| On-prem | ARCHITECTURALLY POSSIBLE / UNVERIFIED |

See `docs/architecture/CANONICAL_TRUTH_MATRIX.md` for the authoritative claim taxonomy.

**Alternative Implementation for OmniHub/TradeLine/APEX**

**Status:** ⚠️ **ALTERNATIVE** (Maximum portability, higher complexity)

---

## OVERVIEW

**Strategy:** Migrate to containerized architecture with Kubernetes for true cloud-agnostic portability and maximum control.

**Why This Path?**
- ✅ **Provider portability design:** AWS, GCP, and Azure are PROPOSED targets; on-premises is ARCHITECTURALLY POSSIBLE / UNVERIFIED until live deployment evidence is cited
- ✅ **Maximum Control:** Custom runtimes, fine-grained resource allocation
- ✅ **No Vendor Lock-In:** Can migrate between clouds with Terraform changes only
- ✅ **Enterprise-oriented design:** Compliance, on-prem, and air-gapped deployment paths require customer-specific validation
- ✅ **Unlimited Scale:** No platform limits, scales to billions of users

**When to Choose This Path:**
- Need active-active multi-cloud (not just DR)
- Regulatory requirement for on-premises deployment
- User base > 5M users (serverless limits reached)
- Need custom runtimes or compute requirements beyond serverless
- Enterprise customers require self-hosted option

**Trade-Offs:**
- ❌ **Slower Time-to-Market:** 3-6 months implementation vs 6 weeks
- ❌ **Higher Costs:** $1000-2000/month minimum (Kubernetes cluster overhead)
- ❌ **Operational Overhead:** Need Kubernetes expertise, SRE team
- ❌ **Migration Risk:** Requires rewriting edge functions, testing migration

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│ CLOUDFLARE / CLOUD CDN (Edge Layer)                         │
│ - Global anycast                                            │
│ - DDoS protection, WAF                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ KUBERNETES CLUSTER (GKE / EKS / AKS / On-Prem)              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ INGRESS CONTROLLER (NGINX / Istio / Envoy)            │ │
│  │ - TLS termination, routing, rate limiting             │ │
│  └───────────────────┬────────────────────────────────────┘ │
│                      │                                       │
│        ┌─────────────┴──────────────┐                       │
│        │                            │                       │
│        ▼                            ▼                       │
│  ┌──────────────┐          ┌─────────────────┐             │
│  │ FRONTEND     │          │ API GATEWAY     │             │
│  │ (NGINX)      │          │ (Node.js)       │             │
│  │ - Static SPA │          │ - Auth/authz    │             │
│  │ - CDN origin │          │ - Rate limiting │             │
│  └──────────────┘          │ - Audit logging │             │
│                            └────────┬────────┘             │
│                                     │                       │
│                       ┌─────────────┴─────────────┐         │
│                       │                           │         │
│                       ▼                           ▼         │
│              ┌──────────────────┐      ┌──────────────────┐ │
│              │ ORCHESTRATOR     │      │ READ API         │ │
│              │ (Node.js/Python) │      │ (Node.js)        │ │
│              │ - Intent parsing │      │ - Query service  │ │
│              │ - Workflow mgmt  │      │                  │ │
│              └────────┬─────────┘      └──────────────────┘ │
│                       │                                     │
│                       ▼                                     │
│              ┌──────────────────┐                          │
│              │ MESSAGE QUEUE    │                          │
│              │ (RabbitMQ/NATS)  │                          │
│              └────────┬─────────┘                          │
│                       │                                     │
│                       ▼                                     │
│              ┌──────────────────────────────┐              │
│              │ EXECUTOR POOL                │              │
│              │ (Kubernetes Jobs)            │              │
│              │ - Isolated containers        │              │
│              │ - Auto-scaling (HPA)         │              │
│              │ - Network policies (no egress)│             │
│              └──────────────────────────────┘              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ DATA LAYER (Managed or Self-Hosted)                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ PostgreSQL   │  │ Redis        │  │ Secrets Manager  │  │
│  │ (Cloud SQL/  │  │ (ElastiCache/│  │ (Vault)          │  │
│  │  RDS/Azure)  │  │  Memorystore)│  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ OBSERVABILITY LAYER                                          │
│  - Prometheus (metrics)                                      │
│  - Loki (logs)                                               │
│  - Tempo (traces)                                            │
│  - Grafana (dashboards)                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## COMPONENT MAPPING

| Abstract Component | Containerized Implementation |
|--------------------|------------------------------|
| **Edge / CDN** | Cloudflare or Cloud CDN |
| **API Gateway** | Node.js app on K8s (Kong, Envoy, or custom) |
| **Orchestrator** | Node.js/Python app on K8s (Deployment) |
| **Executor Pool** | Kubernetes Jobs (ephemeral containers) |
| **Event Bus** | RabbitMQ, NATS, or Kafka on K8s |
| **Primary Database** | Cloud SQL / RDS / Azure Database (managed) OR CockroachDB (self-hosted multi-cloud) |
| **Cache** | Redis (ElastiCache / Memorystore / self-hosted) |
| **Secrets Manager** | HashiCorp Vault on K8s |
| **Blob Storage** | S3 / Cloud Storage / Azure Blob |
| **Observability** | Prometheus + Grafana + Loki + Tempo (all on K8s) |

---

## KUBERNETES ARCHITECTURE

### Namespaces

```yaml
# Namespace isolation for security + resource management
namespaces:
  - omnihub-prod         # Production workloads
  - omnihub-staging      # Staging workloads
  - omnihub-system       # Infrastructure (ingress, monitoring)
  - omnihub-data         # Databases, stateful workloads
```

### Network Policies (Zero Trust)

```yaml
# Default deny all traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: omnihub-prod
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

---
# API Gateway → Orchestrator (allowed)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-gateway-to-orchestrator
  namespace: omnihub-prod
spec:
  podSelector:
    matchLabels:
      app: orchestrator
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 3000

---
# Executors → Database (allowed via sidecar proxy)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: executors-to-database
  namespace: omnihub-prod
spec:
  podSelector:
    matchLabels:
      app: executor
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: omnihub-data
      ports:
        - protocol: TCP
          port: 5432  # PostgreSQL

---
# Executors → NO INTERNET (deny all other egress)
# Already covered by default-deny-all
```

### Pod Security Policies

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

---

## SERVICE DEFINITIONS (KUBERNETES YAML)

### API Gateway Deployment

**File:** `k8s/api-gateway/deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: omnihub-prod
  labels:
    app: api-gateway
    version: v1.2.3
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1.2.3
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      serviceAccountName: api-gateway
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: api-gateway
          image: gcr.io/omnihub/api-gateway:v1.2.3
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http
            - containerPort: 9090
              name: metrics
          env:
            - name: NODE_ENV
              value: "production"
            - name: POSTGRES_HOST
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: host
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: password
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/deep
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 5
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: omnihub-prod
spec:
  selector:
    app: api-gateway
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: omnihub-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Executor Job Template

**File:** `k8s/executors/job-template.yaml`
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: executor-{{WORKFLOW_ID}}
  namespace: omnihub-prod
  labels:
    app: executor
    workflow-id: {{WORKFLOW_ID}}
spec:
  ttlSecondsAfterFinished: 3600  # Auto-cleanup after 1 hour
  backoffLimit: 3
  template:
    metadata:
      labels:
        app: executor
        workflow-id: {{WORKFLOW_ID}}
    spec:
      restartPolicy: OnFailure
      serviceAccountName: executor-restricted
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: executor
          image: gcr.io/omnihub/executor:v1.2.3
          command: ["/app/executor"]
          args:
            - "--workflow-id={{WORKFLOW_ID}}"
            - "--action={{ACTION}}"
          env:
            - name: TRACE_ID
              value: "{{TRACE_ID}}"
            - name: IDEMPOTENCY_KEY
              value: "{{IDEMPOTENCY_KEY}}"
            - name: POSTGRES_HOST
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: host
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
```

---

## TERRAFORM STRUCTURE

### Directory Layout
```
terraform/
├── modules/
│   ├── kubernetes-cluster/
│   │   ├── aws-eks/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── gcp-gke/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── azure-aks/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
│   ├── database/
│   │   ├── aws-rds/
│   │   ├── gcp-cloudsql/
│   │   ├── azure-database/
│   │   └── cockroachdb/  # Multi-cloud option
│   ├── redis/
│   │   ├── aws-elasticache/
│   │   ├── gcp-memorystore/
│   │   └── self-hosted/
│   └── vault/
│       └── kubernetes/
├── environments/
│   ├── staging/
│   │   ├── aws/
│   │   │   ├── main.tf
│   │   │   └── terraform.tfvars
│   │   ├── gcp/
│   │   └── azure/
│   └── production/
│       ├── aws/
│       ├── gcp/
│       └── azure/
└── helm-charts/
    ├── omnihub-api-gateway/
    ├── omnihub-orchestrator/
    └── omnihub-infrastructure/
```

### Example: GKE Cluster Module

**File:** `terraform/modules/kubernetes-cluster/gcp-gke/main.tf`
```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

resource "google_container_cluster" "omnihub" {
  name     = var.cluster_name
  location = var.region

  # We can't create a cluster with no node pool, so we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1

  # Network configuration
  network    = var.vpc_network
  subnetwork = var.vpc_subnetwork

  # Master authorized networks (restrict API access)
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = var.authorized_cidr
      display_name = "Operator network"
    }
  }

  # Private cluster (nodes have no public IPs)
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Workload identity (secure service account access)
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Binary authorization (enforce signed images only)
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Security hardening
  security_posture_config {
    mode               = "ENTERPRISE"
    vulnerability_mode = "VULNERABILITY_ENTERPRISE"
  }

  # Logging & monitoring
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
    managed_prometheus {
      enabled = true
    }
  }

  # Maintenance window (Sunday 2-6 AM UTC)
  maintenance_policy {
    daily_maintenance_window {
      start_time = "02:00"
    }
  }
}

# Node pool for system workloads (monitoring, ingress, etc.)
resource "google_container_node_pool" "system" {
  name       = "system-pool"
  location   = var.region
  cluster    = google_container_cluster.omnihub.name
  node_count = 2

  autoscaling {
    min_node_count = 2
    max_node_count = 5
  }

  node_config {
    preemptible  = false
    machine_type = "e2-standard-2"

    labels = {
      pool = "system"
    }

    taint {
      key    = "workload-type"
      value  = "system"
      effect = "NO_SCHEDULE"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# Node pool for application workloads
resource "google_container_node_pool" "application" {
  name       = "application-pool"
  location   = var.region
  cluster    = google_container_cluster.omnihub.name
  node_count = 3

  autoscaling {
    min_node_count = 3
    max_node_count = 20
  }

  node_config {
    preemptible  = false
    machine_type = "e2-standard-4"

    labels = {
      pool = "application"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# Node pool for executor workloads (batch jobs, isolated)
resource "google_container_node_pool" "executors" {
  name       = "executor-pool"
  location   = var.region
  cluster    = google_container_cluster.omnihub.name
  node_count = 1

  autoscaling {
    min_node_count = 1
    max_node_count = 50  # Can scale high for burst workloads
  }

  node_config {
    preemptible  = true  # Cost savings (executors are stateless, can tolerate preemption)
    machine_type = "e2-standard-2"

    labels = {
      pool = "executor"
    }

    taint {
      key    = "workload-type"
      value  = "executor"
      effect = "NO_SCHEDULE"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

output "cluster_name" {
  value = google_container_cluster.omnihub.name
}

output "cluster_endpoint" {
  value     = google_container_cluster.omnihub.endpoint
  sensitive = true
}

output "cluster_ca_certificate" {
  value     = google_container_cluster.omnihub.master_auth[0].cluster_ca_certificate
  sensitive = true
}
```

---

## DISASTER RECOVERY (MULTI-REGION)

### Active-Passive Multi-Region

```
┌────────────────────────────────────────────────────────────┐
│ US-EAST-1 (PRIMARY)                                        │
│                                                            │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │ GKE Cluster      │      │ Cloud SQL        │          │
│  │ (3 nodes min)    │─────►│ (Read-Write)     │          │
│  └──────────────────┘      └────────┬─────────┘          │
│                                     │ Async Replication   │
└─────────────────────────────────────┼─────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────┐
│ EU-WEST-1 (STANDBY)                                        │
│                                                            │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │ GKE Cluster      │      │ Cloud SQL        │          │
│  │ (1 node, scaled  │─────►│ (Read-Only)      │          │
│  │  down)           │      │                  │          │
│  └──────────────────┘      └──────────────────┘          │
│                                                            │
└────────────────────────────────────────────────────────────┘
                     ▲
                     │
         ┌───────────┴─────────────┐
         │ Global Load Balancer    │
         │ (Cloud CDN + health     │
         │  checks)                │
         │ - Routes to PRIMARY     │
         │ - Fails over to STANDBY │
         │   if PRIMARY down       │
         └─────────────────────────┘
```

**Failover Process:**
1. Health check detects primary region failure (2 consecutive failures)
2. Global LB routes traffic to standby region
3. Promote standby database to read-write
4. Scale up standby K8s cluster (1 node → 3 nodes)
5. Alert on-call engineer

**Automation:**
```bash
# scripts/failover-to-standby.sh
#!/bin/bash
set -e

REGION=${1:-eu-west-1}

echo "Initiating failover to $REGION..."

# 1. Promote standby database to primary
gcloud sql instances promote-replica omnihub-db-replica-$REGION

# 2. Scale up standby Kubernetes cluster
kubectl --context=gke-$REGION scale deployment --all --replicas=3 -n omnihub-prod

# 3. Update DNS to point to standby region (if using Route53)
# aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch file://dns-failover.json

# 4. Send alert
curl -X POST $SLACK_WEBHOOK_URL \
  -d '{"text":"🚨 FAILOVER: Primary region failed, now serving from '"$REGION"'"}'

echo "Failover complete. RTO: $(date)"
```

---

## COST ESTIMATE

### Staging Environment (GKE on GCP)

| Component | Configuration | Cost/Month |
|-----------|---------------|------------|
| **GKE Cluster** | 3 nodes (e2-standard-2) | $100 |
| **Cloud SQL** | db-f1-micro (1 vCPU, 3.75GB) | $25 |
| **Redis (Memorystore)** | 1GB | $30 |
| **Load Balancer** | 1 forwarding rule | $20 |
| **Cloud Storage** | 100GB | $5 |
| **Monitoring** | Stackdriver | $10 |
| **Total** | | **~$190/month** |

### Production Environment (GKE on GCP)

| Component | Configuration | Cost/Month |
|-----------|---------------|------------|
| **GKE Cluster** | 10 nodes (e2-standard-4) | $650 |
| **Cloud SQL** | db-n1-standard-2 (HA) | $250 |
| **Redis** | 5GB standard | $150 |
| **Load Balancer** | Global LB + CDN | $80 |
| **Cloud Storage** | 1TB | $20 |
| **Monitoring** | Stackdriver | $50 |
| **Total** | | **~$1200/month** |

**Multi-Region (Active-Passive):** ~$1800/month (add standby region at 50% capacity)

---

## ROLLOUT TIMELINE

### Month 1: Foundation
- Week 1-2: Terraform modules for GKE/EKS/AKS
- Week 3-4: Deploy staging cluster, migrate edge functions to Docker

### Month 2: Migration
- Week 1: Migrate database from Supabase to Cloud SQL/RDS
- Week 2: Rewrite edge functions as containerized microservices
- Week 3: Integration testing
- Week 4: Load testing, performance tuning

### Month 3: Production Rollout
- Week 1-2: Deploy production cluster
- Week 3: Blue-green deployment (dual-run serverless + containers)
- Week 4: Traffic shift to containers (10% → 50% → 100%)

### Month 4-6: Optimization & Multi-Cloud
- Implement active-passive multi-region
- Add second cloud provider (AWS or Azure)
- Chaos engineering drills
- Performance optimization

**Total Time:** 4-6 months

---

## PROS & CONS

### Pros ✅
- **True Multi-Cloud:** Can run on any Kubernetes platform
- **Maximum Control:** Fine-grained resource management, custom runtimes
- **No Vendor Lock-In:** Migrate between clouds with Terraform changes
- **Unlimited Scale:** No platform limits
- **Enterprise-Ready:** Meets air-gap, on-prem requirements
- **Advanced Features:** Service mesh, policy as code, canary deployments

### Cons ❌
- **Slow Time-to-Market:** 4-6 months vs 6 weeks for serverless
- **High Costs:** $1200+/month vs $300-500 for serverless
- **Operational Overhead:** Requires Kubernetes expertise, SRE team
- **Migration Risk:** Full rewrite of edge functions, data migration
- **Complexity:** More moving parts, harder to debug

---

## WHEN TO CHOOSE PATH B

Choose containerized multi-cloud IF:
- [ ] User base > 5M users (serverless limits reached)
- [ ] Need active-active multi-cloud (not just DR)
- [ ] Regulatory requirement for on-premises deployment
- [ ] Enterprise customers require self-hosted option
- [ ] Need custom runtimes beyond Node.js/Deno
- [ ] Have dedicated SRE team for Kubernetes operations

Otherwise, **start with Path A** (serverless) and migrate later if needed.

---

**Document Status:** ✅ COMPLETE
**Recommendation:** Start with PATH A, migrate to PATH B only if necessary
