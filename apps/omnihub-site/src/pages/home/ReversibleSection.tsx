export function ReversibleSection() {
  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section">
        <div className="sec-in">
          <div className="split rev">
            <div className="rv">
              <div className="tag">Architectural Primitive</div>
              <h2 className="h2">Built to<br /><span className="g">Reverse.</span></h2>
              <p className="sub">The only enterprise AI platform where rollback is a first-class architectural primitive. One bad decision does not cascade. You undo it. Completely.</p>
              <div className="feat-list">
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <path d="M5 9a4 4 0 0 1 4-4h2" stroke="#D4855A" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M8 3l3 2-3 2" stroke="#D4855A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 13H7a4 4 0 0 1 0-8" stroke="#D4855A" strokeWidth="1.3" fill="none" opacity=".5" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">One-click rollback</div>
                    <div className="feat-dsc">Reverse any agent action or workflow state with a single command. No cleanup required.</div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <path d="M9 2L15 5.5v7L9 16 3 12.5v-7L9 2Z" stroke="#D4855A" strokeWidth="1.4" fill="none" />
                      <path d="M9 8v2.5" stroke="#D4855A" strokeWidth="1.4" strokeLinecap="round" />
                      <circle cx="9" cy="13" r=".8" fill="#D4855A" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">Blast radius containment</div>
                    <div className="feat-dsc">OmniHub detects propagation risk and contains failures before they cascade across connected systems.</div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <rect x="2.5" y="5" width="6" height="4" rx="1.2" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                      <rect x="9.5" y="9" width="6" height="4" rx="1.2" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                      <path d="M8.5 7h1.5M8.5 11h1.5" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
                      <path d="M10 7c0 2-1 4-1.5 4" stroke="#D4855A" strokeWidth="1" fill="none" strokeDasharray="2 1.5" opacity=".6" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">Compensating transactions</div>
                    <div className="feat-dsc">Each agent action carries a compensating operation. Distributed state stays coherent under rollback across connected systems.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="vpanel rv d2">
              <div className="vpanel-in">
                <span className="vp-tag">Policy Engine: Active Rules</span>
                <div className="prules">
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <path d="M7 1.5L11.5 4v6L7 12.5 2.5 10V4Z" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                          <path d="M7 5.5v2" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="7" cy="9" r=".5" fill="#D4855A" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">Scope Restriction</div>
                        <div className="prule-d">No agent accesses unauthorized data scopes</div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                          <path d="M4 5h6M4 7h4M4 9h2" stroke="#D4855A" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">Audit on Write</div>
                        <div className="prule-d">Each write operation logged immutably</div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <path d="M4 7a3 3 0 0 1 3-3h2" stroke="#D4855A" strokeWidth="1.3" strokeLinecap="round" />
                          <path d="M6.5 2.5l2.5 1.5-2.5 1.5" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">Rollback Window</div>
                        <div className="prule-d">30-minute compensating transaction window</div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="5" r="2" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                          <path d="M3.5 12c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">MAN Mode</div>
                        <div className="prule-d">High-risk actions require Manual Approval Node approval</div>
                      </div>
                    </div>
                    <div className="toggle off"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="5.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                          <path d="M4 7h6M7 4v6" stroke="#D4855A" strokeWidth="1" strokeLinecap="round" opacity=".6" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">Cross-Border Block</div>
                        <div className="prule-d">GDPR: EU data stays within EEA zones</div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
