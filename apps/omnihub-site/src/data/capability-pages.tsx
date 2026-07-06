/**
 * Capability page data definitions.
 * Uses factory pattern and mapped structures to eliminate structural duplication.
 */
import type { ReactNode } from 'react';
import { IconAnalytics, IconAutomation, IconIntegrations } from '@/components/icons';
import type { CapabilityPageProps, CapabilityFeature, CapabilityUseCase, CapabilitySpec, CapabilityCTA } from '@/components/CapabilityPageTemplate';

// Factory functions to create typed objects
const createFeature = (icon: ReactNode, title: string, description: string, details: string, bulletPoints: string[]): CapabilityFeature => ({ icon, title, description, details, bulletPoints });
const createUseCase = (title: string, description: string): CapabilityUseCase => ({ title, description });
const createSpec = (label: string, value: string): CapabilitySpec => ({ label, value });
const createCTA = (title: string, description: string, buttonText: string, buttonHref: string): CapabilityCTA => ({ title, description, buttonText, buttonHref });
const createPageData = (pageTitle: string, subtitle: string, introText: string, features: CapabilityFeature[], useCases: CapabilityUseCase[], technicalSpecs: CapabilitySpec[], cta: CapabilityCTA): CapabilityPageProps => ({ pageTitle, title: pageTitle, subtitle, introText, features, useCases, technicalSpecs, cta });

// Configuration mapping for icons
const getIcon = (type: string): ReactNode => {
  switch (type) {
    case 'analytics': return <IconAnalytics size={32} />;
    case 'automation': return <IconAutomation size={32} />;
    case 'integrations': return <IconIntegrations size={32} />;
    default: return <IconAutomation size={32} />;
  }
};

// Raw data configuration mapped to reduce structural duplication
const RAW_PAGES = [
  {
    id: 'advancedAnalytics',
    title: 'Clear Visibility',
    subtitle: 'See what runs. Know what changed. Decide what happens next.',
    intro: "OmniHub aggregates operational data from your connected systems into unified views. Track what happened, identify where things changed, and make informed decisions based on actual system behavior.",
    iconType: 'analytics',
    features: [
      ['360° Operational Visibility', 'Gain complete visibility into your operations with unified dashboards and real-time metrics.', 'OmniHub aggregates data from all connected systems into a single, comprehensive view. Track KPIs, monitor workflows, and identify bottlenecks across your entire operation in real-time.', ['Real-time dashboards with customizable widgets', 'Cross-platform metric aggregation and correlation', 'Drill-down capabilities for root cause analysis', 'Automated anomaly detection and alerts']],
      ['Pattern Analysis', 'Analyze historical data to identify trends. Spot anomalies before they become problems.', 'Track patterns across time. Compare current behavior to historical baselines. Get notified when metrics diverge from expected ranges. Use what happened to inform what comes next.', ['Trend analysis across operational metrics', 'Anomaly detection based on baselines', 'Pattern recognition for recurring issues', 'Historical comparison and forecasting']],
      ['Reporting & Data Export', 'Build custom reports from your operational data. Export to any format you need.', 'Create reports that match your needs. Schedule automatic generation. Export to Excel, PDF, or integrate with external tools. Your data remains portable.', ['Custom report builder with drag-and-drop interface', 'Scheduled report generation and distribution', 'Interactive data exploration and visualization', 'Export capabilities for Excel, PDF, and standard formats']]
    ],
    useCases: [
      ['Executive Performance Dashboards', 'Consolidate KPIs from sales, operations, finance, and customer success into executive-ready dashboards with real-time updates.'],
      ['Workflow Performance Optimization', 'Analyze workflow execution patterns, identify bottlenecks, and receive AI-driven recommendations for optimization.'],
      ['Customer Journey Analytics', 'Track customer interactions across all touchpoints to understand behavior patterns, improve experiences, and increase retention.']
    ],
    specs: [
      ['Data Processing', 'Up to 1 million events/second for analytics'],
      ['Query Performance', 'Sub-second query response on datasets up to 10TB'],
      ['Dashboard Refresh', 'Real-time updates with <100ms latency'],
      ['Data Retention', 'Configurable retention from 30 days to unlimited'],
      ['Visualization Types', 'Charts, graphs, maps, heatmaps, custom widgets'],
      ['Export Formats', 'CSV, Excel, PDF, JSON, API access']
    ],
    cta: ['See your data clearly?', 'Understand how visibility tools help you track and control your systems.', 'Watch Demo', '/demo']
  },
  {
    id: 'aiAutomation',
    title: 'Portable Automation',
    subtitle: 'You define what happens. The system runs it. You can change it anytime.',
    intro: "OmniHub executes workflows across your platforms using modular adapters. Define your logic once. Run it consistently. Swap underlying tools without rewriting workflows. Automation stays under your control.",
    iconType: 'automation',
    features: [
      ['Deterministic Workflows', 'Define business processes that run the same way every time. No surprises.', 'OmniHub executes workflows with receipts and idempotency. Same inputs produce same outputs. Errors get caught and logged. You know exactly what ran and what changed.', ['Define workflows using typed schemas', 'Execution receipts for every operation', 'Automatic retry with idempotency keys', 'Error handling with compensation paths']],
      ['Smart Task Orchestration', 'Coordinate multi-step processes across platforms with intelligent routing and prioritization.', 'The orchestration engine analyzes task dependencies, resource availability, and business priorities to optimize workflow execution automatically.', ['Dynamic task prioritization and scheduling', 'Resource optimization and load balancing', 'Parallel execution with dependency management', 'Real-time progress tracking and reporting']],
      ['Continuous Learning & Optimization', 'AI models that continuously improve based on execution patterns and outcomes.', 'Every workflow execution generates insights that feed back into the AI models, creating a system that gets smarter over time.', ['Pattern recognition and anomaly detection', 'Performance optimization recommendations', 'Automated workflow refinement suggestions', 'Historical trend analysis and forecasting']]
    ],
    useCases: [
      ['Customer Onboarding Automation', 'Streamline customer onboarding across CRM, billing, support, and communication platforms with intelligent data routing and validation.'],
      ['Incident Response Orchestration', 'Automatically detect, categorize, and route incidents to appropriate teams while coordinating cross-platform notifications and escalations.'],
      ['Data Pipeline Management', 'Orchestrate complex data workflows across ETL tools, databases, and analytics platforms with intelligent error recovery and data quality checks.']
    ],
    specs: [
      ['Workflow Capacity', 'Up to 50,000 concurrent workflows'],
      ['Decision Latency', 'Sub-50ms AI-driven decision making (p95)'],
      ['Automation Success Rate', 'successful execution target'],
      ['Learning Models', 'Transformer-based NLP, reinforcement learning, pattern recognition'],
      ['Supported AI Providers', 'OpenAI, Anthropic, Google AI, Azure OpenAI, local models']
    ],
    cta: ['Ready for portable workflows?', 'See how modular automation keeps you in control.', 'Watch Demo', '/demo']
  },
  {
    id: 'omniboard',
    title: 'OmniBoard',
    subtitle: 'Third-party provider and SaaS integration gateway.',
    intro: "OmniBoard governs SaaS and third-party API connections for Salesforce, Slack, GitHub, Stripe, and more. Manage OAuth handoffs, connector sessions, and credential schemas under a unified compliance layer.",
    iconType: 'integrations',
    features: [
      ['Universal SaaS Adapters', 'Connect Slack, Salesforce, GitHub, and enterprise platforms in minutes.', 'OmniBoard handles API authentication, refresh tokens, and rate limits out of the box, ensuring secure and reliable connection states.', ['OAuth 2.0 and API Key credential vaulting', 'Automatic session refresh and renewal', 'Real-time synchronization and webhooks', 'Standardized connector schemas']],
      ['Unified Connection Registry', 'Manage and audit all third-party integrations from a single location.', 'Track active integrations, monitor throughput, and enforce data mapping rules to prevent sensitive data leakage.', ['Active connection auditing and status checks', 'Granular access controls per integration', 'Tenant-scoped isolation safeguards', 'Encryption at rest for all credentials']],
      ['Gateway Availability UX', 'Provide clear, honest user states when external APIs are offline.', 'OmniBoard detects API network failures, downtime, or rate-limiting blockages and displays detailed diagnostic views.', ['Honest failure classification and messages', 'Automatic exponential backoff retries', 'Fallback to offline mock state', 'System health status dashboard']]
    ],
    useCases: [
      ['CRM Data Enrichment', 'Sync customer records and interaction history from Salesforce into the orchestrator securely.'],
      ['Slack Notification Gateway', 'Route governed agent alerts and manual approval prompts to Slack channels with interactive buttons.'],
      ['Repository Event Ingestion', 'Listen to GitHub webhook events to trigger automated code quality assessments and CI workflows.']
    ],
    specs: [
      ['Connector Capacity', 'Dozens of pre-built third-party platforms'],
      ['Session Security', 'Encrypted JWT keys, HSM-backed secret storage'],
      ['Event Latency', 'Sub-second webhook propagation and routing'],
      ['Supported Protocols', 'REST, GraphQL, OAuth 2.0, Webhooks'],
      ['Isolation Model', 'Strict tenant and database separation']
    ],
    cta: ['Ready to unify your systems?', 'Discover how OmniBoard can eliminate data silos and boost productivity.', 'View Integration Catalog', '/integrations/web3']
  },
  {
    id: 'omniSkills',
    title: 'OmniSkills',
    subtitle: 'Forge, install, and govern expert-level agent capabilities.',
    intro: 'OmniSkills are modular, reusable behavioral packages that give your AI agents specific skills and domain expertise. Define skill schemas, run them deterministically, and share skills across your orchestrator instance.',
    iconType: 'automation',
    features: [
      ['Skill Forge', 'Design and compile custom skills using natural language or structured schemas.', 'The Skill Forge translates natural language descriptions into executable skill structures with validation rules, inputs, outputs, and fallback modes.', ['Compile skills from natural language descriptions', 'Automatic input/output schema generation', 'Version control and dependency management', 'Dry-run testing sandbox environment']],
      ['Deterministic Execution', 'Ensure agent actions are predictable, repeatable, and safe.', 'Every forged skill executes within strict policy boundaries, providing execution receipts, audit trails, and automatic error handling.', ['Schema validation on every execution', 'Receipt generation with cryptographic proof', 'Idempotency and automatic retry logic', 'Human-in-the-loop manual approval gates']],
      ['Agent Memory Integration', 'Connect skills to persistent memory and vector search databases.', 'Skills can read and write to partitioned agent memories, enabling continuous learning and knowledge sharing across execution tasks.', ['Context-aware vector database integration', 'Partitioned state per user or system', 'Shared knowledge base synchronization', 'Dynamic semantic retrieval']]
    ],
    useCases: [
      ['Automated Code Auditing', 'Forge a skill that reads code, checks compliance guidelines, runs tests, and signs off on PRs.'],
      ['Multilingual Support Assistant', 'Deploy a customer support skill that integrates translation, knowledge search, and draft generation.'],
      ['Data Analysis Pipeline', 'Orchestrate a skill that fetches operational databases, runs statistical analysis, and generates visualization reports.']
    ],
    specs: [
      ['Execution Latency', 'Sub-100ms validation and routing overhead'],
      ['Skill Registry Capacity', 'Unlimited custom skills per instance'],
      ['Supported Frameworks', 'LangChain, AutoGen, LlamaIndex, custom MCP servers'],
      ['Memory Integration', 'Supabase Vector, pgvector, Pinecone, local embeddings'],
      ['Compliance Auditing', 'Automatic logging to central ledger']
    ],
    cta: ['Ready to forge custom skills?', 'See how OmniSkills can automate complex workflows under strict governance.', 'Watch Demo', '/demo']
  },
  {
    id: 'byom',
    title: 'Connect AI / BYOM',
    subtitle: 'Bring Your Own Model. Zero vendor lock-in, total choice.',
    intro: 'Connect AI / BYOM (Bring Your Own Model) allows you to connect any LLM provider (OpenAI, Anthropic, Google, Azure, or local open-source models) directly into your governed workflows, switching providers with a single toggle.',
    iconType: 'automation',
    features: [
      ['Model Independence', 'Plug in any LLM provider and switch anytime without rewriting logic.', 'OmniHub decouples workflow state from the underlying model provider, allowing you to compare performance, latency, and cost dynamically.', ['Supports OpenAI, Anthropic, Google Gemini, and Llama', 'Local model support via Ollama or custom endpoints', 'Dynamic load balancing and fallback routing', 'Zero codebase changes when swapping models']],
      ['Governed Prompt Templates', 'Store and evaluate system prompts in a secure, audited registry.', 'Prompts are managed as code assets under strict version control. All model calls undergo real-time policy checks before execution.', ['Versioned prompt registry with template variables', 'Vulnerability scanning for prompt injection', 'Dynamic evaluation based on user context', 'A/B testing and performance tracking']],
      ['Unified API Gateway', 'Proxy all model calls through a single secure ingress with rate limiting.', 'Our model proxy handles rate limits, token counting, retry rules, and cost tracking across all provider keys automatically.', ['Centralized API key management with encryption', 'Cost tracking and token usage auditing', 'Automatic request caching to minimize cost', 'Standardized JSON schema outputs']]
    ],
    useCases: [
      ['Multi-Model Fallback', 'Route lightweight classification to local models while using frontier models for complex planning steps.'],
      ['Prompt Injection Shielding', 'Sanitize and validate user inputs before forwarding them to public APIs, protecting enterprise systems.'],
      ['Enterprise Cost Allocation', 'Track token usage and expenses per department, application, or workflow run automatically.']
    ],
    specs: [
      ['Proxy Latency', '<10ms routing and inspection overhead'],
      ['Supported Providers', 'OpenAI, Anthropic, Google, Azure, local APIs'],
      ['Security Compliance', 'No data storage on proxy, end-to-end TLS'],
      ['Format Guarantee', 'Enforced JSON Schema outputs via instructor'],
      ['Caching Layer', 'Redis-backed semantic request caching']
    ],
    cta: ['Ready to run models under governance?', 'Explore how BYOM frees you from provider lock-in.', 'Watch Demo', '/demo']
  }
];

// Map over raw data to create page exports without structural duplication
const PAGES_DATA = RAW_PAGES.reduce((acc, p) => {
  acc[p.id] = createPageData(
    p.title, p.subtitle, p.intro,
    p.features.map(f => createFeature(getIcon(p.iconType), f[0] as string, f[1] as string, f[2] as string, f[3] as string[])),
    p.useCases.map(u => createUseCase(u[0] as string, u[1] as string)),
    p.specs.map(s => createSpec(s[0] as string, s[1] as string)),
    createCTA(p.cta[0] as string, p.cta[1] as string, p.cta[2] as string, p.cta[3] as string)
  );
  return acc;
}, {} as Record<string, CapabilityPageProps>);

export const advancedAnalyticsData = PAGES_DATA.advancedAnalytics;
export const aiAutomationData = PAGES_DATA.aiAutomation;
export const omniboardData = PAGES_DATA.omniboard;
export const omniSkillsData = PAGES_DATA.omniSkills;
export const byomData = PAGES_DATA.byom;
