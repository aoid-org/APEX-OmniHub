/**
 * APEX OmniHub Marketing Site Content Configuration
 * All copy, proof tiles, and navigation live here for easy updates.
 */
import { getSiteUrl } from '@/lib/site-url';

// ============================================================================
// Helper functions to reduce duplication in config objects
// ============================================================================

/** Generic factory to build config objects */
const build = <T>(obj: T): T => obj;

/** Build a navigation link */
const buildLink = (label: string, href: string) => build({ label, href });

/** Build a titled item with description */
const buildItem = (title: string, description: string) => build({ title, description });

/** Build a proof tile */
const buildProofTile = (id: string, label: string, value: string, verified: boolean) =>
  build({ id, label, value, verified });

/** Build a form field config */
const buildField = (label: string, placeholder: string, maxLength: number) =>
  build({ label, placeholder, maxLength });

/** Build a showcase item */
function buildShowcaseItem(title: string, image: string) {
  return { title, image };
}

export const siteConfig = {
  name: 'APEX OmniHub',
  domain: new URL(getSiteUrl()).hostname,
  nav: {
    logo: 'APEX OmniHub',
    links: [
      buildLink('Tech Specs', '/tech-specs'),
      buildLink('Story', '/story'),
    ],
    loginLink: buildLink('Launch Console', '/login'),
    primaryCta: buildLink('Request Access', '/request-access'),
  },
  hero: {
    eyebrow: 'APEX OMNIHUB',
    title: 'The only orchestrator you can audit, override, and reverse.',
    tagline: 'YOUR SYSTEMS. YOUR RULES.',
    subtitle:
      'The Anti-OS for enterprise AI. Unify software, AI agents, and enterprise platforms into one governed command surface - where every action is authorized, logged, and reversible.',
    description:
      'No vendor lock-in. No black boxes. No surprises.',
  },
  highlights: {
    title: '',
    items: [
      buildItem('The OS governs your chips.', 'OmniHub governs everything that thinks.'),
      buildItem('You own the data.', 'You control the flow. Switch tools without rebuilding.'),
      buildItem('It sees you.', 'Zero-trust means nothing is invisible. Directable. Auditable. Reversible.'),
    ],
  },
  integrations: {
    title: "The Governance Layer for Intelligent Systems",
    subtitle: 'Adapters stay modular, portable, and optional-by-default. Software, agents, and physical AI - under one control plane.',
    items: [
      buildItem('Enterprise Systems', 'CRMs, ERPs, ticketing, messaging, storage, data warehouses.'),
      buildItem('AI Apps & Agents', 'Model providers, agent frameworks, RAG pipelines, eval gates.'),
      buildItem('Physical AI & Robots', 'OpenAI GumDrop, robotics platforms, industrial edge devices.'),
    ],
  },
  showcase: {
    title: 'YOUR SYSTEMS. YOUR RULES. ONE GOVERNED SURFACE.',
    subtitle: 'Governance isn\'t a feature. It\'s the architecture.',
    items: [
      buildShowcaseItem('Project Management', '/assets/screenshots/omniboard-connections.png'),
      buildShowcaseItem('Team Collaboration', '/assets/screenshots/omniport-dashboard.png'),
      buildShowcaseItem('Personal Dashboard', '/assets/screenshots/omnitrace-feed.png'),
      buildShowcaseItem('Process Orchestration', '/assets/screenshots/maestro-workflow.png'),
    ],
  },
  stamp: {
    headline: 'IT SEES YOU.',
    tagline: 'DIRECTABLE \u2022 AUDITABLE \u2022 REVERSIBLE',
  },
  ctas: {
    primary: buildLink('Request Access', '/request-access'),
    secondary: buildLink('Watch Demo', '/demo'),
    link: buildLink('Read Tech Specs', '/tech-specs'),
  },
  howItWorks: {
    title: 'How It Works',
    steps: [
      buildItem('Connect', 'Modular adapters plug into any system - software, agent, or robot.'),
      buildItem('Translate', 'Canonical, typed semantic events so platforms actually understand each other.'),
      buildItem('Execute', 'Deterministic workflows with biometric gates and full audit trails.'),
    ],
  },
  fortress: {
    title: 'Zero-Trust Fortress Protocol',
    items: [
      'Assume breach by default',
      'Hardware-level allowlisting (Device Registry)',
      'Biometric hardware enclave signing (FaceID/TouchID)',
      'Manual Approval Node governance by architecture (MAN Mode)',
      'Human-oversight policy gates',
      'Immutable audit logging (Privacy-record workflows)',
      'Forensic replay via OmniTrace',
    ],
  },
  manMode: {
    title: 'M.A.N.Mode',
    subtitle: 'MAN Mode — Manual Approval Node Governance',
    description:
      'High-risk decision items are automatically flagged and held at a Manual Approval Node. The workflow continues without interruption — only the flagged item is paused until an authorized operator approves, rejects, or escalates it. Nothing irreversible executes without an explicit approval record.',
  },
  footer: {
    copyright: '\u00A9 2026 APEX Business Systems. All rights reserved.',
    links: [
      buildLink('Privacy', '/privacy'),
      buildLink('Terms', '/terms'),
    ],
  },
} as const;

/**
 * Proof module configuration - evidence-first
 */
export const proofConfig = {
  title: 'Verified Unicorn-Class Architecture',
  tiles: [
    buildProofTile('sonarcloud-gate', 'SonarCloud Quality', 'PASSED', true),
    buildProofTile('armageddon-l7', 'Armageddon L7', 'VERIFIED', true),
    buildProofTile('eu-ai-act', 'AI Governance Aligned', 'AUGUST 2026', true),
    buildProofTile('privacy-design', 'Privacy-by-Design', 'MAPPED', true),
  ],
} as const;

/**
 * Tech Specs page content - the "Nervous System" framework
 * Structured as plain data to maintain CPD compliance.
 */
export const techSpecsConfig = {
  title: 'Technical Specifications',
  subtitle: 'The Architecture of Governed Intelligence',
  sections: [
    {
      id: 'brain',
      title: 'The Brain (Durable Orchestration)',
      description: 'Temporal.io cognitive core surviving infrastructure failure with deterministic replay safety.',
      details: [
        'Temporal.io durable execution engine',
        'Saga-style compensation & rollbacks',
        'FastAPI / Python AI agent logic',
        'pgvector semantic memory (RAG)',
        'Workflow state visualization (:8080)',
      ],
    },
    {
      id: 'senses',
      title: 'The Senses (Physical AI Perception)',
      description: 'Hardware-level sensory inputs governed by zero-trust and real-time audio intelligence.',
      details: [
        'Ears: Real-time audio stream perception',
        'Eyes: Multimodal vision input analysis',
        'Touch: Native sensor permission gates',
        'Whisper local fallback (air-gapped ready)',
        'Capacitor 6.0 native iOS/Android bridges',
      ],
    },
    {
      id: 'identity',
      title: 'The Identity (Silicon-Level Trust)',
      description: 'Cryptographic signing via biometric enclaves and hardware allowlisting.',
      details: [
        'Biometric hardware enclave signing',
        'Zero-Trust Device Registry (Hardware ID)',
        'FaceID / TouchID execution gating',
        'No biometric data leaves the device',
        'Cryptographic receipts signed by hardware',
      ],
    },
    {
      id: 'conscience',
      title: 'The Conscience (Governance Layer)',
      description: 'Tri-Force Protocol ensures intent never bypasses policy. Manual Approval Node governance by design.',
      details: [
        'Tri-Force: Guardian \u2192 Planner \u2192 Executor',
        'MAN Mode (Manual Approval Node) gates',
        'Human-oversight policy controls',
        'OmniLink single controlled port (9876)',
        'Canonical typed semantic event normalization',
      ],
    },
    {
      id: 'memory',
      title: 'The Memory (Immutable Records)',
      description: 'OmniTrace forensic replay and immutable audit trails for regulatory compliance.',
      details: [
        'Audit logging mapped to privacy-record workflows',
        'OmniTrace forensic decision replay',
        'Full reconstruction of any agent chain',
        '365-day structured log retention',
        'DPIA / FRIA audit-ready documentation',
      ],
    },
    {
      id: 'immune',
      title: 'The Immune System (Verification)',
      description: 'Armageddon L7 verified security posture with self-healing OmniSentry monitoring.',
      details: [
        'Armageddon L7: 40,000 adversarial iterations',
        '0% escape rate on goal hijack & tool misuse',
        'OmniSentry self-healing monitor',
        'Gitleaks + TruffleHog secret scanning',
        'OMEGA infrastructure hardening layer',
      ],
    },
  ] as const,
} as const;

export const demoConfig = {
  title: 'See It In Action',
  subtitle: 'Experience the APEX OmniHub workflow',
  video: {
    title: 'Demo Video',
    description: 'See how APEX OmniHub orchestrates your systems in real time',
    src: '/apex-demo-video.mp4',
  },
  interactivePlaceholder: {
    title: 'Interactive Demo',
    description: 'Try the workflow builder with sample adapters',
  },
  cta: {
    title: 'Ready to get started?',
    description: 'Explore the only governed AI operating system.',
    button: buildLink('Request Access', '/request-access'),
  },
} as const;

export const requestAccessConfig = {
  title: 'Request Access',
  subtitle: 'Deploy Governed Intelligence',
  description: 'We\u2019re onboarding select partners and enterprises into the v1.2.0 ecosystem.',
  fields: {
    name: buildField('Name', 'Your name', 100),
    email: buildField('Email', 'you@company.com', 254),
    company: buildField('Company', 'Company name', 100),
    useCase: buildField('Use Case', 'Briefly describe your use case...', 500),
  },
  submitLabel: 'Request Access',
  fallbackMessage: 'Having trouble? Email us at',
  fallbackEmail: 'access@apexomnihub.icu',
  successMessage: 'Welcome to the Fortress. We\u2019ll be in touch soon.',
  antiAbuse: {
    honeypotField: 'website',
    minSubmitTime: 3000,
    cooldownTime: 300000,
  },
} as const;

export type SiteConfig = typeof siteConfig;
export type ProofConfig = typeof proofConfig;
export type TechSpecsConfig = typeof techSpecsConfig;
export type DemoConfig = typeof demoConfig;
export type RequestAccessConfig = typeof requestAccessConfig;
