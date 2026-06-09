export function EnterpriseSection() {
  const cards = [
    { n: "SOC 2 Type II", d: "Security and availability controls validated by independent audit" },
    { n: "EU AI Act Art. 14", d: "Manual Approval Node governance requirements for high-risk AI systems" },
    { n: "GDPR Article 30", d: "Complete records of processing activities, always exportable" },
    { n: "ISO 27001", d: "Information security management system compatible architecture" },
    { n: "HIPAA-Ready", d: "Healthcare data handling architecture with BAA support" },
    { n: "Zero Trust Model", d: "No implicit trust. Each agent and action verified." },
    { n: "RBAC + ABAC", d: "Granular role and attribute-based access control across all surfaces" },
    { n: "E2E Encryption", d: "All data in transit and at rest encrypted with AES-256" }
  ];

  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section" id="enterprise">
        <div className="sec-in">
          <div className="rv">
            <div className="tag">Enterprise Ready</div>
            <h2 className="h2">Built for regulated<br />environments.</h2>
            <p className="sub">Architected from day one for compliance and governance across finance, healthcare, legal, and government.</p>
          </div>
          <div className="comp-grid">
            {cards.map((card, idx) => (
              <div key={card.n} className={`comp-card rv d${idx % 4}`}>
                <div className="comp-chk">&#10003;</div>
                <div className="comp-n">{card.n}</div>
                <div className="comp-d">{card.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
