import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { T } from '../../apps/omnihub-site/dashboard/designSystem';
import {
  StatusDot,
  GlassCard,
  SectionLabel,
} from '../../apps/omnihub-site/dashboard/designSystem.tsx';

import {
  StatusDot as StatusDot2,
  GlassCard as GlassCard2,
  SectionLabel as SectionLabel2,
} from '../../apps/omnihub-site/dashboard/components/designComponents';

describe('designSystem tokens and components', () => {
  it('T exposes bg token', () => {
    expect(T.bg).toBeDefined();
  });

  it('T exposes orange token', () => {
    expect(T.orange).toBeDefined();
  });

  it('StatusDot renders with default props', () => {
    const { container } = render(<StatusDot />);
    expect(container.firstChild).toBeTruthy();
  });

  it('StatusDot renders without pulse animation', () => {
    const { container } = render(<StatusDot pulse={false} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.animation).toBe('none');
  });

  it('StatusDot renders with custom color', () => {
    const { container } = render(<StatusDot color="#ff0000" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('GlassCard renders children', () => {
    render(<GlassCard><span>hello</span></GlassCard>);
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it('GlassCard renders as div when no onClick', () => {
    const { container } = render(<GlassCard><span>div</span></GlassCard>);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('GlassCard renders as button when onClick provided', () => {
    const onClick = vi.fn();
    render(<GlassCard onClick={onClick}><span>btn</span></GlassCard>);
    const btn = screen.getByRole('button');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('GlassCard applies glow border when glow=true', () => {
    const { container } = render(<GlassCard glow><span>glow</span></GlassCard>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.border).toContain(T.borderGlow);
  });

  it('GlassCard accepts custom style', () => {
    const { container } = render(<GlassCard style={{ color: 'red' }}><span>s</span></GlassCard>);
    expect(container.firstChild).toBeTruthy();
  });

  it('SectionLabel renders children text', () => {
    render(<SectionLabel>MY LABEL</SectionLabel>);
    expect(screen.getByText('MY LABEL')).toBeTruthy();
  });
});

describe('designComponents (re-exports)', () => {
  it('StatusDot2 renders', () => {
    const { container } = render(<StatusDot2 />);
    expect(container.firstChild).toBeTruthy();
  });

  it('GlassCard2 renders children', () => {
    render(<GlassCard2><span>card</span></GlassCard2>);
    expect(screen.getByText('card')).toBeTruthy();
  });

  it('GlassCard2 renders as button with onClick', () => {
    const onClick = vi.fn();
    render(<GlassCard2 onClick={onClick}><span>cb</span></GlassCard2>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('SectionLabel2 renders children', () => {
    render(<SectionLabel2>Section</SectionLabel2>);
    expect(screen.getByText('Section')).toBeTruthy();
  });
});
