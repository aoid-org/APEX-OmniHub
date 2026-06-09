export function CapabilitiesSection() {
  const capabilities = [
    {
      title: "Universal Connector Network",
      path: "/smart-integrations",
      desc: "Universal compatibility across legacy, Web2, Web3, AI, NFT, and blockchain applications. Connect and govern from one surface without an arbitrary integration ceiling.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M3 10h14M10 3v14" stroke="#D4855A" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="10" r="7.5" stroke="#D4855A" strokeWidth="1.3" fill="none" strokeDasharray="4 2.5" opacity=".5" />
          <circle cx="10" cy="10" r="2" fill="#D4855A" opacity=".8" />
        </svg>
      )
    },
    {
      title: "OmniDash",
      path: "/omnidash",
      desc: "Your governed intelligence command center. Monitor every agent, workflow, integration, and event from a single real-time surface with role-enforced visibility.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2" width="7" height="8" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
          <rect x="11" y="2" width="7" height="4" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
          <rect x="11" y="8" width="7" height="10" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
          <rect x="2" y="12" width="7" height="6" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
          <path d="M4 6h3M4 15h3M13 10h3M13 12h2" stroke="#D4855A" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
        </svg>
      )
    },
    {
      title: "Tri-Force Architecture",
      path: "/tri-force",
      desc: "A decentralized tripartite model for uncompromised security: Guardian, Planner, and Executor operate in perfect isolation.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M10 2L2 16h16L10 2z" stroke="#D4855A" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
          <path d="M10 8l-3.5 6h7L10 8z" stroke="#D4855A" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      title: "SkillForge/OmniSkills",
      path: "/ai-automation",
      desc: "Forge, install, and govern expert-level OmniSkills for any task or business use case, giving users task-ready agents with reusable skill memory and auditable execution paths.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="5" r="2.5" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <circle cx="4" cy="15" r="2.5" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <circle cx="16" cy="15" r="2.5" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <line x1="8.3" y1="6.8" x2="5.7" y2="12.8" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="11.7" y1="6.8" x2="14.3" y2="12.8" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="6.5" y1="15" x2="13.5" y2="15" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )
    },
    {
      title: "Real-Time Telemetry",
      path: "/advanced-analytics",
      desc: "Live operational intelligence across all agents and workflows. See what is running, what failed, and where attention is needed.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M2 14L5 8l3 4 3-6 3 3 3-5" stroke="#D4855A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="18" cy="5" r="1.5" fill="#D4855A" />
        </svg>
      )
    },
    {
      title: "Policy Enforcement Engine",
      path: "/fortress",
      desc: "Governance rules apply before any action executes. No agent bypasses policy, no exceptions.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M10 2L16 5.5v9L10 18 4 14.5v-9L10 2Z" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <path d="M10 8v3" stroke="#D4855A" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="10" cy="14" r=".8" fill="#D4855A" />
        </svg>
      )
    },
    {
      title: "PhysiOmni",
      path: "/physiomni",
      desc: "The physical AI operations layer. Deploy, govern, and orchestrate embodied AI systems and robotics through the same governed command surface as your digital agents.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <rect x="7" y="2" width="6" height="5" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
          <circle cx="10" cy="4.5" r="1" fill="#D4855A" opacity="0.7" />
          <rect x="5" y="8" width="10" height="7" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
          <path d="M7 11h2M11 11h2M8 13.5h4" stroke="#D4855A" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
          <path d="M3 10v4M17 10v4" stroke="#D4855A" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M5 16l-1 2M15 16l1 2" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M10 7v1" stroke="#D4855A" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )
    },
    {
      title: "MAN Mode",
      path: "/man-mode",
      desc: "Manual Approval Node. High-risk actions pause at an approval checkpoint while authorized operators approve, reject, or escalate with full traceability.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M10 3v4M10 13v4M3 10h4M13 10h4" stroke="#D4855A" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="10" r="3" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <circle cx="10" cy="10" r=".8" fill="#D4855A" />
        </svg>
      )
    },
    {
      title: "Connect AI / BYOM",
      path: "/byom",
      desc: "Bring Your Own Model. Plug in any LLM — OpenAI, Anthropic, Gemini, Mistral, or private on-prem — into governed workflows with full auditability and zero vendor lock-in.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3.5" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <circle cx="3" cy="5" r="1.8" stroke="#D4855A" strokeWidth="1.2" fill="none" />
          <circle cx="17" cy="5" r="1.8" stroke="#D4855A" strokeWidth="1.2" fill="none" />
          <circle cx="3" cy="15" r="1.8" stroke="#D4855A" strokeWidth="1.2" fill="none" />
          <circle cx="17" cy="15" r="1.8" stroke="#D4855A" strokeWidth="1.2" fill="none" />
          <path d="M4.6 6.3L7.2 8M12.8 8l2.6-1.7M4.6 13.7L7.2 12M12.8 12l2.6 1.7" stroke="#D4855A" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
          <circle cx="10" cy="10" r="1.2" fill="#D4855A" opacity="0.8" />
        </svg>
      )
    }
  ];

  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section" id="features">
        <div className="sec-in">
          <div className="rv">
            <div className="tag">Platform Capabilities</div>
            <h2 className="h2">Everything you need<br />to govern enterprise AI.</h2>
            <p className="sub">One platform. No black boxes. No vendor lock-in. No surprises.</p>
          </div>
          <div className="cap-grid">
            {capabilities.map((cap, idx) => (
              <a href={cap.path} key={cap.title} className={`cap-card rv d${idx % 4}`} style={{ textDecoration: 'none' }}>
                <div className="cap-ico">{cap.icon}</div>
                <div className="cap-ttl">{cap.title} <span className="cap-arrow" style={{ opacity: 0.5 }}>→</span></div>
                <div className="cap-dsc">{cap.desc}</div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
