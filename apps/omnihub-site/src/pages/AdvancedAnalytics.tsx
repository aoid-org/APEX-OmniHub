import { Icons } from '@/components/icons';
import { CapabilityPageTemplate } from '@/components/CapabilityPageTemplate';
import type { CapabilityPageProps } from '@/components/CapabilityPageTemplate';

const pageData: CapabilityPageProps = {
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

export function AdvancedAnalyticsPage() {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <CapabilityPageTemplate {...pageData} />;
}
