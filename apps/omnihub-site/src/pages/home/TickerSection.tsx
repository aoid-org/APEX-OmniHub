export function TickerSection() {
  const items = [
    "Universal Sync", "Agent Governance", "Immutable Audit Log", "Policy Enforcement",
    "One-Click Rollback", "MAN Mode", "Tri-Force Architecture", "Zero Vendor Lock-In",
    "Universal Integrations", "SOC 2 Aligned"
  ];
  const doubledItems = [...items, ...items];

  return (
    <div className="ticker">
      <div className="ticker-track">
        {doubledItems.map((item, idx) => (
          <div key={`${item}-${idx < items.length ? 'primary' : 'mirror'}`} className="ticker-item">{item}<span className="ticker-dot">&middot;</span></div>
        ))}
      </div>
    </div>
  );
}
