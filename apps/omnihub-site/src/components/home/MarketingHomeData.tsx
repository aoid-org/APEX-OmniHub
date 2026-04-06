import { IconAgents, IconCheck, IconCompensate, IconConnector, IconContainment, IconDirective, IconManMode, IconOverride, IconPolicy, IconRollback, IconRouting, IconTelemetry, IconWorkflow } from '@/components/home/MarketingRefreshIcons';

export const ticker = ['Universal Sync','Agent Governance','Immutable Audit Log','Policy Enforcement','One-Click Rollback','MAN Mode','Tri-Force Architecture','Zero Vendor Lock-In','200+ Integrations','SOC 2 Aligned'];
export const governance = [
  ['Natural language directives','Issue commands in plain language. OmniHub translates intent into structured task plans dispatched across your agent network.',<IconDirective size={18} />],
  ['Capability-matched routing','Every task routes to the most qualified agent. No guesswork, no misroutes. Full audit of every routing decision.',<IconRouting size={18} />],
  ['Override any agent, instantly','One command halts, redirects, or replaces any running agent mid-execution. You stay in full control at every step.',<IconOverride size={18} />],
];
export const reverse = [
  ['One-click rollback','Any agent action. Any workflow state. Reverse completely with a single command. No manual cleanup required.',<IconRollback size={18} />],
  ['Blast radius containment','OmniHub detects propagation risk and contains failures before they cascade across connected systems.',<IconContainment size={18} />],
  ['Compensating transactions','Every agent action carries a compensating operation. Distributed state stays coherent under rollback across connected systems.',<IconCompensate size={18} />],
];
export const capability = [
  ['Universal Connector Network','200+ native integrations across CRMs, ERPs, cloud platforms, and data warehouses. Connect everything. Govern from one surface.',<IconConnector size={20} />],
  ['Multi-Agent Orchestration','Deploy, coordinate, and monitor multiple AI agents simultaneously. Each is scoped, authorized, and fully observable in real time.',<IconAgents size={20} />],
  ['Real-Time Telemetry','Live operational intelligence across every agent and workflow. Know what is running, what failed, and what needs attention.',<IconTelemetry size={20} />],
  ['Policy Enforcement Engine','Codify organizational rules once and enforce them everywhere with auditable authorization gates.',<IconPolicy size={20} />],
  ['Workflow Intelligence','Deterministic execution paths, compensating logic, and state continuity across software, agents, and physical AI.',<IconWorkflow size={20} />],
  ['MAN Mode','Pause only what needs approval. Let the rest of the workflow keep moving while operators make the final call.',<IconManMode size={20} />],
];
export const maestro = [
  ['M','Multi-Agent','coordination at enterprise scale, all synchronized'],
  ['A','Authorized','execution, every single action gated by policy'],
  ['E','Explainable','decisions in plain operational language, always'],
  ['S','Synchronized','state across every connected system, in real time'],
  ['T','Traceable','outcomes with cryptographic immutable audit chains'],
  ['R','Reversible','by design, rollback is a first-class platform primitive'],
  ['O','Operational authority','returned entirely to your organization'],
];
export const compliance = [
  ['SOC 2 Type II','Security and availability controls validated by independent audit.',<IconCheck size={16} />],
  ['EU AI Act Art. 14','Human oversight requirements for high-risk AI systems.',<IconCheck size={16} />],
  ['GDPR Article 30','Complete records of processing activities, always exportable.',<IconCheck size={16} />],
  ['ISO 27001','Information security management system compatible architecture.',<IconCheck size={16} />],
  ['HIPAA-Ready','Healthcare data handling architecture with BAA support.',<IconCheck size={16} />],
  ['Zero Trust Model','No implicit trust. Every agent and every action verified.',<IconCheck size={16} />],
  ['RBAC + ABAC','Granular role and attribute-based access control across all surfaces.',<IconCheck size={16} />],
  ['E2E Encryption','All data in transit and at rest encrypted with strong modern standards.',<IconCheck size={16} />],
];
