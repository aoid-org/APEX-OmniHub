import { Layout, Section } from '@/components';

export function ManModePage() {

  return (
    <Layout title="MAN Mode">
      <Section>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Header Section */}
          <div className="mb-12 text-center">
            <h1 className="heading-1 mb-4">MAN Mode</h1>
            <p className="text-xl text-accent font-mono">protocol_v1.0.0 // manual_authorization_needed</p>
          </div>

          {/* Abstract */}
          <div className="card mb-8 p-8 border-l-4 border-l-accent">
            <h3 className="heading-4 mb-2 font-mono uppercase text-sm tracking-wider opacity-70">01. Abstract</h3>
            <p className="text-secondary leading-relaxed">
              MAN Mode (Manual Authorization Needed) is a hybrid workflow governance protocol designed to bridge the gap between autonomous high-frequency automation and critical human oversight. 
              By decoupling &quot;flagging&quot; from &quot;blocking,&quot; MAN Mode allows non-deterministic or high-risk operations to be suspended for human review without arresting the broader execution context of the parent workflow.
            </p>
          </div>

          {/* Core Philosophy */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="card p-6">
              <h3 className="heading-4 mb-4 font-mono uppercase text-sm tracking-wider opacity-70">02. Design Philosophy</h3>
              <ul className="space-y-3 text-secondary text-sm">
                <li className="flex gap-2">
                  <span className="text-accent font-bold">::</span>
                  <span>Non-Blocking by Default</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">::</span>
                  <span>Asynchronous Adjudication</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">::</span>
                  <span>Full Audit Immutability</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">::</span>
                  <span>Zero-Trust Initialization</span>
                </li>
              </ul>
            </div>
            
            <div className="card p-6">
              <h3 className="heading-4 mb-4 font-mono uppercase text-sm tracking-wider opacity-70">03. Alert Vectors</h3>
              <ul className="space-y-3 text-secondary text-sm">
                <li className="flex gap-2">
                  <span className="text-accent font-bold">→</span>
                  <span>In-App Dashboard Interrupt</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">→</span>
                  <span>SMTP/Email Protocol</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">→</span>
                  <span>Slack/Teams Webhooks</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">→</span>
                  <span>SMS/PagerDuty Gateway</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Technical Implementation */}
          <div className="mb-12">
            <h2 className="heading-2 mb-6">Technical Implementation</h2>
            <div className="card p-8 bg-surface-elevated font-mono text-xs overflow-x-auto">
              <div className="text-secondary mb-4"># Workflow Logic Definition</div>
              <pre className="text-accent">
{`function executeStep(step, context) {
  if (riskAnalysis(step) > THRESHOLD) {
    // Flag for MAN Mode
    const authorizationRequest = createAuthRequest({
      riskLevel: 'HIGH',
      reason: step.riskFactors,
      context: context.snapshot()
    });
    
    // Non-blocking: Parent process continues if not depedency
    if (!step.isBlocking) {
      return Promise.resolve({ status: 'PENDING_AUTH', ref: authorizationRequest.id });
    }
  }
  
  return step.execute();
}`}
              </pre>
            </div>
          </div>

          {/* Risk Taxonomy */}
          <div className="mb-12">
            <h2 className="heading-2 mb-6">Risk Taxonomy & Classification</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card p-5 border border-red-900/30">
                <div className="text-accent font-bold mb-2 font-mono">CLASS_A (Financial)</div>
                <p className="text-sm text-secondary">Transactions &gt; $10k, New Vendor Creation, Payroll Modifications.</p>
              </div>
              <div className="card p-5 border border-red-900/30">
                <div className="text-accent font-bold mb-2 font-mono">CLASS_B (Security)</div>
                <p className="text-sm text-secondary">IAM Policy Updates, Key Rotation, Public Bucket Configuration.</p>
              </div>
              <div className="card p-5 border border-red-900/30">
                <div className="text-accent font-bold mb-2 font-mono">CLASS_C (Data)</div>
                <p className="text-sm text-secondary">Bulk Export (PII/PHI), Schema Destructive Migrations.</p>
              </div>
              <div className="card p-5 border border-red-900/30">
                <div className="text-accent font-bold mb-2 font-mono">CLASS_D (Ops)</div>
                <p className="text-sm text-secondary">Production Deployment, Infrastructure Scaling &gt; 200%.</p>
              </div>
            </div>
          </div>

          {/* Sequence Diagram Representation */}
          <div className="mb-16">
            <h2 className="heading-2 mb-6">Execution Sequence</h2>
            <div className="card p-8 bg-navy text-white">
              <div className="flex flex-col gap-4 font-mono text-sm">
                <div className="flex items-center gap-4">
                  <span className="w-24 text-gray-500">[00:00.00]</span>
                  <span className="text-green-400">INIT</span>
                  <span>Workflow &quot;Customer_Onboarding_v4&quot; started</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-24 text-gray-500">[00:00.15]</span>
                  <span className="text-green-400">EXEC</span>
                  <span>Step 1: CRM Record Created</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-24 text-gray-500">[00:00.42]</span>
                  <span className="text-yellow-400">WARN</span>
                  <span>Step 2: Admin Access Request &gt;&gt; <span className="text-orange-500 font-bold">MAN MODE TRIGGERED</span></span>
                </div>
                <div className="flex items-center gap-4 pl-28 border-l border-dashed border-gray-700 ml-6">
                  <span className="text-gray-400">↳ Alert dispatched to #security-ops</span>
                </div>
                <div className="flex items-center gap-4 pl-28 border-l border-dashed border-gray-700 ml-6">
                  <span className="text-gray-400">↳ Incident #8492 created</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-24 text-gray-500">[00:00.45]</span>
                  <span className="text-green-400">EXEC</span>
                  <span>Step 3: Welcome Email Sent (Non-blocking)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-24 text-gray-500">[00:00.50]</span>
                  <span className="text-blue-400">WAIT</span>
                  <span>Workflow marked &quot;Partially Complete&quot; - Awaiting Auth #8492</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center p-8 bg-surface border border-border rounded-lg">
            <h3 className="heading-3 mb-4">Directable. Accountable. Dependable.</h3>
            <p className="text-secondary mb-8 max-w-2xl mx-auto">
              MAN Mode is not just a feature; it&#39;s a safety philosophy baked into the core of the APEX OmniHub Orchestrator.
            </p>
            <div className="flex justify-center gap-4">
              <a href="/demo" className="btn btn--primary">See a Live Demo</a>
              <a href="/tech-specs" className="btn btn--secondary">Technical Details</a>
            </div>
          </div>

        </div>
      </Section>
    </Layout>
  );
}
