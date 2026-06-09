export function MaestroSection() {
  const rows = [
    { l: "M", word: "Multi-Agent", desc: "coordination at enterprise scale, all synchronized" },
    { l: "A", word: "Authorized", desc: "execution, each action gated by policy" },
    { l: "E", word: "Explainable", desc: "decisions in plain operational language, always" },
    { l: "S", word: "Synchronized", desc: "state across all connected systems, in real time" },
    { l: "T", word: "Traceable", desc: "outcomes with cryptographic immutable audit chains" },
    { l: "R", word: "Reversible", desc: "by design, rollback is a first-class platform primitive" },
    { l: "O", word: "Operational authority", desc: "returned entirely to your organization" }
  ];

  return (
    <div className="maestro-wrap hov-section" id="maestro">
      <div className="maestro-in">
        <div className="rv">
          <div className="tag">Core Philosophy</div>
          <h2 className="h2">The MAESTRO<br />Principle.</h2>
          <p className="sub" style={{ marginBottom: '20px' }}>Intelligence is not just capability. It is coordination with consequence. MAESTRO is the operating philosophy baked into each layer of APEX OmniHub.</p>
          <p style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: '1.72', letterSpacing: '-.1px', textAlign: 'justify', textIndent: '2em', marginBottom: '32px' }}>Enterprise AI must serve your organization's intent. As the system scales, MAESTRO ensures authority scales with it.</p>
          <a href="/maestro" className="btn btn--primary" style={{ display: 'inline-block' }}>Explore MAESTRO Protocol</a>
        </div>
        <div className="maestro-rows rv d2">
          {rows.map((row) => (
            <div key={row.l} className="m-row">
              <div className="m-l">{row.l}</div>
              <div>
                <div className="m-word">{row.word}</div>
                <div className="m-desc">{row.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
