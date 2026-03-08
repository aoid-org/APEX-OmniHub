/**
 * Demo page unit tests
 *
 * Coverage targets:
 *  - stepBorderColor / stepBackground / badgeBackground / buttonLabel helpers
 *    (exercised via WorkflowStepRow rendering in all states)
 *  - InteractiveWorkflowDemo idle, running, and all-done states
 *  - DemoPage full render
 *  - DemoCTA render
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Dependency mocks ───────────────────────────────────────────────────────────
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/Section', () => ({
  Section: ({ children }: { children: ReactNode }) => <div data-testid="section">{children}</div>,
  SectionHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="section-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock('@/components/CTAGroup', () => ({
  CTAGroup: ({ primary, secondary }: { primary: { label: string; href: string }; secondary: { label: string; href: string }; centered?: boolean }) => (
    <div data-testid="cta-group">
      <a href={primary.href}>{primary.label}</a>
      <a href={secondary.href}>{secondary.label}</a>
    </div>
  ),
}));

vi.mock('@/components/DemoVideoPlayer', () => ({
  DemoVideoPlayer: ({ sourceUrl }: { sourceUrl: string }) => (
    <video data-testid="demo-video" src={sourceUrl} />
  ),
}));

vi.mock('@/content/site', () => ({
  demoConfig: {
    title: 'See APEX in Action',
    subtitle: 'Watch the demo',
    video: { label: 'Product Demo', src: '/apex-demo.mp4' },
    interactivePlaceholder: {
      title: 'Try the Workflow',
      description: 'Run a sample automated workflow end-to-end.',
    },
    cta: {
      title: 'Ready to connect everything?',
      description: 'Start your free trial today.',
      button: { label: 'Request Access', href: '/request-access' },
    },
  },
  siteConfig: {
    ctas: {
      secondary: { label: 'View Tech Specs', href: '/tech-specs' },
    },
  },
}));

import { DemoPage } from '@omnihub/pages/Demo';

describe('DemoPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the layout wrapper', () => {
    render(<DemoPage />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders section header with title and subtitle from config', () => {
    render(<DemoPage />);
    expect(screen.getByText('See APEX in Action')).toBeInTheDocument();
    expect(screen.getByText('Watch the demo')).toBeInTheDocument();
  });

  it('renders the video player with the configured src', () => {
    render(<DemoPage />);
    const video = screen.getByTestId('demo-video') as HTMLVideoElement;
    expect(video.getAttribute('src')).toBe('/apex-demo.mp4');
  });

  it('renders the interactive workflow placeholder title and description', () => {
    render(<DemoPage />);
    expect(screen.getByText('Try the Workflow')).toBeInTheDocument();
    expect(screen.getByText('Run a sample automated workflow end-to-end.')).toBeInTheDocument();
  });

  it('renders all 4 workflow steps with labels', () => {
    render(<DemoPage />);
    expect(screen.getByText('Connect Salesforce')).toBeInTheDocument();
    expect(screen.getByText('Translate Events')).toBeInTheDocument();
    expect(screen.getByText('Execute Workflow')).toBeInTheDocument();
    expect(screen.getByText('Log & Verify')).toBeInTheDocument();
  });

  it('shows "Run Sample Workflow" button in idle state', () => {
    render(<DemoPage />);
    expect(screen.getByText('Run Sample Workflow')).toBeInTheDocument();
  });

  it('shows step detail text for each workflow step', () => {
    render(<DemoPage />);
    expect(screen.getByText('OAuth handshake with CRM adapter')).toBeInTheDocument();
    expect(screen.getByText('Map lead data to canonical OmniHub schema')).toBeInTheDocument();
    expect(screen.getByText('Create Slack channel + send welcome email')).toBeInTheDocument();
    expect(screen.getByText('Immutable audit trail with cryptographic receipt')).toBeInTheDocument();
  });

  it('starts workflow and shows "Running Workflow..." after clicking the button', () => {
    render(<DemoPage />);
    const button = screen.getByText('Run Sample Workflow');
    fireEvent.click(button);
    expect(screen.getByText('Running Workflow...')).toBeInTheDocument();
    expect(button.closest('button')).toBeDisabled();
  });

  it('shows "Run Again" after workflow completes all steps', async () => {
    render(<DemoPage />);
    const button = screen.getByText('Run Sample Workflow');

    await act(async () => {
      fireEvent.click(button);
      // Each step takes 1200ms; the last step completes at 3*1200+900 = 4500ms
      // Then 800ms cooldown → total 5300ms
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByText('Run Again')).toBeInTheDocument();
  });

  it('renders CTA section with title and buttons', () => {
    render(<DemoPage />);
    expect(screen.getByText('Ready to connect everything?')).toBeInTheDocument();
    expect(screen.getByText('Request Access')).toBeInTheDocument();
    expect(screen.getByText('View Tech Specs')).toBeInTheDocument();
  });

  it('step badge shows checkmark (✓) for completed steps after workflow runs', async () => {
    render(<DemoPage />);
    fireEvent.click(screen.getByText('Run Sample Workflow'));

    await act(async () => {
      // Advance past first step completion: 0*1200 + 900 = 900ms
      vi.advanceTimersByTime(1000);
    });

    // At least one step should show a checkmark
    expect(screen.getAllByText('✓').length).toBeGreaterThanOrEqual(1);
  });

  it('does not run workflow if already running (disabled button)', () => {
    render(<DemoPage />);
    const button = screen.getByText('Run Sample Workflow');
    fireEvent.click(button);

    // Button is disabled while running — second click should be a no-op
    const runningButton = screen.getByText('Running Workflow...').closest('button')!;
    expect(runningButton).toBeDisabled();
    fireEvent.click(runningButton);
    // Still showing Running, not two concurrent workflows
    expect(screen.getByText('Running Workflow...')).toBeInTheDocument();
  });
});
