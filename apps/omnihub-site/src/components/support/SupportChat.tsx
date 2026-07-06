import { useState, useRef } from 'react';

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

export function SupportChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
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
  );
}
