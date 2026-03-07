import { useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import { CTAGroup } from '@/components/CTAGroup';
import { DemoVideoPlayer } from '@/components/DemoVideoPlayer';
import { demoConfig, siteConfig } from '@/content/site';

const WORKFLOW_STEPS = [
  { id: 'connect', label: 'Connect Salesforce', detail: 'OAuth handshake with CRM adapter' },
  { id: 'translate', label: 'Translate Events', detail: 'Map lead data to canonical OmniHub schema' },
  { id: 'execute', label: 'Execute Workflow', detail: 'Create Slack channel + send welcome email' },
  { id: 'audit', label: 'Log & Verify', detail: 'Immutable audit trail with cryptographic receipt' },
] as const;

function InteractiveWorkflowDemo() {
  const [activeStep, setActiveStep] = useState(-1);
  const [completed, setCompleted] = useState<ReadonlySet<string>>(new Set());
  const [running, setRunning] = useState(false);

  const runWorkflow = useCallback(() => {
    if (running) return;
    setRunning(true);
    setCompleted(new Set());
    setActiveStep(0);

    WORKFLOW_STEPS.forEach((step, idx) => {
      setTimeout(() => {
        setActiveStep(idx);
      }, idx * 1200);
      setTimeout(() => {
        setCompleted(prev => new Set([...prev, step.id]));
        if (idx === WORKFLOW_STEPS.length - 1) {
          setTimeout(() => { setActiveStep(-1); setRunning(false); }, 800);
        }
      }, idx * 1200 + 900);
    });
  }, [running]);

  return (
    <div className="card" style={{ padding: 'var(--space-8)' }}>
      <h3 className="heading-4">{demoConfig.interactivePlaceholder.title}</h3>
      <p className="text-secondary mt-2">
        {demoConfig.interactivePlaceholder.description}
      </p>

      <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {WORKFLOW_STEPS.map((step, idx) => {
          const isActive = activeStep === idx;
          const isDone = completed.has(step.id);
          return (
            <div
              key={step.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--border-radius-md)',
                border: `1px solid ${isActive ? 'var(--color-accent)' : isDone ? 'var(--color-success, #34d399)' : 'var(--color-border)'}`,
                backgroundColor: isActive ? 'rgba(249,115,22,0.08)' : isDone ? 'rgba(52,211,153,0.06)' : 'transparent',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'grid', placeItems: 'center',
                fontSize: 'var(--font-size-sm)', fontWeight: 'bold',
                background: isDone ? 'var(--color-success, #34d399)' : isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                color: isDone || isActive ? 'white' : 'var(--color-text-muted)',
                transition: 'all 0.3s ease',
              }}>
                {isDone ? '\u2713' : idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                  {step.label}
                </div>
                <div className="text-muted text-sm" style={{ marginTop: 2 }}>
                  {step.detail}
                </div>
              </div>
              {isActive && (
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid var(--color-accent)',
                  borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite',
                }} />
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn--primary"
        style={{ marginTop: 'var(--space-6)', width: '100%' }}
        onClick={runWorkflow}
        disabled={running}
      >
        {running ? 'Running Workflow...' : completed.size === WORKFLOW_STEPS.length ? 'Run Again' : 'Run Sample Workflow'}
      </button>
    </div>
  );
}

function DemoCTA() {
  return (
    <Section variant="navy">
      <div style={{ textAlign: 'center' }}>
        <h2 className="heading-2">{demoConfig.cta.title}</h2>
        <p className="text-lg mt-4" style={{ color: 'var(--color-text-muted)' }}>
          {demoConfig.cta.description}
        </p>
        <div className="mt-8">
          <CTAGroup
            primary={demoConfig.cta.button}
            secondary={siteConfig.ctas.secondary}
            centered
          />
        </div>
      </div>
    </Section>
  );
}

export function DemoPage() {
  return (
    <Layout title="Demo">
      <Section>
        <SectionHeader
          title={demoConfig.title}
          subtitle={demoConfig.subtitle}
        />
        <div className="demo-video demo-copy-font" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <DemoVideoPlayer sourceUrl={demoConfig.video.src} />
          <InteractiveWorkflowDemo />
        </div>
      </Section>
      <DemoCTA />
    </Layout>
  );
}
