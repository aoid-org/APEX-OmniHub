import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { OmniModalConfig } from '@/stores/omniModalStore';

vi.mock('../../apps/omnihub-site/dashboard/components/ModuleRenderer', () => ({
  ModuleRenderer: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="module-renderer">
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

import {
  DialogModeRenderer,
  FormModalRenderer,
} from '../../apps/omnihub-site/dashboard/components/OmniSpatialDialogRenderers';

const makeModal = (overrides: Partial<OmniModalConfig>): OmniModalConfig => ({
  id: 'test-modal',
  provider: 'test-provider',
  type: 'oauth',
  title: 'Test Modal',
  onComplete: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  ...overrides,
});

describe('DialogModeRenderer', () => {
  it('renders oauth type with authorize button', () => {
    const modal = makeModal({ type: 'oauth', provider: 'Stripe' });
    render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Authorize Stripe/)).toBeTruthy();
  });

  it('oauth type calls onAction with init_oauth', () => {
    const onAction = vi.fn();
    const modal = makeModal({ type: 'oauth', provider: 'Stripe' });
    render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={onAction}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText(/Authorize Stripe/));
    expect(onAction).toHaveBeenCalledWith({ action: 'init_oauth' });
  });

  it('renders form type with submit/cancel', () => {
    const modal = makeModal({ type: 'form' });
    render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Submit')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders selection type with no items message', () => {
    const modal = makeModal({ type: 'selection', schema: {} });
    render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('No selection items provided.')).toBeTruthy();
  });

  it('renders selection type with items', () => {
    const modal = makeModal({
      type: 'selection',
      schema: { items: [{ id: 'a', label: 'Option A' }, { id: 'b', label: 'Option B' }] },
    });
    render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Option A')).toBeTruthy();
    expect(screen.getByText('Option B')).toBeTruthy();
  });

  it('renders confirmation type with confirm button', () => {
    const modal = makeModal({ type: 'confirmation' });
    render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Confirm')).toBeTruthy();
  });

  it('confirmation calls onAction with confirmed:true', () => {
    const onAction = vi.fn();
    const modal = makeModal({ type: 'confirmation' });
    render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={onAction}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onAction).toHaveBeenCalledWith({ confirmed: true });
  });

  it('renders module type via ModuleRenderer', () => {
    const modal = makeModal({ type: 'module', contextData: { moduleKey: 'omniskills' } });
    render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('module-renderer')).toBeTruthy();
  });

  it('renders mcp_tool_approve type with security warning', () => {
    const modal = makeModal({ type: 'mcp_tool_approve' });
    render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Destructive Operation/)).toBeTruthy();
  });

  it('renders vision_redact type with setup required', () => {
    const modal = makeModal({ type: 'vision_redact' });
    render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Setup Required')).toBeTruthy();
  });

  it('returns null for unknown modal type', () => {
    const modal = makeModal({ type: 'unknown_type' as OmniModalConfig['type'] });
    const { container } = render(
      <DialogModeRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('FormModalRenderer', () => {
  it('renders default fields (name, description) when no schema', () => {
    const modal = makeModal({ type: 'form' });
    render(
      <FormModalRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
  });

  it('renders schema-provided fields', () => {
    const modal = makeModal({
      type: 'form',
      schema: {
        fields: [
          { key: 'company', label: 'Company', type: 'text', required: true },
          { key: 'plan', label: 'Plan', type: 'select' },
        ],
        options: [
          { value: 'starter', label: 'Starter' },
          { value: 'pro', label: 'Pro' },
        ],
      },
    });
    render(
      <FormModalRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Company')).toBeTruthy();
    expect(screen.getByText('Plan')).toBeTruthy();
  });

  it('submits form values via onAction', () => {
    const onAction = vi.fn();
    const modal = makeModal({ type: 'form' });
    render(
      <FormModalRenderer
        modal={modal}
        isProcessing={false}
        onAction={onAction}
        onClose={vi.fn()}
      />,
    );
    const nameInput = screen.getByPlaceholderText('Enter name…');
    fireEvent.change(nameInput, { target: { value: 'ACME Corp' } });
    fireEvent.click(screen.getByText('Submit'));
    expect(onAction).toHaveBeenCalledWith({
      status: 'submitted',
      data: expect.objectContaining({ name: 'ACME Corp' }),
    });
  });

  it('textarea field renders for description type', () => {
    const modal = makeModal({ type: 'form' });
    render(
      <FormModalRenderer
        modal={modal}
        isProcessing={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText('Enter description…')).toBeTruthy();
  });
});
