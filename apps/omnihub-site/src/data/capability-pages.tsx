/**
 * Capability page data definitions.
 * Uses factory pattern to eliminate structural duplication.
 */
import type { ReactNode } from 'react';
import { IconAnalytics, IconAutomation, IconIntegrations } from '@/components/icons';
import type { CapabilityPageProps, CapabilityFeature, CapabilityUseCase, CapabilitySpec, CapabilityCTA } from '@/components/CapabilityPageTemplate';

// Factory function to create feature objects
const createFeature = (
  icon: ReactNode,
  title: string,
  description: string,
  details: string,
  bulletPoints: string[]
): CapabilityFeature => ({ icon, title, description, details, bulletPoints });

// Factory function to create use case objects
const createUseCase = (title: string, description: string): CapabilityUseCase => ({ title, description });

// Factory function to create spec objects
const createSpec = (label: string, value: string): CapabilitySpec => ({ label, value });

// Factory function to create CTA objects
const createCTA = (title: string, description: string, buttonText: string, buttonHref: string): CapabilityCTA => ({ title, description, buttonText, buttonHref });

// Factory function to create page data
const createPageData = (
  pageTitle: string,
  subtitle: string,
  introText: string,
  features: CapabilityFeature[],
  useCases: CapabilityUseCase[],
  technicalSpecs: CapabilitySpec[],
  cta: CapabilityCTA
): CapabilityPageProps => ({ pageTitle, title: pageTitle, subtitle, introText, features, useCases, technicalSpecs, cta });

// Analytics page data
export const advancedAnalyticsData = createPageData(
  'Clear Visibility',
  'See what runs. Know what changed. Decide what happens next.',
  "OmniHub aggregates operational data from your connected systems into unified views. Track what happened, identify where things changed, and make informed decisions based on actual system behavior.",
  [
    createFeature(<IconAnalytics size={32} />, '360° Operational Visibility', 'Gain complete visibility into your operations with unified dashboards and real-time metrics.', 'OmniHub aggregates data from all connected systems into a single, comprehensive view. Track KPIs, monitor workflows, and identify bottlenecks across your entire operation in real-time.', ['Real-time dashboards with customizable widgets', 'Cross-platform metric aggregation and correlation', 'Drill-down capabilities for root cause analysis', 'Automated anomaly detection and alerts']),
    createFeature(<IconAnalytics size={32} />, 'Pattern Analysis', 'Analyze historical data to identify trends. Spot anomalies before they become problems.', 'Track patterns across time. Compare current behavior to historical baselines. Get notified when metrics diverge from expected ranges. Use what happened to inform what comes next.', ['Trend analysis across operational metrics', 'Anomaly detection based on baselines', 'Pattern recognition for recurring issues', 'Historical comparison and forecasting']),
    createFeature(<IconAnalytics size={32} />, 'Reporting & Data Export', 'Build custom reports from your operational data. Export to any format you need.', 'Create reports that match your needs. Schedule automatic generation. Export to Excel, PDF, or integrate with external tools. Your data remains portable.', ['Custom report builder with drag-and-drop interface', 'Scheduled report generation and distribution', 'Interactive data exploration and visualization', 'Export capabilities for Excel, PDF, and standard formats']),
  ],
  [createUseCase('Executive Performance Dashboards', 'Consolidate KPIs from sales, operations, finance, and customer success into executive-ready dashboards with real-time updates.'), createUseCase('Workflow Performance Optimization', 'Analyze workflow execution patterns, identify bottlenecks, and receive AI-driven recommendations for optimization.'), createUseCase('Customer Journey Analytics', 'Track customer interactions across all touchpoints to understand behavior patterns, improve experiences, and increase retention.')],
  [createSpec('Data Processing', 'Up to 1 million events/second for analytics'), createSpec('Query Performance', 'Sub-second query response on datasets up to 10TB'), createSpec('Dashboard Refresh', 'Real-time updates with <100ms latency'), createSpec('Data Retention', 'Configurable retention from 30 days to unlimited'), createSpec('Visualization Types', 'Charts, graphs, maps, heatmaps, custom widgets'), createSpec('Export Formats', 'CSV, Excel, PDF, JSON, API access')],
  createCTA('See your data clearly?', 'Understand how visibility tools help you track and control your systems.', 'Watch Demo', '/demo')
);

// Automation page data
export const aiAutomationData = createPageData(
  'Portable Automation',
  'You define what happens. The system runs it. You can change it anytime.',
  "OmniHub executes workflows across your platforms using modular adapters. Define your logic once. Run it consistently. Swap underlying tools without rewriting workflows. Automation stays under your control.",
  [
    createFeature(<IconAutomation size={32} />, 'Deterministic Workflows', 'Define business processes that run the same way every time. No surprises.', "OmniHub executes workflows with receipts and idempotency. Same inputs produce same outputs. Errors get caught and logged. You know exactly what ran and what changed.", ['Define workflows using typed schemas', 'Execution receipts for every operation', 'Automatic retry with idempotency keys', 'Error handling with compensation paths']),
    createFeature(<IconAutomation size={32} />, 'Smart Task Orchestration', 'Coordinate multi-step processes across platforms with intelligent routing and prioritization.', 'The orchestration engine analyzes task dependencies, resource availability, and business priorities to optimize workflow execution automatically.', ['Dynamic task prioritization and scheduling', 'Resource optimization and load balancing', 'Parallel execution with dependency management', 'Real-time progress tracking and reporting']),
    createFeature(<IconAutomation size={32} />, 'Continuous Learning & Optimization', 'AI models that continuously improve based on execution patterns and outcomes.', 'Every workflow execution generates insights that feed back into the AI models, creating a system that gets smarter over time.', ['Pattern recognition and anomaly detection', 'Performance optimization recommendations', 'Automated workflow refinement suggestions', 'Historical trend analysis and forecasting']),
  ],
  [createUseCase('Customer Onboarding Automation', 'Streamline customer onboarding across CRM, billing, support, and communication platforms with intelligent data routing and validation.'), createUseCase('Incident Response Orchestration', 'Automatically detect, categorize, and route incidents to appropriate teams while coordinating cross-platform notifications and escalations.'), createUseCase('Data Pipeline Management', 'Orchestrate complex data workflows across ETL tools, databases, and analytics platforms with intelligent error recovery and data quality checks.')],
  [createSpec('Workflow Capacity', 'Up to 50,000 concurrent workflows'), createSpec('Decision Latency', 'Sub-50ms AI-driven decision making (p95)'), createSpec('Automation Success Rate', 'successful execution target'), createSpec('Learning Models', 'Transformer-based NLP, reinforcement learning, pattern recognition'), createSpec('Supported AI Providers', 'OpenAI, Anthropic, Google AI, Azure OpenAI, local models')],
  createCTA('Ready for portable workflows?', 'See how modular automation keeps you in control.', 'Watch Demo', '/demo')
);

// OmniBoard page data
export const omniboardData = createPageData(
  'OmniBoard',
  'Third-party provider and SaaS integration gateway.',
  "OmniBoard governs SaaS and third-party API connections for Salesforce, Slack, GitHub, Stripe, and more. Manage OAuth handoffs, connector sessions, and credential schemas under a unified compliance layer.",
  [
    createFeature(<IconIntegrations size={32} />, 'Universal SaaS Adapters', 'Connect Slack, Salesforce, GitHub, and enterprise platforms in minutes.', 'OmniBoard handles API authentication, refresh tokens, and rate limits out of the box, ensuring secure and reliable connection states.', ['OAuth 2.0 and API Key credential vaulting', 'Automatic session refresh and renewal', 'Real-time synchronization and webhooks', 'Standardized connector schemas']),
    createFeature(<IconIntegrations size={32} />, 'Unified Connection Registry', 'Manage and audit all third-party integrations from a single location.', 'Track active integrations, monitor throughput, and enforce data mapping rules to prevent sensitive data leakage.', ['Active connection auditing and status checks', 'Granular access controls per integration', 'Tenant-scoped isolation safeguards', 'Encryption at rest for all credentials']),
    createFeature(<IconIntegrations size={32} />, 'Gateway Availability UX', 'Provide clear, honest user states when external APIs are offline.', 'OmniBoard detects API network failures, downtime, or rate-limiting blockages and displays detailed diagnostic views.', ['Honest failure classification and messages', 'Automatic exponential backoff retries', 'Fallback to offline mock state', 'System health status dashboard']),
  ],
  [
    createUseCase('CRM Data Enrichment', 'Sync customer records and interaction history from Salesforce into the orchestrator securely.'),
    createUseCase('Slack Notification Gateway', 'Route governed agent alerts and manual approval prompts to Slack channels with interactive buttons.'),
    createUseCase('Repository Event Ingestion', 'Listen to GitHub webhook events to trigger automated code quality assessments and CI workflows.')
  ],
  [
    createSpec('Connector Capacity', 'Dozens of pre-built third-party platforms'),
    createSpec('Session Security', 'Encrypted JWT keys, HSM-backed secret storage'),
    createSpec('Event Latency', 'Sub-second webhook propagation and routing'),
    createSpec('Supported Protocols', 'REST, GraphQL, OAuth 2.0, Webhooks'),
    createSpec('Isolation Model', 'Strict tenant and database separation')
  ],
  createCTA('Ready to unify your systems?', 'Discover how OmniBoard can eliminate data silos and boost productivity.', 'View Integration Catalog', '/integrations/web3')
);

// OmniSkills page data
export const omniSkillsData = createPageData(
  'OmniSkills',
  'Forge, install, and govern expert-level agent capabilities.',
  'OmniSkills are modular, reusable behavioral packages that give your AI agents specific skills and domain expertise. Define skill schemas, run them deterministically, and share skills across your orchestrator instance.',
  [
    createFeature(<IconAutomation size={32} />, 'Skill Forge', 'Design and compile custom skills using natural language or structured schemas.', 'The Skill Forge translates natural language descriptions into executable skill structures with validation rules, inputs, outputs, and fallback modes.', ['Compile skills from natural language descriptions', 'Automatic input/output schema generation', 'Version control and dependency management', 'Dry-run testing sandbox environment']),
    createFeature(<IconAutomation size={32} />, 'Deterministic Execution', 'Ensure agent actions are predictable, repeatable, and safe.', 'Every forged skill executes within strict policy boundaries, providing execution receipts, audit trails, and automatic error handling.', ['Schema validation on every execution', 'Receipt generation with cryptographic proof', 'Idempotency and automatic retry logic', 'Human-in-the-loop manual approval gates']),
    createFeature(<IconAutomation size={32} />, 'Agent Memory Integration', 'Connect skills to persistent memory and vector search databases.', 'Skills can read and write to partitioned agent memories, enabling continuous learning and knowledge sharing across execution tasks.', ['Context-aware vector database integration', 'Partitioned state per user or system', 'Shared knowledge base synchronization', 'Dynamic semantic retrieval']),
  ],
  [
    createUseCase('Automated Code Auditing', 'Forge a skill that reads code, checks compliance guidelines, runs tests, and signs off on PRs.'),
    createUseCase('Multilingual Support Assistant', 'Deploy a customer support skill that integrates translation, knowledge search, and draft generation.'),
    createUseCase('Data Analysis Pipeline', 'Orchestrate a skill that fetches operational databases, runs statistical analysis, and generates visualization reports.')
  ],
  [
    createSpec('Execution Latency', 'Sub-100ms validation and routing overhead'),
    createSpec('Skill Registry Capacity', 'Unlimited custom skills per instance'),
    createSpec('Supported Frameworks', 'LangChain, AutoGen, LlamaIndex, custom MCP servers'),
    createSpec('Memory Integration', 'Supabase Vector, pgvector, Pinecone, local embeddings'),
    createSpec('Compliance Auditing', 'Automatic logging to central ledger')
  ],
  createCTA('Ready to forge custom skills?', 'See how OmniSkills can automate complex workflows under strict governance.', 'Watch Demo', '/demo')
);

// BYOM page data
export const byomData = createPageData(
  'Connect AI / BYOM',
  'Bring Your Own Model. Zero vendor lock-in, total choice.',
  'Connect AI / BYOM (Bring Your Own Model) allows you to connect any LLM provider (OpenAI, Anthropic, Google, Azure, or local open-source models) directly into your governed workflows, switching providers with a single toggle.',
  [
    createFeature(<IconAutomation size={32} />, 'Model Independence', 'Plug in any LLM provider and switch anytime without rewriting logic.', 'OmniHub decouples workflow state from the underlying model provider, allowing you to compare performance, latency, and cost dynamically.', ['Supports OpenAI, Anthropic, Google Gemini, and Llama', 'Local model support via Ollama or custom endpoints', 'Dynamic load balancing and fallback routing', 'Zero codebase changes when swapping models']),
    createFeature(<IconAutomation size={32} />, 'Governed Prompt Templates', 'Store and evaluate system prompts in a secure, audited registry.', 'Prompts are managed as code assets under strict version control. All model calls undergo real-time policy checks before execution.', ['Versioned prompt registry with template variables', 'Vulnerability scanning for prompt injection', 'Dynamic evaluation based on user context', 'A/B testing and performance tracking']),
    createFeature(<IconAutomation size={32} />, 'Unified API Gateway', 'Proxy all model calls through a single secure ingress with rate limiting.', 'Our model proxy handles rate limits, token counting, retry rules, and cost tracking across all provider keys automatically.', ['Centralized API key management with encryption', 'Cost tracking and token usage auditing', 'Automatic request caching to minimize cost', 'Standardized JSON schema outputs']),
  ],
  [
    createUseCase('Multi-Model Fallback', 'Route lightweight classification to local models while using frontier models for complex planning steps.'),
    createUseCase('Prompt Injection Shielding', 'Sanitize and validate user inputs before forwarding them to public APIs, protecting enterprise systems.'),
    createUseCase('Enterprise Cost Allocation', 'Track token usage and expenses per department, application, or workflow run automatically.')
  ],
  [
    createSpec('Proxy Latency', '<10ms routing and inspection overhead'),
    createSpec('Supported Providers', 'OpenAI, Anthropic, Google, Azure, local APIs'),
    createSpec('Security Compliance', 'No data storage on proxy, end-to-end TLS'),
    createSpec('Format Guarantee', 'Enforced JSON Schema outputs via instructor'),
    createSpec('Caching Layer', 'Redis-backed semantic request caching')
  ],
  createCTA('Ready to run models under governance?', 'Explore how BYOM frees you from provider lock-in.', 'Watch Demo', '/demo')
);

