/**
 * APEX-OmniHub Protocol Omega - TypeScript CLI Wrapper
 * Zero external dependencies - integrates with guardian pattern
 */

import { spawn, execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Configuration
const OMEGA_DIR = join(homedir(), '.apex', 'omega');
const ENGINE_PATH = join(process.cwd(), 'omega', 'engine.py');
const DASHBOARD_PATH = join(process.cwd(), 'omega', 'dashboard.py');

interface VerificationRequest {
  intent: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  context?: Record<string, any>;
}

interface VerificationResult {
  approved: boolean;
  status: string;
  task_hash: string;
  short_hash: string;
}

interface ApprovalResult {
  success: boolean;
  task_hash?: string;
  short_hash?: string;
  error?: string;
}

/**
 * Protocol Omega Verifier - State-Gated Engineering Engine
 */
export class OmegaVerifier {
  private static instance: OmegaVerifier;

  private constructor() {
    this.ensureEngine();
  }

  static getInstance(): OmegaVerifier {
    if (!OmegaVerifier.instance) {
      OmegaVerifier.instance = new OmegaVerifier();
    }
    return OmegaVerifier.instance;
  }

  /**
   * Ensure omega engine is initialized
   */
  private ensureEngine(): void {
    if (!existsSync(OMEGA_DIR)) {
      mkdirSync(OMEGA_DIR, { recursive: true });
    }

    if (!existsSync(ENGINE_PATH)) {
      throw new Error(
        `Protocol Omega engine not found at ${ENGINE_PATH}\n` +
        `Run: npm run omega:install`
      );
    }
  }

  /**
   * Execute Python engine command
   */
  private execEngine(args: string[]): any {
    try {
      const result = execSync(`python3 "${ENGINE_PATH}" ${args.join(' ')}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      return JSON.parse(result);
    } catch (error: any) {
      // Try to parse error output as JSON
      try {
        return JSON.parse(error.stdout || error.stderr || '{}');
      } catch {
        throw new Error(`Omega engine error: ${error.message}`);
      }
    }
  }

  /**
   * Request approval for an action
   */
  async requestApproval(request: VerificationRequest): Promise<VerificationResult> {
    const args = [
      'request',
      `"${request.intent}"`,
      request.riskLevel,
    ];

    if (request.context) {
      args.push(`'${JSON.stringify(request.context)}'`);
    }

    const result = this.execEngine(args);

    if (result.status === 'PENDING') {
      this.renderPendingDashboard(result);
    }

    return {
      approved: result.status === 'APPROVED',
      status: result.status,
      task_hash: result.task_hash,
      short_hash: result.short_hash
    };
  }

  /**
   * Check if action is approved
   */
  async checkApproval(intent: string): Promise<VerificationResult> {
    const result = this.execEngine(['check', `"${intent}"`]);

    return {
      approved: result.approved || false,
      status: result.status,
      task_hash: result.task_hash,
      short_hash: result.short_hash
    };
  }

  /**
   * Approve a task (CLI usage)
   */
  async approve(taskHash: string): Promise<ApprovalResult> {
    return this.execEngine(['approve', taskHash]);
  }

  /**
   * Reject a task (CLI usage)
   */
  async reject(taskHash: string, reason?: string): Promise<ApprovalResult> {
    const args = ['reject', taskHash];
    if (reason) {
      args.push(`"${reason}"`);
    }
    return this.execEngine(args);
  }

  /**
   * List pending approvals
   */
  async listPending(): Promise<any[]> {
    return this.execEngine(['list']);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<Record<string, number>> {
    return this.execEngine(['stats']);
  }

  /**
   * Render visual dashboard for pending approval
   */
  private renderPendingDashboard(result: any): void {
    const riskColors = {
      LOW: { color: '#22c55e', width: '33%' },
      MEDIUM: { color: '#eab308', width: '66%' },
      HIGH: { color: '#ef4444', width: '100%' }
    };

    const risk = riskColors[result.risk_level as keyof typeof riskColors] || riskColors.MEDIUM;

    const svg = `
<svg width="700" height="250" viewBox="0 0 700 250" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#09090b" rx="12"/>
  <rect x="2" y="2" width="696" height="246" fill="none" stroke="#3f3f46" stroke-width="2" rx="10"/>

  <!-- Status Indicator -->
  <circle cx="40" cy="40" r="12" fill="#eab308" stroke="#fff" stroke-width="2">
    <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
  </circle>
  <text x="70" y="45" fill="#e4e4e7" font-family="monospace" font-size="20" font-weight="bold">APPROVAL REQUIRED</text>

  <!-- Intent Hash -->
  <text x="40" y="85" fill="#a1a1aa" font-family="monospace" font-size="12">TASK HASH: ${result.task_hash}</text>
  <text x="40" y="105" fill="#71717a" font-family="monospace" font-size="11">SHORT: ${result.short_hash}</text>

  <!-- Risk Level Bar -->
  <text x="40" y="135" fill="#a1a1aa" font-family="sans-serif" font-size="11" font-weight="bold">RISK LEVEL</text>
  <rect x="40" y="145" width="620" height="8" fill="#27272a" rx="4"/>
  <rect x="40" y="145" width="${risk.width}" height="8" fill="${risk.color}" rx="4">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
  </rect>
  <text x="40" y="170" fill="${risk.color}" font-family="monospace" font-size="14" font-weight="bold">${result.risk_level}</text>

  <!-- Intent -->
  <text x="40" y="195" fill="#a1a1aa" font-family="sans-serif" font-size="11" font-weight="bold">INTENT</text>
  <text x="40" y="215" fill="#e4e4e7" font-family="monospace" font-size="12">${result.intent.substring(0, 70)}${result.intent.length > 70 ? '...' : ''}</text>

  <!-- Actions -->
  <g transform="translate(40, 230)">
    <rect width="200" height="32" fill="#18181b" stroke="#22c55e" stroke-width="1" rx="6"/>
    <text x="100" y="21" text-anchor="middle" fill="#22c55e" font-family="monospace" font-size="13">
      CLI: omega:approve ${result.short_hash}
    </text>
  </g>

  <g transform="translate(260, 230)">
    <rect width="200" height="32" fill="#18181b" stroke="#3b82f6" stroke-width="1" rx="6"/>
    <text x="100" y="21" text-anchor="middle" fill="#3b82f6" font-family="monospace" font-size="13">
      WEB: http://localhost:8042
    </text>
  </g>

  <g transform="translate(480, 230)">
    <rect width="180" height="32" fill="#18181b" stroke="#ef4444" stroke-width="1" rx="6"/>
    <text x="90" y="21" text-anchor="middle" fill="#ef4444" font-family="monospace" font-size="13">
      omega:reject ${result.short_hash}
    </text>
  </g>
</svg>`;

    console.log('\n' + svg + '\n');
  }

  /**
   * Start approval dashboard server
   */
  async startDashboard(): Promise<void> {
    console.log('🚀 Starting Protocol Omega Dashboard...\n');

    const dashboard = spawn('python3', [DASHBOARD_PATH], {
      stdio: 'inherit'
    });

    dashboard.on('close', (code) => {
      console.log(`\n📡 Dashboard stopped (exit code: ${code})`);
    });

    // Keep process alive
    process.on('SIGINT', () => {
      dashboard.kill();
      process.exit(0);
    });
  }
}

/**
 * Verification decorator for high-risk operations
 */
export function requiresApproval(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM') {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const verifier = OmegaVerifier.getInstance();
      const intent = `${propertyKey}(${JSON.stringify(args).substring(0, 100)})`;

      const check = await verifier.checkApproval(intent);

      if (check.approved) {
        return originalMethod.apply(this, args);
      }

      await verifier.requestApproval({
        intent,
        riskLevel,
        context: { method: propertyKey, args }
      });

      throw new Error(
        `⚠️  APPROVAL REQUIRED: ${intent}\n` +
        `Task Hash: ${check.short_hash}\n` +
        `Approve via: npm run omega:approve ${check.short_hash}`
      );
    };

    return descriptor;
  };
}

/**
 * CLI Main
 */
async function main() {
  const verifier = OmegaVerifier.getInstance();
  const command = process.argv[2];

  if (!command) {
    console.log(`
🔒 Protocol Omega - Zero-Dependency Verification System

Commands:
  npm run omega:dashboard       Start web dashboard
  npm run omega:approve <hash>  Approve a task
  npm run omega:reject <hash>   Reject a task
  npm run omega:list            List pending approvals
  npm run omega:stats           Show statistics

Examples:
  npm run omega:approve a1b2c3d4
  npm run omega:reject a1b2c3d4 "Not authorized"
    `);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'dashboard':
        await verifier.startDashboard();
        break;

      case 'approve':
        const approveHash = process.argv[3];
        if (!approveHash) {
          console.error('❌ Usage: omega:approve <task_hash>');
          process.exit(1);
        }
        const approveResult = await verifier.approve(approveHash);
        console.log(JSON.stringify(approveResult, null, 2));
        process.exit(approveResult.success ? 0 : 1);
        break;

      case 'reject':
        const rejectHash = process.argv[3];
        const reason = process.argv[4];
        if (!rejectHash) {
          console.error('❌ Usage: omega:reject <task_hash> [reason]');
          process.exit(1);
        }
        const rejectResult = await verifier.reject(rejectHash, reason);
        console.log(JSON.stringify(rejectResult, null, 2));
        process.exit(rejectResult.success ? 0 : 1);
        break;

      case 'list':
        const pending = await verifier.listPending();
        console.log(JSON.stringify(pending, null, 2));
        break;

      case 'stats':
        const stats = await verifier.getStats();
        console.log(JSON.stringify(stats, null, 2));
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run CLI if executed directly (ES module compatibility)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export default OmegaVerifier;
