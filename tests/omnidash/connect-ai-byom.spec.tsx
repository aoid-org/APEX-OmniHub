import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectAiAuthModal } from '../../apps/omnihub-site/src/components/byom/ConnectAiAuthModal';
import { supabase } from '../../apps/omnihub-site/src/lib/supabase';

// Mock Supabase
vi.mock('../../apps/omnihub-site/src/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      setSession: vi.fn(),
    },
  },
}));

describe('Connect AI / BYOM Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('must explicitly show honest states for LLM connection and pass correct payload', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    
    // Setup mock to resolve successfully
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { session: { access_token: 'fake-token' } },
      error: null,
    });
    (supabase.auth.setSession as any).mockResolvedValue({ error: null });

    render(<ConnectAiAuthModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    // Assert form fields have valid accessibility identifiers (which should fail initially if they are missing 'name' attributes)
    const providerSelect = screen.getByLabelText(/Provider/i);
    expect(providerSelect).toHaveAttribute('name', 'provider');
    
    const apiKeyInput = screen.getByLabelText(/API Key/i);
    expect(apiKeyInput).toHaveAttribute('name', 'api_key');

    // Simulate user input
    fireEvent.change(providerSelect, { target: { value: 'anthropic' } });
    fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-test123' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Connect Sovereign Identity/i });
    fireEvent.click(submitButton);

    // Assert loading state
    expect(submitButton).toHaveTextContent(/Connecting\.\.\./i);
    expect(submitButton).toBeDisabled();

    // Assert correct payload was sent to Edge Function
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('byom-login', {
        body: { provider: 'anthropic', api_key: 'sk-ant-test123' }
      });
    });

    // Assert success callback
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
