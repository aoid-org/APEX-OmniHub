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
  [createSpec('Workflow Capacity', 'Up to 50,000 concurrent workflows'), createSpec('Decision Latency', 'Sub-50ms AI-driven decision making (p95)'), createSpec('Automation Success Rate', '99.7% successful execution rate'), createSpec('Learning Models', 'Transformer-based NLP, reinforcement learning, pattern recognition'), createSpec('Supported AI Providers', 'OpenAI, Anthropic, Google AI, Azure OpenAI, local models')],
  createCTA('Ready for portable workflows?', 'See how modular automation keeps you in control.', 'Watch Demo', '/demo')
);

// Integrations page data
export const smartIntegrationsData = createPageData(
  'Smart Integrations',
  'Unify your tools and data into one intelligent system. Say goodbye to silos and productivity bottlenecks.',
  "OmniHub's Smart Integrations eliminate the complexity of connecting disparate systems by providing a unified integration layer that speaks every platform's language. Whether you're integrating legacy systems, modern SaaS applications, or custom-built tools, OmniHub makes it seamless.",
  [
    createFeature(<IconIntegrations size={32} />, 'Universal Connectivity', 'Connect to any platform with pre-built adapters and custom integration capabilities.', 'OmniHub provides a comprehensive library of pre-built integrations for enterprise systems, SaaS platforms, and modern APIs, with the flexibility to create custom adapters for proprietary systems.', ['Pre-built adapters for 100+ enterprise platforms', 'Custom adapter creation framework with SDK', 'API-first design supporting REST, GraphQL, gRPC, and WebSocket', 'Legacy system support via SOAP, FTP, and database connectors']),
    createFeature(<IconIntegrations size={32} />, 'Unified Data Model', 'Break down data silos with a canonical data model that normalizes information across all platforms.', 'The unified data model transforms disparate data formats into a single, consistent representation, enabling seamless data flow and reducing integration complexity.', ['Automatic data transformation and normalization', 'Type-safe data mapping with validation', 'Bidirectional sync with conflict resolution', 'Data quality checks and enrichment']),
    createFeature(<IconIntegrations size={32} />, 'Real-Time Synchronization', 'Keep data synchronized across all platforms in real-time with intelligent change detection.', 'OmniHub monitors data changes across all connected systems and propagates updates instantly, ensuring consistency while minimizing network overhead through smart batching and deduplication.', ['Event-driven architecture for instant updates', 'Change data capture (CDC) for database sync', 'Intelligent batching and throttling', 'Conflict detection and resolution strategies']),
  ],
  [createUseCase('CRM-ERP Integration', 'Synchronize customer data, orders, and inventory between CRM and ERP systems in real-time, eliminating data silos and manual data entry.'), createUseCase('Marketing Platform Unification', 'Connect email marketing, social media, analytics, and advertising platforms for a unified view of campaign performance and customer engagement.'), createUseCase('Multi-Cloud Data Integration', 'Integrate data across AWS, Azure, and Google Cloud platforms while maintaining data governance and compliance requirements.')],
  [createSpec('Integration Capacity', '10,000+ active integrations per instance'), createSpec('Sync Latency', 'Sub-5 second real-time synchronization (p95)'), createSpec('Data Throughput', 'Up to 100,000 records/second'), createSpec('Supported Platforms', 'Salesforce, SAP, Oracle, Microsoft, Google, AWS, Slack, Jira, 100+ more'), createSpec('Protocol Support', 'REST, GraphQL, gRPC, WebSocket, SOAP, MQTT, AMQP, Kafka, SFTP')],
  createCTA('Ready to unify your systems?', 'Discover how Smart Integrations can eliminate data silos and boost productivity.', 'View Integration Catalog', '/tech-specs')
);
