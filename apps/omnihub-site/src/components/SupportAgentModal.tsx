import { useState } from 'react';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { MessageCircle, X, Send } from 'lucide-react';

export function SupportAgentModal() {
  const { tx } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={tx('supportAgent.open')}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: 'var(--color-primary, #C4511A)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          border: 'none',
          cursor: 'pointer',
          transition: 'transform 0.2s, background-color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #D46025)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary, #C4511A)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <MessageCircle size={28} />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        width: '360px',
        height: '500px',
        backgroundColor: 'var(--color-bg-elevated, #0B141E)',
        border: '1px solid var(--color-border, rgba(196, 81, 26, 0.35))',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font, "Space Grotesk", sans-serif)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'rgba(196, 81, 26, 0.1)',
          borderBottom: '1px solid var(--color-border, rgba(196, 81, 26, 0.35))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text, #fff)' }}>
            {tx('supportAgent.title')}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>
            {tx('supportAgent.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label={tx('supportAgent.close')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted, rgba(255,255,255,0.5))',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--color-text, #fff)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted, rgba(255,255,255,0.5))'; }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{
          alignSelf: 'flex-start',
          backgroundColor: 'var(--color-bg-subtle, rgba(255,255,255,0.05))',
          padding: '12px 16px',
          borderRadius: '12px',
          borderBottomLeftRadius: '4px',
          maxWidth: '85%',
          fontSize: '14px',
          color: 'var(--color-text, #fff)',
          lineHeight: 1.5,
        }}>
          {tx('supportAgent.greeting')}
        </div>
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--color-border, rgba(196, 81, 26, 0.35))',
          backgroundColor: 'var(--color-bg-elevated, #0B141E)',
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim()) {
              // Add real API integration later
              setMessage('');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-bg-subtle, rgba(255,255,255,0.05))',
            border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
            borderRadius: '24px',
            padding: '4px 4px 4px 16px',
          }}
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={tx('supportAgent.placeholder')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text, #fff)',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '16px',
              backgroundColor: message.trim() ? 'var(--color-primary, #C4511A)' : 'transparent',
              color: message.trim() ? '#fff' : 'var(--color-text-muted, rgba(255,255,255,0.3))',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: message.trim() ? 'pointer' : 'default',
              transition: 'background-color 0.2s',
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
