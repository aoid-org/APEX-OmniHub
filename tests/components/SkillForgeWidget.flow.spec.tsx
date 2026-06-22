/**
 * SkillForgeWidget — generation + paywall flow (real React Query).
 *
 * Unlike SkillForgeWidget.spec.tsx (which mocks useMutation to test wizard
 * navigation), this suite runs the REAL mutation so it can prove:
 *  - successful generation invalidates ['user-skills'] and ['workflows'] and closes the dialog;
 *  - a 402 response shows the upgrade prompt and KEEPS the dialog open.
 * Supabase is mocked; no live API is hit.
 */

import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockToast = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

// Controllable Dialog mock: DialogContent renders ONLY when open === true, so
// "dialog stays open / closes" is observable in the DOM.
const dialogRef = vi.hoisted(() => ({
  open: false,
  onOpenChange: (_next: boolean) => {},
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (next: boolean) => void;
    children: ReactNode;
  }) => {
    dialogRef.open = open;
    dialogRef.onOpenChange = onOpenChange;
    return <div data-testid="dialog">{children}</div>;
  },
  DialogTrigger: ({ children }: { children: ReactNode }) => (
    <span data-testid="dialog-trigger" onClick={() => dialogRef.onOpenChange(true)}>
      {children}
    </span>
  ),
  DialogContent: ({ children }: { children: ReactNode }) =>
    dialogRef.open ? <div data-testid="dialog-content">{children}</div> : null,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { SkillForgeWidget } from '@/components/skills/SkillForgeWidget';

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderWidget() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <SkillForgeWidget />
    </QueryClientProvider>,
  );
  return { invalidateSpy };
}

async function completeWizard() {
  // Open the dialog
  fireEvent.click(screen.getByTestId('dialog-trigger'));
  await screen.findByTestId('dialog-content');

  // Step 1 → 2 → 3 (each field needs >= 8 chars to pass Zod at submit + non-empty to enable Next)
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Auto-save paid invoices to the accounting system' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  await waitFor(() => expect(screen.getByText(/step 2/i)).toBeInTheDocument());

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Stripe payment_succeeded webhook with invoice metadata' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  await waitFor(() => expect(screen.getByText(/step 3/i)).toBeInTheDocument());

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Only process invoices over $100 and skip duplicate ids' },
  });
  const forgeButtons = screen.getAllByRole('button', { name: /forge skill/i });
  fireEvent.click(forgeButtons.at(-1)!);
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('SkillForgeWidget — generation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dialogRef.open = false;
  });

  it('on success: invalidates user-skills + workflows and closes the dialog', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        success: true,
        skill: { name: 'skill_abc', description: 'Generated skill' },
        entitlement: { used: 1, max: 5, tier: 'BASIC' },
      },
      error: null,
    });

    const { invalidateSpy } = renderWidget();
    await completeWizard();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user-skills'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['workflows'] });
    });

    // Success toast announces SKILL FORGED with the used/max from the server
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'SKILL FORGED' }),
    );

    // Dialog closes after success
    await waitFor(() => expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument());
  });

  it('on 402: shows the upgrade prompt and KEEPS the dialog open (paywall)', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Payment Required', context: { status: 402 } },
    });

    renderWidget();
    await completeWizard();

    // Upgrade prompt surfaces in the inline error panel
    await waitFor(() =>
      expect(screen.getByText(/upgrade to architect tier/i)).toBeInTheDocument(),
    );

    // Dialog must remain open so the user can act on the paywall
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();

    // No fake success was reported
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'SKILL FORGED' }),
    );
  });
});
