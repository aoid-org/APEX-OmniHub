# APEX-OmniHub Technical Architecture Specification

**Document Owner:** CTO & Chief Platform Architect  
**Last Updated:** 2026-02-01  
**Status:** Production  
**Version:** 2.2 (Nexus/Spectre/Aegis/Chronos/Veritas + Iron Law)

---

## Executive Summary

APEX-OmniHub is a production-grade, **Hybrid-Cloud AI Operating System**. It converges Web3 (Token-gating), Generative AI (Maestro), and **Physical Hardware Identity** into a unified control plane. This document reflects the "Unicorn-Class" architecture verified in the Feb 2026 audit, incorporating the **Iron Law of Determinism**.

**Core Value Proposition:**

- **Multi-skill AI orchestration** via Temporal.io workflows
- **Cyber-Physical Security** with Zero-Trust Device Registry & Biometrics
- **Edge-First Architecture** running locally on iOS/Android via Capacitor
- **Enterprise Resilience** with Chaos Engineering & Self-Healing (OmniSentry)

---

## 1. Technology Stack (Actual Implementation)

### 1.1 Frontend Stack (The Hub)

| Layer              | Technology     | Version | Purpose                   |
| ------------------ | -------------- | ------- | ------------------------- |
| **Framework**      | React          | 18.3.1  | Component-based UI        |
| **Mobile Runtime** | Capacitor      | 6.0+    | Native iOS/Android Bridge |
| **State**          | TanStack Query | 5.83    | Offline-first sync engine |
| **UI**             | Shadcn UI      | Latest  | Accessible Design System  |
| **Web3**           | Wagmi + Viem   | 2.x     | Blockchain Identity       |

### 1.2 Physical AI Stack (The Senses)

| Component           | Implementation                     | Purpose                      |
| ------------------- | ---------------------------------- | ---------------------------- |
| **Device Registry** | `src/zero-trust/deviceRegistry.ts` | Hardware-level Allowlisting  |
| **Ears (Audio)**    | `src/utils/RealtimeAudio.ts`       | Real-time Voice Intelligence |
| **Identity**        | `src/lib/biometric-native.ts`      | Hardware Enclave Signing     |
| **Eyes (Vision)**   | `src/integrations/omniport`        | Multimodal Input Analysis    |

### 1.3 Intelligence Stack (The Spirit)

| Module      | Purpose                          | Implementation          |
| ----------- | -------------------------------- | ----------------------- |
| **Nexus**   | Knowledge Graph & Context        | `orchestrator/nexus/`   |
| **Spectre** | Shadow Simulation & Prediction   | `orchestrator/spectre/` |
| **Aegis**   | Automated Defense & Security     | `orchestrator/aegis/`   |
| **Chronos** | Time-Travel Debugging & Replay   | `orchestrator/chronos/` |
| **Veritas** | Truth Source & Fact Verification | `orchestrator/veritas/` |

### 1.4 Backend Stack (The Brain)

| Layer            | Technology        | Purpose                          |
| ---------------- | ----------------- | -------------------------------- |
| **Orchestrator** | Python (FastAPI)  | Heavy AI Logic & Agents          |
| **Engine**       | Temporal.io       | Durable Execution & Retries      |
| **Database**     | Supabase (PG)     | Relational Data & Edge Functions |
| **Vector DB**    | Supabase pgvector | Semantic Memory (RAG)            |

---

## 2. System Architecture Diagram

```mermaid
graph TD
    User[User / Physical Device] -->|Biometric Auth| Edge[Edge PWA / Mobile]
    Edge -->|Sync/Offline| Cloud[Cloudflare CDN]

    subgraph "Zero Trust Zone"
        Cloud -->|Validate| Registry[Device Registry DB]
        Registry -->|Token| API[Supabase Edge Functions]
    end

    subgraph "Intelligence Layer"
        API -->|Task| Temporal[Temporal Server]
        Temporal -->|Dispatch| Maestro[Maestro Python Engine]
        Maestro -->|Query| Vector[Knowledge Base]
        Maestro -->|Action| SaaS[External Tools/APIs]
    end
```

---

### 2.1 The Iron Law of Determinism

> **"If it is not deterministic, it is a bug."**

1.  **No Side Effects**: All external actions must be captured in `Activity` wrappers.
2.  **No System Time**: Use `workflow.now()` instead of `datetime.now()`.
3.  **No Global State**: Workflows are stateless functions of their history.
4.  **No Threading**: Temporal handles concurrency; threads break replay.
5.  **No Randomness**: Use `workflow.random()` if needed, never `random.random()`.

---

## 3. Directory Structure (Key Components)

```plaintext
/
├── apps/omnihub-site/        # The Control Surface (PWA)
│   ├── src/zero-trust/       # Device Registry Logic
│   ├── src/lib/biometric/    # Hardware Security Module
│   └── capacitor.config.ts   # Native Bridge Config
│
├── orchestrator/             # The AI Brain (Python)
│   ├── activities/           # Agent Capabilities
│   └── workflows/            # Durable Logic
│
├── supabase/                 # The Data Layer
│   ├── migrations/           # SQL Schema (inc. device_registry)
│   └── functions/            # Edge Logic (Voice, Auth)
```

---

## Appendix A: Port & Service Reference

| Service        | Port/URL            | Purpose                |
| -------------- | ------------------- | ---------------------- |
| Frontend Dev   | localhost:5173      | Vite dev server        |
| Orchestrator   | localhost:8000      | FastAPI backend        |
| Temporal UI    | localhost:8080      | Workflow visualization |
| Realtime Audio | wss://api.openai... | Voice Stream (Proxied) |
| Local DB       | localhost:54322     | Supabase PostgreSQL    |

---

**Document Version:** 2.1  
**Last Audit:** 2026-02-01
