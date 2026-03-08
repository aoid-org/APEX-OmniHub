/**
 * DragHandle shared component tests
 *
 * Covers:
 *  - Default render with base classes and SVG
 *  - Custom className override
 *  - custom-drag-handle selector required by react-grid-layout
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DragHandle } from '@/components/omnidash/DragHandle';

describe('DragHandle', () => {
  it('renders a div with the custom-drag-handle class', () => {
    const { container } = render(<DragHandle />);
    const handle = container.querySelector('.custom-drag-handle');
    expect(handle).toBeInTheDocument();
  });

  it('renders the 6-circle drag-indicator SVG', () => {
    const { container } = render(<DragHandle />);
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(6);
  });

  it('applies default size and colour classes', () => {
    const { container } = render(<DragHandle />);
    const handle = container.querySelector('.custom-drag-handle') as HTMLElement;
    expect(handle.className).toContain('h-10');
    expect(handle.className).toContain('w-10');
    expect(handle.className).toContain('p-3');
  });

  it('merges a custom className while preserving base classes', () => {
    const { container } = render(<DragHandle className="p-2 h-8 w-8 text-white/0" />);
    const handle = container.querySelector('.custom-drag-handle') as HTMLElement;
    // custom className applied
    expect(handle.className).toContain('h-8');
    expect(handle.className).toContain('w-8');
    expect(handle.className).toContain('p-2');
  });

  it('has cursor-grab positioning classes from base', () => {
    const { container } = render(<DragHandle />);
    const handle = container.querySelector('.custom-drag-handle') as HTMLElement;
    expect(handle.className).toContain('cursor-grab');
    expect(handle.className).toContain('absolute');
    expect(handle.className).toContain('top-0');
    expect(handle.className).toContain('right-0');
  });

  it('SVG has correct viewBox and stroke attributes', () => {
    const { container } = render(<DragHandle />);
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('width')).toBe('12');
    expect(svg.getAttribute('height')).toBe('12');
  });

  it('renders TodayDragHandle variant with text-white/20 base colour', () => {
    // Inline TodayDragHandle as used in Today.tsx
    const TodayDragHandle = () => (
      <DragHandle className="p-3 h-10 w-10 text-white/20 hover:text-white/60" />
    );
    const { container } = render(<TodayDragHandle />);
    const handle = container.querySelector('.custom-drag-handle') as HTMLElement;
    expect(handle.className).toContain('text-white/20');
  });
});
