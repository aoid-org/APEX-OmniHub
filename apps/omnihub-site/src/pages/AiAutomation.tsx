import { Icons } from '@/components/icons';
import { CapabilityPageTemplate } from '@/components/CapabilityPageTemplate';
import type { CapabilityPageProps } from '@/components/CapabilityPageTemplate';

const pageData: CapabilityPageProps = {
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

export function AiAutomationPage() {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <CapabilityPageTemplate {...pageData} />;
}
