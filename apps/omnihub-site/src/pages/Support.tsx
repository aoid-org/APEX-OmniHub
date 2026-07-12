import { SEOMeta } from '@/components/SEOMeta';
import { Layout } from '@/components/Layout';
import { SupportChat } from '@/components/support/SupportChat';
import { SupportFaq } from '@/components/support/SupportFaq';

export function SupportPage() {
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
            <SupportChat />

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
          <SupportFaq />

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
