import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/ui/dialog', () => ({
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children, onClick, disabled, variant, className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('dashboard/components/ModuleRenderer', () => ({
  ModuleRenderer: ({ moduleKey, onClose }: { moduleKey: string; onClose: () => void }) => (
    <div data-testid="module-renderer" data-module-key={moduleKey}>
      <button onClick={onClose}>close-module</button>
    </div>
  ),
}));

import {
  DialogModeRenderer,
  FormModalRenderer,
} from '../../apps/omnihub-site/dashboard/components/OmniSpatialDialogRenderers';
import type { OmniModalConfig } from '@/stores/omniModalStore';

const makeModal = (overrides: Partial<OmniModalConfig> = {}): OmniModalConfig => ({
  id: 'test-modal',
  provider: 'TestProvider',
  type: 'oauth',
  title: 'Test Modal',
  onComplete: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  ...overrides,
});

describe('DialogModeRenderer', () => {
  const onAction = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders oauth type with Authorize button', () => {
    const modal = makeModal({ type: 'oauth', provider: 'Stripe' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Authorize Stripe')).toBeTruthy();
  });

  it('oauth Authorize button calls onAction with init_oauth', () => {
    const modal = makeModal({ type: 'oauth', provider: 'Stripe' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    fireEvent.click(screen.getByText('Authorize Stripe'));
    expect(onAction).toHaveBeenCalledWith({ action: 'init_oauth' });
  });

  it('oauth type disables button when isProcessing', () => {
    const modal = makeModal({ type: 'oauth', provider: 'Stripe' });
    render(<DialogModeRenderer modal={modal} isProcessing={true} onAction={onAction} onClose={onClose} />);
    const btn = screen.getByText('Authorize Stripe').closest('button');
    expect(btn).toHaveAttribute('disabled');
  });

  it('renders form type via FormModalRenderer default fields', () => {
    const modal = makeModal({ type: 'form' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('renders selection type with item buttons', () => {
    const modal = makeModal({
      type: 'selection',
      schema: {
        items: [
          { id: 'opt1', label: 'Option One' },
          { id: 'opt2', label: 'Option Two' },
        ],
      },
    });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Option One')).toBeTruthy();
    expect(screen.getByText('Option Two')).toBeTruthy();
  });

  it('selection item click calls onAction with selected item', () => {
    const modal = makeModal({
      type: 'selection',
      schema: { items: [{ id: 'opt1', label: 'Option One' }] },
    });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    fireEvent.click(screen.getByText('Option One'));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ selectedId: 'opt1' }));
  });

  it('selection uses item name when label absent', () => {
    const modal = makeModal({
      type: 'selection',
      schema: { items: [{ id: 'opt2', name: 'Named Option' }] },
    });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Named Option')).toBeTruthy();
  });

  it('selection fallback text when no items', () => {
    const modal = makeModal({ type: 'selection', schema: {} });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('No selection items provided.')).toBeTruthy();
  });

  it('renders confirmation type with Confirm and Cancel buttons', () => {
    const modal = makeModal({ type: 'confirmation' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('confirmation Confirm button calls onAction', () => {
    const modal = makeModal({ type: 'confirmation' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(onAction).toHaveBeenCalledWith({ confirmed: true });
  });

  it('confirmation Cancel button calls onClose', () => {
    const modal = makeModal({ type: 'confirmation' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders module type with ModuleRenderer', () => {
    const modal = makeModal({ type: 'module', contextData: { moduleKey: 'links' } });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByTestId('module-renderer')).toBeTruthy();
  });

  it('forwards contextData.moduleKey to ModuleRenderer (Connect-a-Link wizard path)', () => {
    // Contract that LinksModule "Connect a Link" relies on: a type: 'module'
    // modal must mount ModuleRenderer with the wizard moduleKey, not a sandbox.
    const modal = makeModal({ type: 'module', contextData: { moduleKey: 'omniboard-wizard' } });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByTestId('module-renderer').getAttribute('data-module-key')).toBe('omniboard-wizard');
  });

  it('module type uses modal.id as key when no contextData.moduleKey', () => {
    const modal = makeModal({ type: 'module', id: 'my-modal-id' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByTestId('module-renderer')).toBeTruthy();
  });

  it('module type ModuleRenderer onClose calls outer onClose', () => {
    const modal = makeModal({ type: 'module', contextData: { moduleKey: 'links' } });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    fireEvent.click(screen.getByText('close-module'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders mcp_tool_approve type with Approve and Deny buttons', () => {
    const modal = makeModal({
      type: 'mcp_tool_approve',
      contextData: { tool: 'delete_record', params: { id: '123' } },
    });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Approve Execution')).toBeTruthy();
    expect(screen.getByText('Deny Action')).toBeTruthy();
  });

  it('mcp_tool_approve Approve button calls onAction', () => {
    const modal = makeModal({ type: 'mcp_tool_approve' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    fireEvent.click(screen.getByText('Approve Execution'));
    expect(onAction).toHaveBeenCalledWith({ approved: true });
  });

  it('mcp_tool_approve Deny button calls onClose', () => {
    const modal = makeModal({ type: 'mcp_tool_approve' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    fireEvent.click(screen.getByText('Deny Action'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders vision_redact type with Setup Required heading', () => {
    const modal = makeModal({ type: 'vision_redact' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Setup Required')).toBeTruthy();
  });

  it('renders vision_confirm type with Setup Required heading', () => {
    const modal = makeModal({ type: 'vision_confirm' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Setup Required')).toBeTruthy();
  });

  it('vision type Close button calls onClose', () => {
    const modal = makeModal({ type: 'vision_redact' });
    render(<DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('default/unknown type renders null (no DOM output)', () => {
    const modal = makeModal({ type: 'unknown_type' as OmniModalConfig['type'] });
    const { container } = render(
      <DialogModeRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('FormModalRenderer', () => {
  const onAction = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default Name and Description fields when no schema', () => {
    const modal = makeModal({ type: 'form' });
    render(<FormModalRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
  });

  it('text input handleChange updates value', () => {
    const modal = makeModal({ type: 'form' });
    render(<FormModalRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    const input = screen.getByPlaceholderText('Enter name…') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My Widget' } });
    expect(input.value).toBe('My Widget');
  });

  it('Submit button calls onAction with submitted status and form data', () => {
    const modal = makeModal({ type: 'form' });
    render(<FormModalRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    const input = screen.getByPlaceholderText('Enter name…');
    fireEvent.change(input, { target: { value: 'Test Name' } });
    fireEvent.click(screen.getByText('Submit'));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'submitted', data: expect.objectContaining({ name: 'Test Name' }) }),
    );
  });

  it('Cancel button calls onClose', () => {
    const modal = makeModal({ type: 'form' });
    render(<FormModalRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders textarea for textarea field type', () => {
    const modal = makeModal({
      type: 'form',
      schema: {
        fields: [{ key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Add notes...' }],
      },
    });
    render(<FormModalRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    const ta = screen.getByPlaceholderText('Add notes...');
    expect(ta.tagName.toLowerCase()).toBe('textarea');
  });

  it('textarea handleChange updates value', () => {
    const modal = makeModal({
      type: 'form',
      schema: {
        fields: [{ key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Add notes...' }],
      },
    });
    render(<FormModalRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    const ta = screen.getByPlaceholderText('Add notes...') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'My notes' } });
    expect(ta.value).toBe('My notes');
  });

  it('renders select for select field type with options', () => {
    const modal = makeModal({
      type: 'form',
      schema: {
        fields: [{ key: 'tier', label: 'Tier', type: 'select' }],
        options: [
          { value: 'basic', label: 'Basic' },
          { value: 'pro', label: 'Pro' },
        ],
      },
    });
    render(<FormModalRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Basic')).toBeTruthy();
    expect(screen.getByText('Pro')).toBeTruthy();
  });

  it('select handleChange updates value', () => {
    const modal = makeModal({
      type: 'form',
      schema: {
        fields: [{ key: 'tier', label: 'Tier', type: 'select' }],
        options: [
          { value: 'basic', label: 'Basic' },
          { value: 'pro', label: 'Pro' },
        ],
      },
    });
    render(<FormModalRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    const sel = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'pro' } });
    expect(sel.value).toBe('pro');
  });

  it('marks required fields with asterisk', () => {
    const modal = makeModal({
      type: 'form',
      schema: {
        fields: [{ key: 'email', label: 'Email', type: 'text', required: true }],
      },
    });
    render(<FormModalRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('*')).toBeTruthy();
  });

  it('disables inputs and buttons when isProcessing', () => {
    const modal = makeModal({ type: 'form' });
    render(<FormModalRenderer modal={modal} isProcessing={true} onAction={onAction} onClose={onClose} />);
    const submitBtn = screen.getByText('Submit').closest('button');
    expect(submitBtn).toHaveAttribute('disabled');
  });

  it('uses field index as key when field.key is absent', () => {
    const modal = makeModal({
      type: 'form',
      schema: {
        fields: [{ label: 'Unnamed Field', type: 'text' }],
      },
    });
    render(<FormModalRenderer modal={modal} isProcessing={false} onAction={onAction} onClose={onClose} />);
    expect(screen.getByText('Unnamed Field')).toBeTruthy();
  });
});
