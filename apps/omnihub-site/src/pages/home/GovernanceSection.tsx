export function GovernanceSection() {
  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section" id="platform">
        <div className="sec-in">
          <div className="split">
            <div className="rv">
              <div className="tag">Total Command</div>
              <h2 className="h2">Absolute<br /><span className="g">Governance.</span></h2>
              <p className="sub">You issue the directive. OmniHub orchestrates every connected system with full real-time visibility. Actions logged. Agents tracked. Outcomes traceable.</p>
              <div className="feat-list">
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <path d="M3 4h12M3 8h8M3 12h5" stroke="#D4855A" strokeWidth="1.6" strokeLinecap="round" />
                      <circle cx="14" cy="10" r="3.5" stroke="#D4855A" strokeWidth="1.4" fill="none" />
                      <path d="M13 10l1 1 1.5-1.5" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">Natural language directives</div>
                    <div className="feat-dsc">Issue commands in plain language. OmniHub translates intent into structured task plans dispatched across your agent network.</div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="2.5" fill="#D4855A" opacity=".9" />
                      <circle cx="9" cy="9" r="6.5" stroke="#D4855A" strokeWidth="1.3" fill="none" strokeDasharray="3 2" />
                      <path d="M9 2.5V1M9 17v-1.5M2.5 9H1M17 9h-1.5" stroke="#D4855A" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">Capability-matched routing</div>
                    <div className="feat-dsc">Each task routes to the most qualified agent. No guesswork, no misroutes, full audit of each routing decision.</div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <rect x="3" y="3" width="12" height="12" rx="2" stroke="#D4855A" strokeWidth="1.4" fill="none" />
                      <path d="M9 6v4M7 8l2 2 2-2" stroke="#D4855A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="6" y1="13" x2="12" y2="13" stroke="#D4855A" strokeWidth="1.3" strokeLinecap="round" opacity=".5" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">Override any agent, instantly</div>
                    <div className="feat-dsc">One command halts, redirects, or replaces any running agent mid-execution. You remain in full control at all times.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="vpanel rv d2">
              <div className="vpanel-in">
                <span className="vp-tag">Live Audit Trail</span>
                <div className="alog">
                  <div className="arow"><span className="at">14:32:07</span><span className="adot ok"></span><span className="atxt">SalesForce Sync: write contact #4821</span><span className="apill p-auth">Authorized</span></div>
                  <div className="arow"><span className="at">14:32:05</span><span className="adot info"></span><span className="atxt">Compliance Reporter: export GDPR batch</span><span className="apill p-log">Logged</span></div>
                  <div className="arow"><span className="at">14:31:58</span><span className="adot ok"></span><span className="atxt">ERP Orchestrator: inventory sync complete</span><span className="apill p-auth">Authorized</span></div>
                  <div className="arow"><span className="at">14:31:44</span><span className="adot warn"></span><span className="atxt">Anomaly: unauthorized scope attempt blocked</span><span className="apill p-block">Blocked</span></div>
                  <div className="arow"><span className="at">14:31:33</span><span className="adot info"></span><span className="atxt">Policy update: RBAC rule #12 applied</span><span className="apill p-log">Logged</span></div>
                  <div className="arow"><span className="at">14:31:20</span><span className="adot ok"></span><span className="atxt">Workflow: Invoice Reconcile, step 3 of 6</span><span className="apill p-auth">Authorized</span></div>
                  <div className="arow"><span className="at">14:31:08</span><span className="adot ok"></span><span className="atxt">Agent deployed: Customer360 Aggregator</span><span className="apill p-auth">Authorized</span></div>
                  <div className="arow"><span className="at">14:30:55</span><span className="adot info"></span><span className="atxt">MAN Mode activated: ERP agent paused</span><span className="apill p-log">Logged</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
