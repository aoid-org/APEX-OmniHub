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
  'Advanced Analytics',
  'Gain a 360° view of your organization. Make data-driven decisions with cutting-edge insights.',
  "OmniHub's Advanced Analytics transforms raw operational data into strategic insights. By aggregating and analyzing data from all your connected systems, you gain unprecedented visibility into your organization's performance, enabling faster, more informed decision-making.",
  [
    createFeature(<IconAnalytics size={32} />, '360° Operational Visibility', 'Gain complete visibility into your operations with unified dashboards and real-time metrics.', 'OmniHub aggregates data from all connected systems into a single, comprehensive view. Track KPIs, monitor workflows, and identify bottlenecks across your entire operation in real-time.', ['Real-time dashboards with customizable widgets', 'Cross-platform metric aggregation and correlation', 'Drill-down capabilities for root cause analysis', 'Automated anomaly detection and alerts']),
    createFeature(<IconAnalytics size={32} />, 'Predictive Intelligence', 'Leverage AI-powered predictive analytics to anticipate trends and optimize operations.', 'Advanced machine learning models analyze historical patterns and current trends to provide actionable insights and forecasts, helping you stay ahead of potential issues and opportunities.', ['Forecasting models for resource planning', 'Trend analysis and pattern recognition', 'Predictive maintenance and issue detection', 'What-if scenario modeling and simulation']),
    createFeature(<IconAnalytics size={32} />, 'Business Intelligence & Reporting', 'Transform raw data into actionable insights with powerful BI tools and custom reporting.', 'Create custom reports, automate distribution, and enable self-service analytics for stakeholders across your organization. From executive summaries to detailed operational reports, OmniHub delivers the insights you need.', ['Custom report builder with drag-and-drop interface', 'Scheduled report generation and distribution', 'Interactive data exploration and visualization', 'Export capabilities for Excel, PDF, and BI tools']),
  ],
  [createUseCase('Executive Performance Dashboards', 'Consolidate KPIs from sales, operations, finance, and customer success into executive-ready dashboards with real-time updates.'), createUseCase('Workflow Performance Optimization', 'Analyze workflow execution patterns, identify bottlenecks, and receive AI-driven recommendations for optimization.'), createUseCase('Customer Journey Analytics', 'Track customer interactions across all touchpoints to understand behavior patterns, improve experiences, and increase retention.')],
  [createSpec('Data Processing', 'Up to 1 million events/second for analytics'), createSpec('Query Performance', 'Sub-second query response on datasets up to 10TB'), createSpec('Dashboard Refresh', 'Real-time updates with <100ms latency'), createSpec('Data Retention', 'Configurable retention from 30 days to unlimited'), createSpec('Visualization Types', 'Charts, graphs, maps, heatmaps, custom widgets'), createSpec('Export Formats', 'CSV, Excel, PDF, JSON, API access')],
  createCTA('Ready to unlock insights?', 'Discover how Advanced Analytics can transform your data into strategic advantages.', 'Schedule a Demo', '/demo.html')
);

// Automation page data
export const aiAutomationData = createPageData(
  'AI-Powered Automation',
  'Imagine a platform that anticipates your needs and streamlines your operations effortlessly',
  "OmniHub's AI-powered automation transforms how businesses operate by combining intelligent decision-making with seamless execution across all your platforms. The system learns from every interaction, continuously improving its ability to handle complex workflows with minimal human intervention.",
  [
    createFeature(<IconAutomation size={32} />, 'Intelligent Workflow Automation', 'Automate complex business processes with AI-driven decision making and adaptive execution.', "OmniHub's AI-powered automation goes beyond simple task automation. It understands context, learns from patterns, and adapts to changing conditions in real-time.", ['Natural language workflow creation and modification', 'Adaptive execution based on real-time conditions', 'Intelligent error handling and self-healing processes', 'Predictive analytics for proactive optimization']),
    createFeature(<IconAutomation size={32} />, 'Smart Task Orchestration', 'Coordinate multi-step processes across platforms with intelligent routing and prioritization.', 'The orchestration engine analyzes task dependencies, resource availability, and business priorities to optimize workflow execution automatically.', ['Dynamic task prioritization and scheduling', 'Resource optimization and load balancing', 'Parallel execution with dependency management', 'Real-time progress tracking and reporting']),
    createFeature(<IconAutomation size={32} />, 'Continuous Learning & Optimization', 'AI models that continuously improve based on execution patterns and outcomes.', 'Every workflow execution generates insights that feed back into the AI models, creating a system that gets smarter over time.', ['Pattern recognition and anomaly detection', 'Performance optimization recommendations', 'Automated workflow refinement suggestions', 'Historical trend analysis and forecasting']),
  ],
  [createUseCase('Customer Onboarding Automation', 'Streamline customer onboarding across CRM, billing, support, and communication platforms with intelligent data routing and validation.'), createUseCase('Incident Response Orchestration', 'Automatically detect, categorize, and route incidents to appropriate teams while coordinating cross-platform notifications and escalations.'), createUseCase('Data Pipeline Management', 'Orchestrate complex data workflows across ETL tools, databases, and analytics platforms with intelligent error recovery and data quality checks.')],
  [createSpec('Workflow Capacity', 'Up to 50,000 concurrent workflows'), createSpec('Decision Latency', 'Sub-50ms AI-driven decision making (p95)'), createSpec('Automation Success Rate', '99.7% successful execution rate'), createSpec('Learning Models', 'Transformer-based NLP, reinforcement learning, pattern recognition'), createSpec('Supported AI Providers', 'OpenAI, Anthropic, Google AI, Azure OpenAI, local models')],
  createCTA('Ready to automate intelligently?', 'Discover how AI-powered automation can transform your operations.', 'Request a Demo', '/demo.html')
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
  createCTA('Ready to unify your systems?', 'Discover how Smart Integrations can eliminate data silos and boost productivity.', 'View Integration Catalog', '/tech-specs.html')
);
