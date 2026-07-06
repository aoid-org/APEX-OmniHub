import { useState } from 'react';

const FAQ_ITEMS = [
  {
    q: 'How do I connect a third-party app?',
    a: 'Open OmniDash → click OmniBoard in the sidebar → select your provider and follow the connection wizard.',
  },
  {
    q: 'How do I install the APEX OmniHub app?',
    a: 'In the dashboard, click the "Install App" button in the top navigation bar. On mobile, tap the share icon in your browser and select "Add to Home Screen".',
  },
  {
    q: 'How do I reset my password?',
    a: 'Go to the Login page and click "Forgot Password". You\'ll receive a reset link at your registered email within minutes.',
  },
  {
    q: 'How do I upgrade to Enterprise?',
    a: 'Visit the Pricing page or contact enterprise@apex-systems.com. Enterprise includes 24/7 dedicated support and a Customer Success Manager.',
  },
  {
    q: 'What data does APEX OmniHub store?',
    a: 'Only encrypted connection metadata and your configuration preferences. We never store your third-party credentials in plain text. See our Privacy Policy for full details.',
  },
];

export function SupportFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section
      aria-label="Frequently Asked Questions"
      style={{ marginTop: '60px' }}
    >
      <h2
        style={{
          fontSize: 'clamp(1.5rem, 3vw, 2rem)',
          fontWeight: 800,
          color: '#fff',
          margin: '0 0 32px',
        }}
      >
        Frequently Asked Questions
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {FAQ_ITEMS.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: openFaq === idx ? 'rgba(196,81,26,0.07)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${openFaq === idx ? 'rgba(196,81,26,0.35)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '14px',
              overflow: 'hidden',
              transition: 'all 0.2s',
            }}
          >
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              aria-expanded={openFaq === idx}
              style={{
                width: '100%',
                padding: '18px 24px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '14.5px',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                fontFamily: 'inherit',
              }}
            >
              {item.q}
              <span
                style={{
                  fontSize: '18px',
                  flexShrink: 0,
                  color: '#C4511A',
                  transition: 'transform 0.2s',
                  transform: openFaq === idx ? 'rotate(45deg)' : 'rotate(0)',
                }}
              >
                +
              </span>
            </button>
            {openFaq === idx && (
              <div
                style={{
                  padding: '0 24px 18px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '13.5px',
                  lineHeight: 1.65,
                }}
              >
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
