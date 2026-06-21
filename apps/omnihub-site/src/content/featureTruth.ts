/**
 * Feature Truth Ledger — single source of truth for public Tech Specs claims.
 *
 * Every public capability claim that appears (or could appear) on the
 * production Tech Specs page is represented here exactly once. The production
 * page renders ONLY claims with status `CERTIFIED_FUNCTIONING`, projected
 * through `certifiedTechSpecSections`. Non-certified claims are retained for
 * auditability but are never displayed as shipped capabilities.
 *
 * Status discipline:
 *  - CERTIFIED_FUNCTIONING   implementation + evidence in-repo; safe to ship.
 *  - BACKEND_FOUNDATION_ONLY substrate present; not a shipped capability.
 *  - REQUIRES_OWNER_VALIDATION needs real-device/owner action before claiming.
 *  - ROADMAP_ONLY            planned; must not appear in production.
 *  - HIDDEN_FOR_RELEASE      unsupported as worded; removed from production.
 *  - NO_GO_BLOCKER           would fail release if shown.
 *
 * Evidence paths are repo-relative and verifiable. Do not add a claim here
 * without a corresponding evidence path.
 */

export type FeatureTruthStatus =
  | 'CERTIFIED_FUNCTIONING'
  | 'BACKEND_FOUNDATION_ONLY'
  | 'ROADMAP_ONLY'
  | 'HIDDEN_FOR_RELEASE'
  | 'REQUIRES_OWNER_VALIDATION'
  | 'NO_GO_BLOCKER';

export type FeatureTruthCategory =
  | 'brain'
  | 'senses'
  | 'identity'
  | 'conscience'
  | 'memory'
  | 'immune';

export interface FeatureClaim {
  readonly id: string;
  readonly label: string;
  readonly category: FeatureTruthCategory;
  readonly status: FeatureTruthStatus;
  /** Original public marketing copy (pre-certification). */
  readonly publicCopy: string;
  /** Release-safe, factual copy. Required when status is CERTIFIED_FUNCTIONING. */
  readonly releaseCopy: string | null;
  readonly evidence: readonly string[];
  readonly uiRoutes: readonly string[];
  readonly apiRoutes: readonly string[];
  readonly dataStores: readonly string[];
  readonly tests: readonly string[];
  readonly ownerValidationRequired: boolean;
  readonly notes: string;
}

export const featureTruthLedger: readonly FeatureClaim[] = [
  // ───────────────────────── BRAIN ─────────────────────────
  {
    id: 'brain.temporal',
    label: 'Temporal.io durable execution engine',
    category: 'brain',
    status: 'BACKEND_FOUNDATION_ONLY',
    publicCopy: 'Temporal.io durable execution engine',
    releaseCopy: null,
    evidence: [
      'package.json (@temporalio/client,worker,workflow,activity)',
      'orchestrator/requirements.txt (temporalio>=1.22.0)',
      'orchestrator/pyproject.toml',
    ],
    uiRoutes: [],
    apiRoutes: ['orchestrator/server.py'],
    dataStores: [],
    tests: [],
    ownerValidationRequired: false,
    notes:
      'Temporal SDK present in both JS and Python runtimes. A running worker + named workflow reachability was not proven in this audit, so it ships as substrate, not a headline capability.',
  },
  {
    id: 'brain.saga',
    label: 'Saga-style compensation & rollbacks',
    category: 'brain',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'Saga-style compensation & rollbacks',
    releaseCopy: 'Saga-style compensation and rollback paths',
    evidence: [
      'src/core/orchestrator/ApexOrchestrator.ts',
      'src/core/orchestrator/ChronosLock.ts (rollbackAsync)',
    ],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: ['tests/'],
    ownerValidationRequired: false,
    notes: 'Idempotency-keyed commit/rollback implemented in ChronosLock.',
  },
  {
    id: 'brain.fastapi',
    label: 'FastAPI / Python AI agent logic',
    category: 'brain',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'FastAPI / Python AI agent logic',
    releaseCopy: 'FastAPI / Python agent runtime',
    evidence: [
      'orchestrator/server.py',
      'orchestrator/tests/test_final_verification.py',
    ],
    uiRoutes: [],
    apiRoutes: ['orchestrator/server.py'],
    dataStores: [],
    tests: ['orchestrator/tests/'],
    ownerValidationRequired: false,
    notes: 'FastAPI service with pytest coverage in orchestrator package.',
  },
  {
    id: 'brain.pgvector',
    label: 'pgvector semantic memory (RAG)',
    category: 'brain',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'pgvector semantic memory (RAG)',
    releaseCopy: 'pgvector semantic memory (RAG)',
    evidence: [
      'supabase/migrations/20260303000000_create_memories_table.sql (vector ext + HNSW)',
      'src/lib/memory/MemoryClient.ts',
    ],
    uiRoutes: [],
    apiRoutes: ['src/lib/memory/MemoryClient.ts'],
    dataStores: ['memories'],
    tests: [],
    ownerValidationRequired: false,
    notes: 'pgvector extension + HNSW index migration; client wired.',
  },
  {
    id: 'brain.workflowViz',
    label: 'Workflow state visualization (:8080)',
    category: 'brain',
    status: 'HIDDEN_FOR_RELEASE',
    publicCopy: 'Workflow state visualization (:8080)',
    releaseCopy: null,
    evidence: [],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: false,
    notes:
      'No reachable :8080 workflow UI proven in-repo. Port claim removed from production.',
  },

  // ───────────────────────── SENSES ─────────────────────────
  {
    id: 'senses.ears',
    label: 'Ears: Real-time audio stream perception',
    category: 'senses',
    status: 'BACKEND_FOUNDATION_ONLY',
    publicCopy: 'Ears: Real-time audio stream perception',
    releaseCopy: null,
    evidence: [
      'src/utils/RealtimeAudio.ts',
      'src/omniconnect/ingress/omniport-voice.ts',
      'apps/omnihub-site/dashboard/components/DashboardOverview/hooks/useAgentRecording.ts',
    ],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: false,
    notes:
      'Voice ingress + governed transcript handling exist. A complete, tested mic capture → transcription → response path was not certified, so not shown as a shipped capability.',
  },
  {
    id: 'senses.eyes',
    label: 'Eyes: Multimodal vision input analysis',
    category: 'senses',
    status: 'HIDDEN_FOR_RELEASE',
    publicCopy: 'Eyes: Multimodal vision input analysis',
    releaseCopy: null,
    evidence: [],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: false,
    notes:
      'No image upload, camera, or multimodal vision route found. Removed from production.',
  },
  {
    id: 'senses.touch',
    label: 'Touch: Native sensor permission gates',
    category: 'senses',
    status: 'BACKEND_FOUNDATION_ONLY',
    publicCopy: 'Touch: Native sensor permission gates',
    releaseCopy: null,
    evidence: ['capacitor.config.ts', 'supabase/migrations/20260125130000_push_device_tokens.sql'],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: ['push_device_tokens'],
    tests: [],
    ownerValidationRequired: true,
    notes: 'Capacitor native shell present; sensor permission gating not device-validated.',
  },
  {
    id: 'senses.whisper',
    label: 'Whisper local fallback (air-gapped ready)',
    category: 'senses',
    status: 'HIDDEN_FOR_RELEASE',
    publicCopy: 'Whisper local fallback (air-gapped ready)',
    releaseCopy: null,
    evidence: [],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: false,
    notes: 'No local/offline Whisper path found. Removed from production.',
  },
  {
    id: 'senses.capacitor',
    label: 'Capacitor 6.0 native iOS/Android bridges',
    category: 'senses',
    status: 'REQUIRES_OWNER_VALIDATION',
    publicCopy: 'Capacitor 6.0 native iOS/Android bridges',
    releaseCopy: null,
    evidence: ['capacitor.config.ts', 'package.json (@capacitor/core ^6.2.1)', 'android/', 'ios/'],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: true,
    notes: 'Capacitor 6.2.1 shell + android/ios projects present; not validated on a real device.',
  },

  // ───────────────────────── IDENTITY ─────────────────────────
  {
    id: 'identity.enclave',
    label: 'Biometric hardware enclave signing',
    category: 'identity',
    status: 'BACKEND_FOUNDATION_ONLY',
    publicCopy: 'Biometric hardware enclave signing',
    releaseCopy: null,
    evidence: ['src/lib/biometric-auth.ts', 'orchestrator/security/request_signing.py'],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: ['tests/lib/biometric-auth.extended.test.ts'],
    ownerValidationRequired: true,
    notes:
      'WebAuthn implementation present. Hardware-enclave signing of execution receipts is not proven without real-device validation.',
  },
  {
    id: 'identity.deviceRegistry',
    label: 'Zero-Trust Device Registry (Hardware ID)',
    category: 'identity',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'Zero-Trust Device Registry (Hardware ID)',
    releaseCopy: 'Zero-Trust Device Registry',
    evidence: [
      'src/zero-trust/deviceRegistry.ts',
      'supabase/migrations/20251218000001_create_device_registry_table.sql',
      'tests/zero-trust/baseline.test.ts',
    ],
    uiRoutes: [],
    apiRoutes: ['src/zero-trust/deviceRegistry.ts'],
    dataStores: ['device_registry'],
    tests: ['tests/zero-trust/baseline.test.ts'],
    ownerValidationRequired: false,
    notes: 'Device registry table + integrity logic + baseline tests in-repo.',
  },
  {
    id: 'identity.faceid',
    label: 'FaceID / TouchID execution gating',
    category: 'identity',
    status: 'REQUIRES_OWNER_VALIDATION',
    publicCopy: 'FaceID / TouchID execution gating',
    releaseCopy: null,
    evidence: ['src/lib/biometric-auth.ts (WebAuthn platform authenticator)'],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: ['tests/lib/biometric-auth.extended.test.ts'],
    ownerValidationRequired: true,
    notes:
      'WebAuthn platform-authenticator path implemented; FaceID/TouchID execution gating must be validated on a real device before public claim.',
  },
  {
    id: 'identity.noBiometricEgress',
    label: 'No biometric data leaves the device',
    category: 'identity',
    status: 'BACKEND_FOUNDATION_ONLY',
    publicCopy: 'No biometric data leaves the device',
    releaseCopy: null,
    evidence: ['src/lib/biometric-auth.ts'],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: true,
    notes:
      'Architectural property of WebAuthn (only public-key material leaves device); paired to FaceID/TouchID owner validation.',
  },
  {
    id: 'identity.hwReceipts',
    label: 'Cryptographic receipts signed by hardware',
    category: 'identity',
    status: 'BACKEND_FOUNDATION_ONLY',
    publicCopy: 'Cryptographic receipts signed by hardware',
    releaseCopy: null,
    evidence: ['orchestrator/security/request_signing.py'],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: true,
    notes: 'Request signing exists; hardware-rooted signing not proven without device validation.',
  },

  // ───────────────────────── CONSCIENCE ─────────────────────────
  {
    id: 'conscience.triforce',
    label: 'Tri-Force: Guardian → Planner → Executor',
    category: 'conscience',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'Tri-Force: Guardian → Planner → Executor',
    releaseCopy: 'Tri-Force governance: Guardian → Planner → Executor',
    evidence: [
      'src/guardian/loops.ts',
      'src/guardian/heartbeat.ts',
      'orchestrator/security/guardian_fabric.py',
      'package.json script: guardian:status',
    ],
    uiRoutes: [],
    apiRoutes: ['src/lib/apex/control-plane.ts'],
    dataStores: [],
    tests: [],
    ownerValidationRequired: false,
    notes: 'Guardian runtime loops + fabric + status CLI present.',
  },
  {
    id: 'conscience.manmode',
    label: 'MAN Mode (Manual Approval Node) gates',
    category: 'conscience',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'MAN Mode (Manual Approval Node) gates',
    releaseCopy: 'MAN Mode (Manual Approval Node) gates for high-risk actions',
    evidence: [
      'supabase/migrations/20260108120000_man_mode.sql (man_tasks)',
      'supabase/functions/omnibridge-control/index.ts',
      'supabase/migrations/20260417000000_omnibridge_events.sql (awaiting_man)',
    ],
    uiRoutes: [],
    apiRoutes: ['supabase/functions/omnibridge-control/index.ts'],
    dataStores: ['man_tasks'],
    tests: [],
    ownerValidationRequired: false,
    notes: 'man_tasks table + awaiting-approval enforcement in edge functions.',
  },
  {
    id: 'conscience.humanOversight',
    label: 'Human-oversight policy controls',
    category: 'conscience',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'Human-oversight policy controls',
    releaseCopy: 'Human-oversight policy controls',
    evidence: ['src/omniconnect/policy/policy-engine.ts'],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: false,
    notes: 'Policy engine enforces oversight rules over agent actions.',
  },
  {
    id: 'conscience.omnilink9876',
    label: 'OmniLink single controlled port (9876)',
    category: 'conscience',
    status: 'HIDDEN_FOR_RELEASE',
    publicCopy: 'OmniLink single controlled port (9876)',
    releaseCopy: null,
    evidence: [],
    uiRoutes: [],
    apiRoutes: ['supabase/functions/omnilink-port/index.ts'],
    dataStores: [],
    tests: [],
    ownerValidationRequired: false,
    notes:
      'OmniLink ingress exists, but the literal "port 9876" is referenced only in marketing copy — no service binds or health-checks 9876. The numeric port claim is removed.',
  },
  {
    id: 'conscience.semanticEvents',
    label: 'Canonical typed semantic event normalization',
    category: 'conscience',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'Canonical typed semantic event normalization',
    releaseCopy: 'Canonical typed semantic event normalization',
    evidence: [
      'src/omniconnect/types/canonical.ts',
      'supabase/functions/_shared/omniport-normalize.ts',
    ],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: ['tests/omniconnect/omniport.spec.ts'],
    ownerValidationRequired: false,
    notes: 'Canonical event types + normalization layer with tests.',
  },

  // ───────────────────────── MEMORY ─────────────────────────
  {
    id: 'memory.auditLogging',
    label: 'Audit logging mapped to privacy-record workflows',
    category: 'memory',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'Audit logging mapped to privacy-record workflows',
    releaseCopy: 'Structured audit logging across governed actions',
    evidence: [
      'src/security/auditLog.ts',
      'supabase/functions/apex-agent/index.ts (audit_logs)',
      'apps/omnihub-site/dashboard/utils/exportAuditLog.ts',
    ],
    uiRoutes: [],
    apiRoutes: ['src/security/auditLog.ts'],
    dataStores: ['audit_logs'],
    tests: [],
    ownerValidationRequired: false,
    notes: 'audit_logs write paths across edge functions + export utility.',
  },
  {
    id: 'memory.replay',
    label: 'OmniTrace forensic decision replay',
    category: 'memory',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'OmniTrace forensic decision replay',
    releaseCopy: 'OmniTrace decision replay over recorded audit events',
    evidence: [
      'apps/omnihub-site/src/components/OmniTracePanel.tsx (RLS-scoped audit_logs query)',
      'apps/omnihub-site/src/lib/omniTrace.ts (ordering/grouping logic)',
      'apps/omnihub-site/src/pages/OmniTrace.tsx',
      'apps/omnihub-site/src/App.tsx (/omni-trace route)',
      'tests/release/omni-trace-surface.spec.ts',
    ],
    uiRoutes: ['/omni-trace'],
    apiRoutes: [],
    dataStores: ['audit_logs'],
    tests: ['tests/release/omni-trace-surface.spec.ts'],
    ownerValidationRequired: false,
    notes:
      'Live /omni-trace surface replays the current user’s real audit_logs (RLS-scoped), reconstructing an ordered decision timeline grouped by correlation id when present. Scoped to recorded-event replay; cross-agent full-chain linking (memory.fullChain) remains separate and uncertified because no correlation id is persisted into audit_logs.metadata today.',
  },
  {
    id: 'memory.fullChain',
    label: 'Full reconstruction of any agent chain',
    category: 'memory',
    status: 'HIDDEN_FOR_RELEASE',
    publicCopy: 'Full reconstruction of any agent chain',
    releaseCopy: null,
    evidence: [],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: false,
    notes: 'Not every agent step is proven to emit trace events. Removed from production.',
  },
  {
    id: 'memory.retention365',
    label: '365-day structured log retention',
    category: 'memory',
    status: 'BACKEND_FOUNDATION_ONLY',
    publicCopy: '365-day structured log retention',
    releaseCopy: null,
    evidence: ['scripts/compliance/generate_retention_evidence.mjs'],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: true,
    notes:
      'Retention evidence generator exists; the specific 365-day numeric guarantee requires a verified scheduled-job/policy in production.',
  },
  {
    id: 'memory.dpiaFria',
    label: 'DPIA / FRIA audit-ready documentation',
    category: 'memory',
    status: 'REQUIRES_OWNER_VALIDATION',
    publicCopy: 'DPIA / FRIA audit-ready documentation',
    releaseCopy: null,
    evidence: [],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: true,
    notes: 'Current DPIA/FRIA documents must be confirmed before public claim.',
  },

  // ───────────────────────── IMMUNE ─────────────────────────
  {
    id: 'immune.armageddon40k',
    label: 'Armageddon L7: 40,000 adversarial iterations',
    category: 'immune',
    status: 'HIDDEN_FOR_RELEASE',
    publicCopy: 'Armageddon L7: 40,000 adversarial iterations',
    releaseCopy: null,
    evidence: [],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: [],
    ownerValidationRequired: false,
    notes: 'No 40,000-iteration adversarial harness found in-repo. Numeric proof removed.',
  },
  {
    id: 'immune.zeroEscape',
    label: '0% escape rate on goal hijack & tool misuse',
    category: 'immune',
    status: 'HIDDEN_FOR_RELEASE',
    publicCopy: '0% escape rate on goal hijack & tool misuse',
    releaseCopy: null,
    evidence: [],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: ['tests/prompt-defense/'],
    ownerValidationRequired: false,
    notes:
      'Prompt-defense tests exist but no current evidence substantiates a 0% escape numeric. Claim removed.',
  },
  {
    id: 'immune.omnisentry',
    label: 'OmniSentry self-healing monitor',
    category: 'immune',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'OmniSentry self-healing monitor',
    releaseCopy: 'OmniSentry self-healing monitor (live status)',
    evidence: [
      'src/lib/omni-sentry.ts (circuit breaker + self-healing recovery)',
      'apps/omnihub-site/src/components/OmniSentryPanel.tsx (live surface)',
      'apps/omnihub-site/src/pages/OmniSentry.tsx',
      'apps/omnihub-site/src/App.tsx (/omni-sentry route)',
      'src/main.tsx (startup activation from preference)',
      'tests/release/omni-sentry-surface.spec.ts',
    ],
    uiRoutes: ['/omni-sentry'],
    apiRoutes: [],
    dataStores: [],
    tests: ['tests/release/omni-sentry-surface.spec.ts'],
    ownerValidationRequired: false,
    notes:
      'Self-healing monitor lib is now surfaced live at /omni-sentry via OmniSentryPanel, which drives the real initializeOmniSentry/getHealthStatus runtime and persists activation across reloads (main.tsx startup initializer).',
  },
  {
    id: 'immune.secretScanning',
    label: 'Gitleaks + TruffleHog secret scanning',
    category: 'immune',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'Gitleaks + TruffleHog secret scanning',
    releaseCopy: 'Gitleaks + TruffleHog secret scanning in CI',
    evidence: [
      '.github/gitleaks.toml',
      '.github/workflows/secret-scanning.yml',
      '.github/workflows/production-readiness.yml (trufflesecurity/trufflehog pinned)',
    ],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: ['.github/workflows/secret-scanning.yml'],
    ownerValidationRequired: false,
    notes: 'Both tools are pinned and invoked in CI workflows.',
  },
  {
    id: 'immune.omega',
    label: 'OMEGA infrastructure hardening layer',
    category: 'immune',
    status: 'CERTIFIED_FUNCTIONING',
    publicCopy: 'OMEGA infrastructure hardening layer',
    releaseCopy: 'OMEGA infrastructure hardening layer',
    evidence: ['omega/', 'scripts/omega/cli.ts', '.github/workflows/ci-runtime-gates.yml'],
    uiRoutes: [],
    apiRoutes: [],
    dataStores: [],
    tests: ['omega/test_omega.sh'],
    ownerValidationRequired: false,
    notes: 'OMEGA module + CLI + CI runtime-gate integration.',
  },
] as const;

/** Display metadata per category — release-safe, factual section framing. */
const categoryMeta: Readonly<
  Record<FeatureTruthCategory, { readonly title: string; readonly description: string }>
> = {
  brain: {
    title: 'The Brain (Durable Orchestration)',
    description:
      'Durable orchestration substrate: agent runtime with compensation paths and semantic memory.',
  },
  senses: {
    title: 'The Senses (Physical AI Perception)',
    description: 'Perception interfaces governed by zero-trust controls.',
  },
  identity: {
    title: 'The Identity (Silicon-Level Trust)',
    description: 'Device-bound trust with zero-trust registration.',
  },
  conscience: {
    title: 'The Conscience (Governance Layer)',
    description:
      'Tri-Force governance ensures intent passes policy before execution, with manual approval for high-risk actions.',
  },
  memory: {
    title: 'The Memory (Immutable Records)',
    description: 'Structured audit logging across governed actions.',
  },
  immune: {
    title: 'The Immune System (Verification)',
    description: 'Continuous verification, secret scanning, and infrastructure hardening.',
  },
};

const CATEGORY_ORDER: readonly FeatureTruthCategory[] = [
  'brain',
  'senses',
  'identity',
  'conscience',
  'memory',
  'immune',
];

export interface TechSpecSection {
  readonly id: FeatureTruthCategory;
  readonly title: string;
  readonly description: string;
  readonly details: readonly string[];
}

/**
 * Project the ledger into the Tech Specs section shape, including ONLY
 * `CERTIFIED_FUNCTIONING` claims and using each claim's `releaseCopy`.
 * Categories with no certified claims are omitted entirely.
 */
export function buildCertifiedTechSpecSections(): readonly TechSpecSection[] {
  return CATEGORY_ORDER.map((category) => {
    const details = featureTruthLedger
      .filter(
        (claim) =>
          claim.category === category &&
          claim.status === 'CERTIFIED_FUNCTIONING' &&
          claim.releaseCopy !== null,
      )
      .map((claim) => claim.releaseCopy as string);

    return {
      id: category,
      title: categoryMeta[category].title,
      description: categoryMeta[category].description,
      details,
    };
  }).filter((section) => section.details.length > 0);
}

export const certifiedTechSpecSections: readonly TechSpecSection[] =
  buildCertifiedTechSpecSections();
