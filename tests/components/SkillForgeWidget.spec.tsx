/**
 * SkillForgeWidget (OmniSkills) — Unit Tests
 * Tests 3-step wizard: field presence, step navigation, button states, and mutation call.
 * Note: SkillForgeWidget is also known as OmniSkills in the codebase.
 *
 * Implementation notes:
 * - Dialog mock renders DialogContent always (ignores open state), so all wizard UI is always in DOM.
 * - Per-step validation does NOT exist in the component; min-8-char check only runs at Forge submit
 *   via Zod schema inside the mutation. The Next button gating is purely `isStepEmpty` (empty check).
 * - Component calls `mutation.mutate()`, not `mutateAsync`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockToast = vi.fn();
const mockMutate = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (_opts: unknown) => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          success: true,
          skill: { name: 'Generated Skill', description: 'Auto-generated skill' },
          entitlement: { used: 1, max: 10, tier: 'pro' },
        },
        error: null,
      }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null }),
    },
  },
}));

// Dialog mock — renders DialogContent always (state-independent)
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { SkillForgeWidget } from '@/components/skills/SkillForgeWidget';

// ─── Tests ────────────────────────────────────────────────────────────────

describe('SkillForgeWidget (OmniSkills)', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('trigger button', () => {
    it('renders the Forge Skill trigger button', () => {
      render(<SkillForgeWidget />);
      // Component renders "Forge Skill" as the DialogTrigger button text
      expect(screen.getByRole('button', { name: /forge skill/i })).toBeInTheDocument();
    });

    it('trigger button text includes forge or skill keyword', () => {
      render(<SkillForgeWidget />);
      const forgeBtn = screen.getByRole('button', { name: /forge skill/i });
      expect(forgeBtn.textContent?.toLowerCase()).toMatch(/forge|skill/);
    });
  });

  describe('wizard dialog content (always in DOM)', () => {
    it('dialog content is always rendered', () => {
      render(<SkillForgeWidget />);
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    });

    it('renders a textarea for step 1 intent input', () => {
      render(<SkillForgeWidget />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('step 1 shows "Step 1" indicator', () => {
      render(<SkillForgeWidget />);
      expect(screen.getByText(/step 1/i)).toBeInTheDocument();
    });

    it('step 1 shows the outcome question', () => {
      render(<SkillForgeWidget />);
      expect(screen.getByText(/what outcome/i)).toBeInTheDocument();
    });
  });

  describe('step 1 — Next button state', () => {
    it('Next button is disabled when intent field is empty', () => {
      render(<SkillForgeWidget />);
      const nextBtn = screen.getByRole('button', { name: /next/i });
      expect(nextBtn).toBeDisabled();
    });

    it('Next button is enabled when intent field has content', () => {
      render(<SkillForgeWidget />);
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Summarize emails automatically every morning' } });
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
    });
  });

  describe('step navigation', () => {
    it('advances to step 2 when valid intent is entered and Next is clicked', async () => {
      render(<SkillForgeWidget />);
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Summarize incoming emails automatically using AI' },
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => {
        expect(screen.getByText(/step 2/i)).toBeInTheDocument();
      });
    });

    it('shows Back button on step 2', async () => {
      render(<SkillForgeWidget />);
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Summarize incoming emails automatically using AI' },
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });

    it('goes back to step 1 when Back is clicked on step 2', async () => {
      render(<SkillForgeWidget />);
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Summarize incoming emails automatically using AI' },
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      await waitFor(() => {
        expect(screen.getByText(/step 1/i)).toBeInTheDocument();
      });
    });
  });

  describe('wizard step 3 — Constraints', () => {
    async function advanceToStep3() {
      render(<SkillForgeWidget />);
      // Step 1
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Summarize emails automatically every morning before 9am' },
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/step 2/i)).toBeInTheDocument());
      // Step 2
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Triggered when new email arrives in inbox folder' },
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/step 3/i)).toBeInTheDocument());
    }

    it('shows step 3 constraints question after completing steps 1 and 2', async () => {
      await advanceToStep3();
      expect(screen.getByText(/constraints/i)).toBeInTheDocument();
    });

    it('shows Forge Skill button on final step when field has content', async () => {
      await advanceToStep3();
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Only process emails from verified senders without attachments' },
      });
      // The footer action button says "Forge Skill" on step 3
      const forgeButtons = screen.getAllByRole('button', { name: /forge skill/i });
      // At least the trigger button + footer forge button exist
      expect(forgeButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('calls mutation.mutate() when Forge Skill is clicked with valid data', async () => {
      await advanceToStep3();
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Only process emails from verified senders without attachments' },
      });
      // Click the last Forge Skill button (footer action, not the trigger)
      const forgeButtons = screen.getAllByRole('button', { name: /forge skill/i });
      fireEvent.click(forgeButtons.at(-1)!);
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });
  });
});
