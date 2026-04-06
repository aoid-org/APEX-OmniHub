type SplitProps = { id?: string; eyebrow: string; title: string; accent: string; copy: string; items: [string, string, JSX.Element][]; panel: JSX.Element; reverse?: boolean; };

export function PanelAudit() {
  const rows = [['14:32:07','SalesForce Sync: write contact #4821','Authorized','ok'],['14:32:05','Compliance Reporter: export GDPR batch','Logged','info'],['14:31:58','ERP Orchestrator: inventory sync complete','Authorized','ok'],['14:31:44','Anomaly: unauthorized scope attempt blocked','Blocked','warn'],['14:31:33','Policy update: RBAC rule #12 applied','Logged','info'],['14:31:20','Workflow: Invoice Reconcile, step 3 of 6','Authorized','ok']] as const;
  return <div className="refresh-home__panel"><span className="refresh-home__panel-tag">Live Audit Trail</span><div className="refresh-home__audit-log">{rows.map(([time,text,badge,tone]) => <div key={`${time}-${text}`} className="refresh-home__audit-row"><span className="refresh-home__audit-time">{time}</span><span className={`refresh-home__audit-dot refresh-home__audit-dot--${tone}`} /><span className="refresh-home__audit-text">{text}</span><span className={`refresh-home__audit-badge refresh-home__audit-badge--${tone}`}>{badge}</span></div>)}</div></div>;
}

export function PanelPolicy() {
  const rows = [['Scope Restriction','No agent accesses unauthorized data scopes'],['Rollback Required','Compensating operation enforced before closeout'],['Human Oversight','MAN Mode required for high-risk actions'],['Regional Compliance','Geo-aware execution constraints per workspace']] as const;
  return <div className="refresh-home__panel"><span className="refresh-home__panel-tag">Policy Engine</span><div className="refresh-home__policy-list">{rows.map(([title,description],i) => <div key={title} className="refresh-home__policy-row"><div><div className="refresh-home__policy-title">{title}</div><div className="refresh-home__policy-description">{description}</div></div><span className={`refresh-home__toggle ${i===3?'refresh-home__toggle--off':''}`} /></div>)}</div></div>;
}

export function SplitSection({ id, eyebrow, title, accent, copy, items, panel, reverse = false }: SplitProps) {
  return <section id={id} className="refresh-home__section"><div className={`container refresh-home__split ${reverse ? 'refresh-home__split--reverse' : ''}`}><div><div className="refresh-home__eyebrow">{eyebrow}</div><h2 className="refresh-home__section-title">{title}<br/><span>{accent}</span></h2><p className="refresh-home__section-copy">{copy}</p><div className="refresh-home__feature-list">{items.map(([t,d,icon]) => <div key={t} className="refresh-home__feature-item"><div className="refresh-home__feature-icon">{icon}</div><div><div className="refresh-home__feature-title">{t}</div><div className="refresh-home__feature-description">{d}</div></div></div>)}</div></div><div>{panel}</div></div></section>;
}
