import { Icons } from '@/components/icons';
import type { CapabilityPageProps } from '@/components/CapabilityPageTemplate';
import React from 'react';

export const ADVANCED_ANALYTICS_DATA: CapabilityPageProps = {
  pageTitle: 'Advanced Analytics',
  title: 'Advanced Analytics',
  subtitle: 'Gain a 360° view of your organization. Make data-driven decisions with cutting-edge insights.',
  introText: 'OmniHub\'s Advanced Analytics transforms raw operational data into strategic insights. By aggregating and analyzing data from all your connected systems, you gain unprecedented visibility into your organization\'s performance, enabling faster, more informed decision-making.',
  features: [
    {
      icon: <Icons.Analytics size={32} />,
      title: '360° Operational Visibility',
      description: 'Gain complete visibility into your operations with unified dashboards and real-time metrics.',
      details: 'OmniHub aggregates data from all connected systems into a single, comprehensive view. Track KPIs, monitor workflows, and identify bottlenecks across your entire operation in real-time.',
      bulletPoints: [
        'Real-time dashboards with customizable widgets',
        'Cross-platform metric aggregation and correlation',
        'Drill-down capabilities for root cause analysis',
        'Automated anomaly detection and alerts',
      ],
    },
    {
      icon: <Icons.Analytics size={32} />,
      title: 'Predictive Intelligence',
      description: 'Leverage AI-powered predictive analytics to anticipate trends and optimize operations.',
      details: 'Advanced machine learning models analyze historical patterns and current trends to provide actionable insights and forecasts, helping you stay ahead of potential issues and opportunities.',
      bulletPoints: [
        'Forecasting models for resource planning',
        'Trend analysis and pattern recognition',
        'Predictive maintenance and issue detection',
        'What-if scenario modeling and simulation',
      ],
    },
    {
      icon: <Icons.Analytics size={32} />,
      title: 'Business Intelligence & Reporting',
      description: 'Transform raw data into actionable insights with powerful BI tools and custom reporting.',
      details: 'Create custom reports, automate distribution, and enable self-service analytics for stakeholders across your organization. From executive summaries to detailed operational reports, OmniHub delivers the insights you need.',
      bulletPoints: [
        'Custom report builder with drag-and-drop interface',
        'Scheduled report generation and distribution',
        'Interactive data exploration and visualization',
        'Export capabilities for Excel, PDF, and BI tools',
      ],
    },
  ],
  useCases: [
    {
      title: 'Executive Performance Dashboards',
      description: 'Consolidate KPIs from sales, operations, finance, and customer success into executive-ready dashboards with real-time updates.',
    },
    {
      title: 'Workflow Performance Optimization',
      description: 'Analyze workflow execution patterns, identify bottlenecks, and receive AI-driven recommendations for optimization.',
    },
    {
      title: 'Customer Journey Analytics',
      description: 'Track customer interactions across all touchpoints to understand behavior patterns, improve experiences, and increase retention.',
    },
  ],
  technicalSpecs: [
    { label: 'Data Processing', value: 'Up to 1 million events/second for analytics' },
    { label: 'Query Performance', value: 'Sub-second query response on datasets up to 10TB' },
    { label: 'Dashboard Refresh', value: 'Real-time updates with <100ms latency' },
    { label: 'Data Retention', value: 'Configurable retention from 30 days to unlimited' },
    { label: 'Visualization Types', value: 'Charts, graphs, maps, heatmaps, custom widgets' },
    { label: 'Export Formats', value: 'CSV, Excel, PDF, JSON, API access' },
  ],
  cta: {
    title: 'Ready to unlock insights?',
    description: 'Discover how Advanced Analytics can transform your data into strategic advantages.',
    buttonText: 'Schedule a Demo',
    buttonHref: '/demo.html',
  },
};

export const AI_AUTOMATION_DATA: CapabilityPageProps = {
  pageTitle: 'AI-Powered Automation',
  title: 'AI-Powered Automation',
  subtitle: 'Imagine a platform that anticipates your needs and streamlines your operations effortlessly',
  introText: 'OmniHub\'s AI-powered automation transforms how businesses operate by combining intelligent decision-making with seamless execution across all your platforms. The system learns from every interaction, continuously improving its ability to handle complex workflows with minimal human intervention.',
  features: [
    {
      icon: <Icons.Automation size={32} />,
      title: 'Intelligent Workflow Automation',
      description: 'Automate complex business processes with AI-driven decision making and adaptive execution.',
      details: 'OmniHub\'s AI-powered automation goes beyond simple task automation. It understands context, learns from patterns, and adapts to changing conditions in real-time.',
      bulletPoints: [
        'Natural language workflow creation and modification',
        'Adaptive execution based on real-time conditions',
        'Intelligent error handling and self-healing processes',
        'Predictive analytics for proactive optimization',
      ],
    },
    {
      icon: <Icons.Automation size={32} />,
      title: 'Smart Task Orchestration',
      description: 'Coordinate multi-step processes across platforms with intelligent routing and prioritization.',
      details: 'The orchestration engine analyzes task dependencies, resource availability, and business priorities to optimize workflow execution automatically.',
      bulletPoints: [
        'Dynamic task prioritization and scheduling',
        'Resource optimization and load balancing',
        'Parallel execution with dependency management',
        'Real-time progress tracking and reporting',
      ],
    },
    {
      icon: <Icons.Automation size={32} />,
      title: 'Continuous Learning & Optimization',
      description: 'AI models that continuously improve based on execution patterns and outcomes.',
      details: 'Every workflow execution generates insights that feed back into the AI models, creating a system that gets smarter over time.',
      bulletPoints: [
        'Pattern recognition and anomaly detection',
        'Performance optimization recommendations',
        'Automated workflow refinement suggestions',
        'Historical trend analysis and forecasting',
      ],
    },
  ],
  useCases: [
    {
      title: 'Customer Onboarding Automation',
      description: 'Streamline customer onboarding across CRM, billing, support, and communication platforms with intelligent data routing and validation.',
    },
    {
      title: 'Incident Response Orchestration',
      description: 'Automatically detect, categorize, and route incidents to appropriate teams while coordinating cross-platform notifications and escalations.',
    },
    {
      title: 'Data Pipeline Management',
      description: 'Orchestrate complex data workflows across ETL tools, databases, and analytics platforms with intelligent error recovery and data quality checks.',
    },
  ],
  technicalSpecs: [
    { label: 'Workflow Capacity', value: 'Up to 50,000 concurrent workflows' },
    { label: 'Decision Latency', value: 'Sub-50ms AI-driven decision making (p95)' },
    { label: 'Automation Success Rate', value: '99.7% successful execution rate' },
    { label: 'Learning Models', value: 'Transformer-based NLP, reinforcement learning, pattern recognition' },
    { label: 'Supported AI Providers', value: 'OpenAI, Anthropic, Google AI, Azure OpenAI, local models' },
  ],
  cta: {
    title: 'Ready to automate intelligently?',
    description: 'Discover how AI-powered automation can transform your operations.',
    buttonText: 'Request a Demo',
    buttonHref: '/demo.html',
  },
};

export const SMART_INTEGRATIONS_DATA: CapabilityPageProps = {
  pageTitle: 'Smart Integrations',
  title: 'Smart Integrations',
  subtitle: 'Unify your tools and data into one intelligent system. Say goodbye to silos and productivity bottlenecks.',
  introText: 'OmniHub\'s Smart Integrations eliminate the complexity of connecting disparate systems by providing a unified integration layer that speaks every platform\'s language. Whether you\'re integrating legacy systems, modern SaaS applications, or custom-built tools, OmniHub makes it seamless.',
  features: [
    {
      icon: <Icons.Integrations size={32} />,
      title: 'Universal Connectivity',
      description: 'Connect to any platform with pre-built adapters and custom integration capabilities.',
      details: 'OmniHub provides a comprehensive library of pre-built integrations for enterprise systems, SaaS platforms, and modern APIs, with the flexibility to create custom adapters for proprietary systems.',
      bulletPoints: [
        'Pre-built adapters for 100+ enterprise platforms',
        'Custom adapter creation framework with SDK',
        'API-first design supporting REST, GraphQL, gRPC, and WebSocket',
        'Legacy system support via SOAP, FTP, and database connectors',
      ],
    },
    {
      icon: <Icons.Integrations size={32} />,
      title: 'Unified Data Model',
      description: 'Break down data silos with a canonical data model that normalizes information across all platforms.',
      details: 'The unified data model transforms disparate data formats into a single, consistent representation, enabling seamless data flow and reducing integration complexity.',
      bulletPoints: [
        'Automatic data transformation and normalization',
        'Type-safe data mapping with validation',
        'Bidirectional sync with conflict resolution',
        'Data quality checks and enrichment',
      ],
    },
    {
      icon: <Icons.Integrations size={32} />,
      title: 'Real-Time Synchronization',
      description: 'Keep data synchronized across all platforms in real-time with intelligent change detection.',
      details: 'OmniHub monitors data changes across all connected systems and propagates updates instantly, ensuring consistency while minimizing network overhead through smart batching and deduplication.',
      bulletPoints: [
        'Event-driven architecture for instant updates',
        'Change data capture (CDC) for database sync',
        'Intelligent batching and throttling',
        'Conflict detection and resolution strategies',
      ],
    },
  ],
  useCases: [
    {
      title: 'CRM-ERP Integration',
      description: 'Synchronize customer data, orders, and inventory between CRM and ERP systems in real-time, eliminating data silos and manual data entry.',
    },
    {
      title: 'Marketing Platform Unification',
      description: 'Connect email marketing, social media, analytics, and advertising platforms for a unified view of campaign performance and customer engagement.',
    },
    {
      title: 'Multi-Cloud Data Integration',
      description: 'Integrate data across AWS, Azure, and Google Cloud platforms while maintaining data governance and compliance requirements.',
    },
  ],
  technicalSpecs: [
    { label: 'Integration Capacity', value: '10,000+ active integrations per instance' },
    { label: 'Sync Latency', value: 'Sub-5 second real-time synchronization (p95)' },
    { label: 'Data Throughput', value: 'Up to 100,000 records/second' },
    { label: 'Supported Platforms', value: 'Salesforce, SAP, Oracle, Microsoft, Google, AWS, Slack, Jira, 100+ more' },
    { label: 'Protocol Support', value: 'REST, GraphQL, gRPC, WebSocket, SOAP, MQTT, AMQP, Kafka, SFTP' },
  ],
  cta: {
    title: 'Ready to unify your systems?',
    description: 'Discover how Smart Integrations can eliminate data silos and boost productivity.',
    buttonText: 'View Integration Catalog',
    buttonHref: '/tech-specs.html',
  },
};
