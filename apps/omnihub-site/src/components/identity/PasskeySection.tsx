import { useEffect, useState } from 'react';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  authenticateWithPasskey,
} from '../../lib/webauthnClient';
import { useAuth } from '../../lib/useAuth';

/**
 * Passkey (WebAuthn) registration + authentication surface, embedded in the
 * existing Login flow. Honest capability states:
 *  - hidden when WebAuthn is unsupported / SSR.
 *  - register requires an authenticated session (password sign-in first).
 *  - assert verifies a device-bound passkey via the identity-webauthn function.
 *
 * This is the software platform-authenticator/WebAuthn path. It does NOT claim
 * real-device FaceID/TouchID gating, which needs owner-hardware validation.
 */
export function PasskeySection() {
  const { session, isAuthenticated } = useAuth();
  const [supported, setSupported] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const ok = isWebAuthnSupported();
    setSupported(ok);
    if (ok) {
      void isPlatformAuthenticatorAvailable().then(setPlatformAvailable);
    }
  }, []);

  if (!supported) {
    // Honest unsupported state — no fake button.
    return (
      <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-6)' }}>
        Passkey sign-in is not available in this browser.
      </p>
    );
  }

  const handleRegister = async () => {
    setError('');
    setMessage('');
    const email = session?.user?.email;
    if (!isAuthenticated || !email) {
      setError('Sign in with your password first, then register a passkey.');
      return;
    }
    setBusy(true);
    try {
      const result = await registerPasskey(email);
      if (result.success) {
        setMessage('Passkey registered for this device.');
      } else {
        setError(result.reason ?? 'Could not register passkey.');
      }
    } catch (err) {
      // Permission denied / user cancel surfaces honestly here.
      setError(err instanceof Error ? err.message : 'Passkey registration failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleAuthenticate = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = await authenticateWithPasskey();
      if (result.success) {
        setMessage('Passkey verified on this device.');
      } else {
        setError(result.reason ?? 'Passkey verification failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 'var(--space-6)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '24px 0',
        }}
      >
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
        <span
          className="text-muted"
          style={{ fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Device passkey
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={busy}
          onClick={handleRegister}
        >
          {busy ? 'Working…' : 'Register passkey'}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={busy}
          onClick={handleAuthenticate}
        >
          {busy ? 'Working…' : 'Use passkey'}
        </button>
      </div>

      {!platformAvailable && (
        <p className="text-muted mt-2" style={{ fontSize: 'var(--font-size-sm)' }}>
          No platform authenticator detected; a roaming security key may still work.
        </p>
      )}

      {message && (
        <p className="mt-2" style={{ color: 'var(--color-accent)', fontSize: 'var(--font-size-sm)' }}>
          {message}
        </p>
      )}
      {error && (
        <p className="form-error mt-2" style={{ fontSize: 'var(--font-size-sm)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
