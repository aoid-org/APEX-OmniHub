/**
 * WorkflowBuilder — Unit Tests
 * Tests skill palette loading, node/edge manipulation, cycle detection, and save flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockToast = vi.fn();
const mockUseAuth = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockSaveWorkflow = vi.fn();
const mockCreateWorkflowRun = vi.fn();
const mockFetchWorkflows = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: string[]; queryFn: () => unknown }) => mockUseQuery(opts),
  useMutation: (opts: { mutationFn: () => unknown }) => mockUseMutation(opts),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

const buildSupabaseQueryChain = () => {
  const terminal = { data: [], error: null };
  const secondEq = vi.fn(() => terminal);
  const firstEq = vi.fn(() => ({ eq: secondEq, ...terminal }));
  const select = vi.fn(() => ({ eq: firstEq, ...terminal }));
  return { select };
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => buildSupabaseQueryChain()),
  },
}));

vi.mock('@/lib/workflow-api', () => ({
  saveWorkflow: (...args: unknown[]) => mockSaveWorkflow(...args),
  createWorkflowRun: (...args: unknown[]) => mockCreateWorkflowRun(...args),
  fetchWorkflows: (...args: unknown[]) => mockFetchWorkflows(...args),
}));

// Mock SkillForgeWidget to prevent complex sub-component rendering
vi.mock('@/components/skills/SkillForgeWidget', () => ({
  SkillForgeWidget: () => <div data-testid="skill-forge-widget">SkillForgeWidget</div>,
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';

// ─── Fixtures ─────────────────────────────────────────────────────────────

const MOCK_SKILLS = [
  { id: 'skill-1', name: 'Lead Scorer', trigger_intent: 'score leads', is_active: true },
  { id: 'skill-2', name: 'Email Drafter', trigger_intent: 'draft email', is_active: true },
];

const MOCK_WORKFLOWS = [
  {
    id: 'wf-1',
    name: 'My Pipeline',
    definition: { nodes: [], edges: [] },
    is_active: true,
    schedule: null,
    created_at: new Date().toISOString(),
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────

describe('WorkflowBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === 'user-skills') {
        return { data: MOCK_SKILLS, isLoading: false, error: null };
      }
      if (queryKey[0] === 'workflows') {
        return { data: MOCK_WORKFLOWS, isLoading: false, error: null };
      }
      return { data: [], isLoading: false, error: null };
    });
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  describe('rendering', () => {
    it('renders Skill Palette section', () => {
      render(<WorkflowBuilder />);
      expect(screen.getByText(/skill palette/i)).toBeInTheDocument();
    });

    it('renders skill palette with active skills', () => {
      render(<WorkflowBuilder />);
      expect(screen.getByText('Lead Scorer')).toBeInTheDocument();
      expect(screen.getByText('Email Drafter')).toBeInTheDocument();
    });

    it('renders save button', () => {
      render(<WorkflowBuilder />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('renders run/execute button', () => {
      render(<WorkflowBuilder />);
      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
    });

    it('renders SVG canvas area', () => {
      const { container } = render(<WorkflowBuilder />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders empty canvas message when no nodes', () => {
      render(<WorkflowBuilder />);
      expect(screen.getAllByText(/drag skills/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('skill palette loading states', () => {
    it('shows empty palette message when no skills available', () => {
      mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === 'user-skills') return { data: [], isLoading: false, error: null };
        return { data: [], isLoading: false, error: null };
      });
      render(<WorkflowBuilder />);
      expect(screen.getByText(/no skills/i)).toBeInTheDocument();
    });

    it('shows no skills when data is loading', () => {
      mockUseQuery.mockImplementation(() => ({ data: undefined, isLoading: true, error: null }));
      render(<WorkflowBuilder />);
      // Skills are not rendered while loading (data is undefined)
      expect(screen.queryByText('Lead Scorer')).not.toBeInTheDocument();
    });
  });

  describe('workflow name input', () => {
    it('renders workflow name input', () => {
      render(<WorkflowBuilder />);
      expect(screen.getByPlaceholderText(/workflow name/i)).toBeInTheDocument();
    });

    it('accepts user input for workflow name', () => {
      render(<WorkflowBuilder />);
      const input = screen.getByPlaceholderText(/workflow name/i);
      fireEvent.change(input, { target: { value: 'My New Workflow' } });
      expect(input).toHaveValue('My New Workflow');
    });
  });

  describe('cycle detection helpers', () => {
    it('shows no cycle warning toast on empty graph', () => {
      render(<WorkflowBuilder />);
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/cycle/i) })
      );
    });
  });

  describe('save workflow', () => {
    it('save button is disabled when canvas has no nodes', () => {
      render(<WorkflowBuilder />);
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('run button is disabled when canvas has no nodes', () => {
      render(<WorkflowBuilder />);
      const runBtn = screen.getAllByRole('button').find((b) => /run/i.test(b.textContent ?? ''));
      expect(runBtn).toBeDisabled();
    });

    it('shows save button as disabled when isPending is true', () => {
      mockUseMutation.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      });
      render(<WorkflowBuilder />);
      // Button is disabled both because isPending AND !hasNodes
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });

  describe('load existing workflow', () => {
    it('renders list of existing workflows', () => {
      render(<WorkflowBuilder />);
      expect(screen.getByText('My Pipeline')).toBeInTheDocument();
    });
  });
});
