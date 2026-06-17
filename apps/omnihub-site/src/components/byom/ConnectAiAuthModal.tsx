import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ConnectAiAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'google', name: 'Google Gemini' },
  { id: 'xai', name: 'xAI' },
  { id: 'groq', name: 'Groq' },
];

export const ConnectAiAuthModal: React.FC<ConnectAiAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [provider, setProvider] = useState<string>('openai');
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('byom-login', {
        body: { provider, api_key: apiKey }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to authenticate');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.session) {
        const { error: sessionError } = await supabase.auth.setSession(data.session);
        if (sessionError) throw sessionError;
        
        // NS-H-001: Store provider in sessionStorage (clears on tab close; XSS-safer than localStorage)
        sessionStorage.setItem('omni_ai_provider', provider);
        
        onSuccess();
      } else {
        throw new Error('No session returned from authentication server');
      }
    } catch (err) {
      console.error('[APEX OmniHub] BYOM Login Error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: 'var(--color-bg-elevated)',
        padding: '32px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text)' }}>Connect Your AI</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}
          >
            &times;
          </button>
        </div>

        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
          Your API key serves as your sovereign identity. APEX does not log your prompts, store your key in plaintext, or charge you for compute.
        </p>

        {error && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
            marginBottom: '20px',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="provider-select" style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text)', fontWeight: 500 }}>
              Provider
              <select
                id="provider-select"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '1rem',
                  marginTop: '8px'
                }}
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="api-key-input" style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text)', fontWeight: 500 }}>
              API Key
              <input
                id="api-key-input"
                type="password"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  marginTop: '8px'
                }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !apiKey}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                cursor: (isLoading || !apiKey) ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: (isLoading || !apiKey) ? 0.7 : 1
              }}
            >
              {isLoading ? 'Connecting...' : 'Connect Sovereign Identity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
