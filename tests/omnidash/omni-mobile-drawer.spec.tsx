import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OmniMobileDrawer } from '../../apps/omnihub-site/dashboard/components/OmniMobileDrawer';

describe('OmniMobileDrawer', () => {
  it('keeps the open drawer exposed to assistive tech', () => {
    render(
      <OmniMobileDrawer isOpen onClose={vi.fn()} title="Insights & Controls">
        <button type="button">Panel action</button>
      </OmniMobileDrawer>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Insights & Controls' });
    const overlay = dialog.parentElement;

    expect(dialog).toBeInTheDocument();
    expect(overlay).not.toHaveAttribute('aria-hidden');
    expect(screen.getByRole('button', { name: 'Panel action' })).toBeInTheDocument();
  });

  it('closes from backdrop, Escape, and the visible close button', () => {
    const onClose = vi.fn();
    render(
      <OmniMobileDrawer isOpen onClose={onClose} title="Insights & Controls">
        Drawer content
      </OmniMobileDrawer>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Insights & Controls' });
    fireEvent.pointerDown(dialog.parentElement!);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
