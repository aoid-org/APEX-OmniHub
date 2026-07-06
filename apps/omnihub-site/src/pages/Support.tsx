import { useState, useRef } from 'react';
import { SEOMeta } from '@/components/SEOMeta';
import { Layout } from '@/components/Layout';

interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  ts: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'init-0',
    role: 'agent',
    content:
      'Hi! I\'m the APEX Support Agent. I can help you with account questions, billing, feature guidance, and technical issues. How can I help you today?',
    ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

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

export function SupportPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsSending(true);

    // Simulate agent response — replace with real AI endpoint when available.
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

    const agentResponse: ChatMessage = {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content:
        'Thank you for reaching out. Our support team will review your message and respond shortly. For urgent issues, email support@apex-systems.com.',
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, agentResponse]);
    setIsSending(false);
    inputRef.current?.focus();
  };

  return (
    <Layout title="Support">
      <SEOMeta
        title="APEX Support | OmniHub Help Center"
        description="Get help with APEX OmniHub. Chat with our AI support agent, browse FAQs, or contact our team directly."
      />

      <div
        style={{
          paddingTop: '100px',
          paddingBottom: '80px',
          minHeight: '100vh',
          background: 'var(--color-bg, #060d1a)',
          fontFamily: 'var(--font, "Space Grotesk", sans-serif)',
        }}
      >
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '0 24px',
          }}
        >
          <div style={{ marginBottom: '48px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(196,81,26,0.12)',
                border: '1px solid rgba(196,81,26,0.3)',
                borderRadius: '24px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#C4511A',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 8px rgba(34,197,94,0.7)',
                  animation: 'pulse 2s infinite',
                }}
              />
              Support Agent Online
            </div>
            <h1
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 800,
                color: '#fff',
                margin: '0 0 16px',
                lineHeight: 1.1,
              }}
            >
              APEX{' '}
              <span style={{ color: '#C4511A' }}>Support</span>
            </h1>
            <p
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                color: 'rgba(255,255,255,0.55)',
                maxWidth: '560px',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Ask our AI support agent anything, or reach a human directly via email or enterprise
              channels.
            </p>
          </div>

          {/* ── Two-column layout: Chat + Contact ─────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
              gap: '32px',
              alignItems: 'start',
            }}
          >
            {/* ── Support Agent Chat ─────────────────────────────── */}
            <section
              aria-label="APEX AI Support Agent"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(196,81,26,0.25)',
                borderRadius: '20px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '520px',
                maxHeight: '620px',
              }}
            >
              {/* Chat header */}
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(196,81,26,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'rgba(196,81,26,0.2)',
                    border: '2px solid rgba(196,81,26,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}
                >
                  🤖
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                    APEX Support Agent
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#22c55e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#22c55e',
                      }}
                    />
                    Online · Typically replies instantly
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                role="log"
                aria-live="polite"
                aria-label="Support conversation"
                style={{
                  flex: 1,
                  padding: '20px 24px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '78%',
                        background:
                          msg.role === 'user'
                            ? 'rgba(196,81,26,0.85)'
                            : 'rgba(255,255,255,0.06)',
                        color: '#fff',
                        borderRadius:
                          msg.role === 'user'
                            ? '16px 16px 4px 16px'
                            : '16px 16px 16px 4px',
                        padding: '10px 14px',
                        fontSize: '13.5px',
                        lineHeight: 1.55,
                        border:
                          msg.role === 'agent'
                            ? '1px solid rgba(255,255,255,0.08)'
                            : 'none',
                      }}
                    >
                      {msg.content}
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'rgba(255,255,255,0.38)',
                          marginTop: '5px',
                          textAlign: 'right',
                        }}
                      >
                        {msg.ts}
                      </div>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: '16px 16px 16px 4px',
                        padding: '12px 16px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                      }}
                    >
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.4)',
                            animation: `pulse 1.2s ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(0,0,0,0.2)',
                }}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendMessage();
                  }}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '28px',
                    padding: '6px 6px 6px 18px',
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask a question…"
                    aria-label="Type your support message"
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#fff',
                      fontSize: '13.5px',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isSending}
                    aria-label="Send message"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: inputValue.trim() ? '#C4511A' : 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: inputValue.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                      cursor: inputValue.trim() && !isSending ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </form>
              </div>
            </section>

            {/* ── Right column: Contact + Info ─────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Email Support */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>📧</div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#fff',
                    margin: '0 0 8px',
                  }}
                >
                  Email Support
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    margin: '0 0 16px',
                    lineHeight: 1.6,
                  }}
                >
                  Our team responds within 24 hours on business days.
                </p>
                <a
                  href="mailto:support@apex-systems.com"
                  style={{
                    display: 'inline-block',
                    padding: '8px 18px',
                    background: '#C4511A',
                    color: '#fff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  support@apex-systems.com
                </a>
              </div>

              {/* Enterprise Support */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(196,81,26,0.25)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>🏢</div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#fff',
                    margin: '0 0 8px',
                  }}
                >
                  Enterprise Support
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    margin: '0 0 16px',
                    lineHeight: 1.6,
                  }}
                >
                  24/7 dedicated support, priority routing, and a designated Customer Success
                  Manager.
                </p>
                <a
                  href="/pricing"
                  style={{
                    display: 'inline-block',
                    padding: '8px 18px',
                    background: 'rgba(196,81,26,0.15)',
                    border: '1px solid rgba(196,81,26,0.4)',
                    color: '#C4511A',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  View Enterprise Plans →
                </a>
              </div>

              {/* Legal & Policies */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                }}
              >
                <h3
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: '0 0 12px',
                  }}
                >
                  Policies &amp; Legal
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Privacy Policy', href: '/privacy' },
                    { label: 'Terms of Service', href: '/terms' },
                  ].map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '13px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ color: '#C4511A' }}>›</span> {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── FAQ ─────────────────────────────────────────────────── */}
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

          {/* ── App info block (required for App Store compliance) ─── */}
          <section
            aria-label="App information"
            style={{
              marginTop: '60px',
              padding: '32px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              { label: 'Developer', value: 'APEX Business Systems LTD' },
              { label: 'Category', value: 'Business / Productivity' },
              { label: 'Support Email', value: 'support@apex-systems.com' },
              { label: 'Privacy Policy', value: 'apexomnihub.icu/privacy' },
            ].map((item) => (
              <div key={item.label}>
                <div
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.35)',
                    marginBottom: '4px',
                    fontWeight: 700,
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.75)' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </Layout>
  );
}
