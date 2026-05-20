import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
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

function stepBorderColor(isActive: boolean, isDone: boolean): string {
  if (isActive) return 'var(--color-accent)';
  if (isDone) return 'var(--color-success, #34d399)';
  return 'var(--color-border)';
}

function stepBackground(isActive: boolean, isDone: boolean): string {
  if (isActive) return 'rgba(249,115,22,0.08)';
  if (isDone) return 'rgba(52,211,153,0.06)';
  return 'transparent';
}

function badgeBackground(isActive: boolean, isDone: boolean): string {
  if (isDone) return 'var(--color-success, #34d399)';
  if (isActive) return 'var(--color-accent)';
  return 'var(--color-surface)';
}

function buttonLabel(running: boolean, allDone: boolean): string {
  if (running) return 'Running Workflow...';
  if (allDone) return 'Run Again';
  return 'Run Sample Workflow';
}

const STEP_START_DELAY_MS = 1200;
const STEP_COMPLETE_OFFSET_MS = 900;
const WORKFLOW_RESET_DELAY_MS = 800;

type SetActiveStep = Dispatch<SetStateAction<number>>;
type SetCompleted = Dispatch<SetStateAction<ReadonlySet<string>>>;
type SetRunning = Dispatch<SetStateAction<boolean>>;

function scheduleWorkflowReset(setActiveStep: SetActiveStep, setRunning: SetRunning): void {
  setTimeout(() => {
    setActiveStep(-1);
    setRunning(false);
  }, WORKFLOW_RESET_DELAY_MS);
}

function completeWorkflowStep(
  stepId: string,
  isLast: boolean,
  setCompleted: SetCompleted,
  setActiveStep: SetActiveStep,
  setRunning: SetRunning,
): void {
  setCompleted((prev) => new Set([...prev, stepId]));
  if (isLast) {
    scheduleWorkflowReset(setActiveStep, setRunning);
  }
}

function scheduleWorkflowStep(
  stepId: string,
  idx: number,
  isLast: boolean,
  setActiveStep: SetActiveStep,
  setCompleted: SetCompleted,
  setRunning: SetRunning,
): void {
  const startDelay = idx * STEP_START_DELAY_MS;
  const completeDelay = startDelay + STEP_COMPLETE_OFFSET_MS;

  setTimeout(() => setActiveStep(idx), startDelay);
  setTimeout(
    () => completeWorkflowStep(stepId, isLast, setCompleted, setActiveStep, setRunning),
    completeDelay,
  );
}

function WorkflowStepRow({ step, idx, isActive, isDone }: Readonly<{
  step: (typeof WORKFLOW_STEPS)[number];
  idx: number;
  isActive: boolean;
  isDone: boolean;
}>) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--border-radius-md)',
        border: `1px solid ${stepBorderColor(isActive, isDone)}`,
        backgroundColor: stepBackground(isActive, isDone),
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'grid', placeItems: 'center',
        fontSize: 'var(--font-size-sm)', fontWeight: 'bold',
        background: badgeBackground(isActive, isDone),
        color: (isDone || isActive) ? 'white' : 'var(--color-text-muted)',
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
}

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
      scheduleWorkflowStep(
        step.id,
        idx,
        idx === WORKFLOW_STEPS.length - 1,
        setActiveStep,
        setCompleted,
        setRunning,
      );
    });
  }, [running]);

  return (
    <div className="card" style={{ padding: 'var(--space-8)' }}>
      <h3 className="heading-4">{demoConfig.interactivePlaceholder.title}</h3>
      <p className="text-secondary mt-2">
        {demoConfig.interactivePlaceholder.description}
      </p>

      <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {WORKFLOW_STEPS.map((step, idx) => (
          <WorkflowStepRow
            key={step.id}
            step={step}
            idx={idx}
            isActive={activeStep === idx}
            isDone={completed.has(step.id)}
          />
        ))}
      </div>

      <button
        type="button"
        className="btn btn--primary"
        style={{ marginTop: 'var(--space-6)', width: '100%' }}
        onClick={runWorkflow}
        disabled={running}
      >
        {buttonLabel(running, completed.size === WORKFLOW_STEPS.length)}
      </button>
    </div>
  );
}

function DemoCTA() {
  return (
    <Section variant="navy">
      <div style={{ textAlign: 'center' }}>
        <h2 className="heading-2">{demoConfig.cta.title}</h2>
        <p className="text-lg mt-4" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
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
      <SEOMeta
        title="Live Demo"
        description="See APEX OmniHub in action — AI agent orchestration, Tri-Force governance, and real-time workflow execution in a 3-minute interactive demo."
        canonical="https://apexomnihub.icu/demo"
      />
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
