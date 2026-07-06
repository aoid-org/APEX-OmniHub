/**
 * APEX OmniHub Marketing Site Content Configuration
 * All copy, proof tiles, and navigation live here for easy updates.
 */
import { getSiteUrl } from "@/lib/site-url";
import { certifiedTechSpecSections } from "@/content/featureTruth";

// ============================================================================
// Helper functions to reduce duplication in config objects
// ============================================================================

/** Generic factory to build config objects */
const build = <T>(obj: T): T => obj;

/** Build a navigation link */
const buildLink = (label: string, href: string, labelKey = label) =>
  build({ label, labelKey, href });

/** Build a titled item with description */
const buildItem = (title: string, description: string) =>
  build({ title, description });

/** Build a proof tile */
const buildProofTile = (
  id: string,
  label: string,
  value: string,
  verified: boolean
) => build({ id, label, value, verified });

/** Build a form field config */
const buildField = (label: string, placeholder: string, maxLength: number) =>
  build({ label, placeholder, maxLength });

/** Build a showcase item */
function buildShowcaseItem(title: string, image: string) {
  return { title, image };
}

export const siteConfig = {
  name: "APEX OmniHub",
  domain: new URL(getSiteUrl()).hostname,
  nav: {
    logo: "APEX OmniHub",
    links: [
      buildLink("Tech Specs", "/tech-specs", "layout.nav.techSpecs"),
      buildLink("Story", "/story", "layout.nav.story"),
      buildLink("Manifesto", "/apex-manifesto", "layout.nav.manifesto"),
    ],
    loginLink: buildLink(
      "Launch Console",
      "/login",
      "layout.nav.launchConsole"
    ),
    primaryCta: buildLink("Request Access", "/request-access"),
  },
  hero: {
    eyebrow: "APEX OMNIHUB",
    title: "The only orchestrator you can audit, override, and reverse.",
    tagline: "YOUR SYSTEMS. YOUR RULES.",
    subtitle:
      "The Anti-OS for enterprise AI. Unify software, AI agents, and enterprise platforms into one governed command surface - where every action is authorized, logged, and reversible.",
    description: "No vendor lock-in. No black boxes. No surprises.",
  },
  highlights: {
    title: "",
    items: [
      buildItem(
        "The OS governs your chips.",
        "OmniHub governs everything that thinks."
      ),
      buildItem(
        "You own the data.",
        "You control the flow. Switch tools without rebuilding."
      ),
      buildItem(
        "It sees you.",
        "Zero-trust means nothing is invisible. Directable. Auditable. Reversible."
      ),
    ],
  },
  integrations: {
    title: "The Governance Layer for Intelligent Systems",
    subtitle:
      "Adapters stay modular, portable, and optional-by-default. Software, agents, and physical AI - under one control plane.",
    items: [
      buildItem(
        "Enterprise Systems",
        "CRMs, ERPs, ticketing, messaging, storage, data warehouses."
      ),
      buildItem(
        "AI Apps & Agents",
        "Model providers, agent frameworks, RAG pipelines, eval gates."
      ),
      buildItem(
        "Physical AI & Robots",
        "OpenAI GumDrop, robotics platforms, industrial edge devices."
      ),
    ],
  },
  showcase: {
    title: "YOUR SYSTEMS. YOUR RULES. ONE GOVERNED SURFACE.",
    subtitle: "Governance isn't a feature. It's the architecture.",
    items: [
      buildShowcaseItem(
        "Project Management",
        "/assets/screenshots/omniboard-connections.png"
      ),
      buildShowcaseItem(
        "Team Collaboration",
        "/assets/screenshots/omniport-dashboard.png"
      ),
      buildShowcaseItem(
        "Personal Dashboard",
        "/assets/screenshots/omnitrace-feed.png"
      ),
      buildShowcaseItem(
        "Process Orchestration",
        "/assets/screenshots/maestro-workflow.png"
      ),
    ],
  },
  stamp: {
    headline: "IT SEES YOU.",
    tagline: "DIRECTABLE \u2022 AUDITABLE \u2022 REVERSIBLE",
  },
  ctas: {
    primary: buildLink("Request Access", "/request-access"),
    secondary: buildLink("Watch Demo", "/demo"),
    link: buildLink("Read Tech Specs", "/tech-specs"),
  },
  howItWorks: {
    title: "How It Works",
    steps: [
      buildItem(
        "Connect",
        "Modular adapters plug into any system - software, agent, or robot."
      ),
      buildItem(
        "Translate",
        "Canonical, typed semantic events so platforms actually understand each other."
      ),
      buildItem(
        "Execute",
        "Deterministic workflows with Manual Approval Node gates and full audit trails."
      ),
    ],
  },
  fortress: {
    title: "Zero-Trust Fortress Protocol",
    items: [
      "Assume breach by default",
      "Hardware-level allowlisting (Zero-Trust Device Registry)",
      "Tri-Force governance (Guardian → Planner → Executor)",
      "Manual Approval Node governance by architecture (MAN Mode)",
      "Human-oversight policy gates",
      "Structured audit logging across governed actions",
      "Gitleaks + TruffleHog secret scanning in CI",
    ],
  },
  manMode: {
    title: "M.A.N.Mode",
    subtitle: "MAN Mode — Manual Approval Node Governance",
    description:
      "High-risk decision items are automatically flagged and held at a Manual Approval Node. The workflow continues without interruption — only the flagged item is paused until an authorized operator approves, rejects, or escalates it. Nothing irreversible executes without an explicit approval record.",
  },
  footer: {
    copyright: "\u00A9 2026 APEX Business Systems. All rights reserved.",
    links: [
      buildLink("Privacy", "/privacy", "layout.footer.privacy"),
      buildLink("Terms", "/terms", "layout.footer.terms"),
      buildLink("Support", "/support", "layout.footer.support"),
      buildLink("Manifesto", "/apex-manifesto", "layout.footer.manifesto"),
    ],
  },
} as const;

/**
 * Proof module configuration - evidence-first
 */
export const proofConfig = {
  title: "Verified Unicorn-Class Architecture",
  tiles: [
    buildProofTile("sonarcloud-gate", "SonarCloud Quality", "PASSED", true),
    buildProofTile("secret-scanning", "Secret Scanning", "CI-ENFORCED", true),
    buildProofTile("eu-ai-act", "AI Governance Aligned", "AUGUST 2026", true),
    buildProofTile("privacy-design", "Privacy-by-Design", "MAPPED", true),
  ],
} as const;

/**
 * Tech Specs page content - the "Nervous System" framework.
 *
 * IMPORTANT: The visible capability bullets are NOT defined here. They are
 * projected from the Feature Truth Ledger (`featureTruth.ts`), which renders
 * ONLY claims certified as functioning. This guarantees the production Tech
 * Specs page can never display an unsupported, hidden, or downgraded claim.
 * Edit claims in `featureTruth.ts`, not here.
 */
export const techSpecsConfig = {
  title: "Technical Specifications",
  subtitle: "The Architecture of Governed Intelligence",
  sections: certifiedTechSpecSections,
} as const;

export const demoConfig = {
  title: "See It In Action",
  subtitle: "Experience the APEX OmniHub workflow",
  video: {
    title: "Demo Video",
    description: "See how APEX OmniHub orchestrates your systems in real time",
    src: "/apex-demo-video.mp4",
  },
  interactivePlaceholder: {
    title: "Interactive Demo",
    description: "Try the workflow builder with sample adapters",
  },
  cta: {
    title: "Ready to get started?",
    description: "Explore the only governed AI operating system.",
    button: buildLink("Request Access", "/request-access"),
  },
} as const;

export const requestAccessConfig = {
  title: "Request Access",
  subtitle: "Deploy Governed Intelligence",
  description:
    "We\u2019re onboarding select partners and enterprises into the v1.2.0 ecosystem.",
  fields: {
    name: buildField("Name", "Your name", 100),
    email: buildField("Email", "you@company.com", 254),
    company: buildField("Company", "Company name", 100),
    useCase: buildField("Use Case", "Briefly describe your use case...", 500),
  },
  submitLabel: "Request Access",
  fallbackMessage: "Having trouble? Email us at",
  fallbackEmail: "access@apexomnihub.icu",
  successMessage: "Welcome to the Fortress. We\u2019ll be in touch soon.",
  antiAbuse: {
    honeypotField: "website",
    minSubmitTime: 3000,
    cooldownTime: 300000,
  },
} as const;

export type SiteConfig = typeof siteConfig;
export type ProofConfig = typeof proofConfig;
export type TechSpecsConfig = typeof techSpecsConfig;
export type DemoConfig = typeof demoConfig;
export type RequestAccessConfig = typeof requestAccessConfig;
