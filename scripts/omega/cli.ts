/**
 * Protocol Omega - TypeScript CLI Interface
 *
 * Zero-dependency command verification system CLI.
 * Provides a secure interface to the Python verification engine.
 *
 * SonarQube Compliance:
 * - Uses node:child_process, node:fs, node:path, node:os (S6747)
 * - Input validation prevents command injection (S4721)
 * - Secure PATH handling (S4036)
 * - Case block declarations properly scoped
 * - Top-level await pattern
 * - No unused imports
 */

import { execFileSync, spawn, type SpawnOptions } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

// Constants
const OMEGA_DIR = path.join(process.cwd(), 'omega');
const ENGINE_PATH = path.join(OMEGA_DIR, 'engine.py');
const DASHBOARD_PATH = path.join(OMEGA_DIR, 'dashboard.py');

/**
 * Validate command arguments to prevent injection attacks
 * Does not modify args - only validates them for safety
 */
function validateArgs(args: string[]): void {
  for (const arg of args) {
    // Check for shell metacharacters that could cause injection
    const dangerousChars = /[;&|`$()<>]/;
    if (dangerousChars.test(arg)) {
      throw new Error(
        `Argument contains potentially dangerous characters: "${arg}"`
      );
    }
  }
}

/**
 * Validate that a file path is safe and within expected boundaries
 */
function validatePath(filePath: string): string {
  // Resolve to absolute path
  const resolved = path.resolve(filePath);

  // Ensure it's within the omega directory
  if (!resolved.startsWith(OMEGA_DIR)) {
    throw new Error(`Path must be within omega directory: ${filePath}`);
  }

  return resolved;
}

/**
 * Get secure environment with restricted PATH
 * Prevents PATH injection attacks (SonarQube S4036)
 */
function getSecureEnv(): NodeJS.ProcessEnv {
  // Use only system-level, read-only directories in PATH
  const securePath = [
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/local/sbin',
    '/usr/sbin',
    '/sbin',
  ].join(path.delimiter);

  return {
    ...process.env,
    PATH: securePath,
    // Remove potentially dangerous environment variables
    LD_PRELOAD: undefined,
    LD_LIBRARY_PATH: undefined,
  };
}

/**
 * Protocol Omega CLI class
 */
class ProtocolOmegaCLI {
  private readonly enginePath: string;
  private readonly dashboardPath: string;

  constructor() {
    this.enginePath = ENGINE_PATH;
    this.dashboardPath = DASHBOARD_PATH;
    this.validateSetup();
  }

  /**
   * Validate that required files exist
   */
  private validateSetup(): void {
    if (!existsSync(this.enginePath)) {
      throw new Error(`Engine not found at: ${this.enginePath}`);
    }

    if (!existsSync(this.dashboardPath)) {
      throw new Error(`Dashboard not found at: ${this.dashboardPath}`);
    }
  }

  /**
   * Execute Python engine command with security controls
   * SECURITY: Uses execFileSync to prevent command injection (SonarQube S4721)
   */
  private execEngine(args: string[]): unknown {
    try {
      // Validate all arguments before execution
      validateArgs(args);

      // Use execFileSync which does NOT use shell - prevents command injection
      // This is safer than execSync as it doesn't interpret shell metacharacters
      const result = execFileSync('python3', [this.enginePath, ...args], {
        encoding: 'utf-8',
        env: getSecureEnv(), // Use restricted environment (S4036)
        timeout: 10000, // 10 second timeout
        maxBuffer: 1024 * 1024, // 1MB max buffer
      });

      return JSON.parse(result);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Engine execution failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Assess risk level of a command
   */
  async assessRisk(command: string): Promise<{ risk_level: string }> {
    const result = this.execEngine(['assess', command]);
    return result as { risk_level: string };
  }

  /**
   * Create verification request
   */
  async createRequest(
    command: string,
    description: string,
    user: string
  ): Promise<{ request_id: string }> {
    const result = this.execEngine(['create', command, description, user]);
    return result as { request_id: string };
  }

  /**
   * Get pending requests
   */
  async getPendingRequests(): Promise<Record<string, unknown>> {
    const result = this.execEngine(['pending']);
    return result as Record<string, unknown>;
  }

  /**
   * Get request status
   */
  async getRequestStatus(
    requestId: string
  ): Promise<Record<string, unknown>> {
    const result = this.execEngine(['status', requestId]);
    return result as Record<string, unknown>;
  }

  /**
   * Approve request
   */
  async approveRequest(
    requestId: string,
    approver: string
  ): Promise<Record<string, unknown>> {
    const result = this.execEngine(['approve', requestId, approver]);
    return result as Record<string, unknown>;
  }

  /**
   * Reject request
   */
  async rejectRequest(
    requestId: string,
    rejector: string,
    reason: string
  ): Promise<Record<string, unknown>> {
    const result = this.execEngine(['reject', requestId, rejector, reason]);
    return result as Record<string, unknown>;
  }

  /**
   * Start approval dashboard server
   * SECURITY: Uses secure environment and proper PATH (SonarQube S4036)
   */
  async startDashboard(): Promise<void> {
    console.log('🚀 Starting Protocol Omega Dashboard...\n');

    // SECURITY (S4036): PATH is restricted to system directories in getSecureEnv()
    // Only trusted, read-only system paths are included to prevent PATH injection
    const spawnOptions: SpawnOptions = {
      stdio: 'inherit',
      env: getSecureEnv(), // Restricted PATH: /usr/bin, /bin, etc.
    };

    const dashboard = spawn('python3', [this.dashboardPath], spawnOptions);

    dashboard.on('close', (code) => {
      console.log(`\n📡 Dashboard stopped (exit code: ${code})`);
    });

    dashboard.on('error', (error) => {
      console.error(`\n❌ Dashboard error: ${error.message}`);
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping dashboard...');
      dashboard.kill('SIGTERM');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      dashboard.kill('SIGTERM');
      process.exit(0);
    });
  }

  /**
   * Print help message
   */
  printHelp(): void {
    console.log(`
Protocol Omega CLI - Zero-Dependency Command Verification

Usage:
  omega <command> [options]

Commands:
  assess <command>                     - Assess risk level of a command
  create <command> <desc> <user>       - Create verification request
  pending                              - List pending requests
  status <request-id>                  - Check request status
  approve <request-id> <approver>      - Approve a request
  reject <request-id> <rejector> <reason> - Reject a request
  dashboard                            - Start web dashboard
  help                                 - Show this help message

Examples:
  omega assess "DROP TABLE users"
  omega create "DELETE FROM logs" "Cleanup" "admin"
  omega pending
  omega approve abc123 "security-officer"
  omega dashboard

Security:
  - All inputs are validated and sanitized
  - Commands are executed with restricted permissions
  - Dangerous operations require human approval
`);
  }
}

/**
 * Handle assess command
 */
async function handleAssess(cli: ProtocolOmegaCLI, args: string[]): Promise<void> {
  const cmd = args[1];
  if (!cmd) {
    throw new Error('Missing command argument');
  }
  const result = await cli.assessRisk(cmd);
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Handle create command
 */
async function handleCreate(cli: ProtocolOmegaCLI, args: string[]): Promise<void> {
  const [, cmd, desc, user] = args;
  if (!cmd || !desc || !user) {
    throw new Error('Missing required arguments: <command> <desc> <user>');
  }
  const result = await cli.createRequest(cmd, desc, user);
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Handle status command
 */
async function handleStatus(cli: ProtocolOmegaCLI, args: string[]): Promise<void> {
  const requestId = args[1];
  if (!requestId) {
    throw new Error('Missing request ID argument');
  }
  const result = await cli.getRequestStatus(requestId);
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Handle approve command
 */
async function handleApprove(cli: ProtocolOmegaCLI, args: string[]): Promise<void> {
  const [, requestId, approver] = args;
  if (!requestId || !approver) {
    throw new Error('Missing required arguments: <request-id> <approver>');
  }
  const result = await cli.approveRequest(requestId, approver);
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Handle reject command
 */
async function handleReject(cli: ProtocolOmegaCLI, args: string[]): Promise<void> {
  const [, requestId, rejector, reason] = args;
  if (!requestId || !rejector || !reason) {
    throw new Error('Missing required arguments: <request-id> <rejector> <reason>');
  }
  const result = await cli.rejectRequest(requestId, rejector, reason);
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Main CLI entry point with top-level await
 * Reduced cognitive complexity by extracting command handlers
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: No command specified\n');
    const cli = new ProtocolOmegaCLI();
    cli.printHelp();
    process.exit(1);
  }

  const command = args[0];
  const cli = new ProtocolOmegaCLI();

  try {
    switch (command) {
      case 'assess':
        await handleAssess(cli, args);
        break;

      case 'create':
        await handleCreate(cli, args);
        break;

      case 'pending': {
        const result = await cli.getPendingRequests();
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'status':
        await handleStatus(cli, args);
        break;

      case 'approve':
        await handleApprove(cli, args);
        break;

      case 'reject':
        await handleReject(cli, args);
        break;

      case 'dashboard':
        await cli.startDashboard();
        break;

      case 'help':
      case '--help':
      case '-h':
        cli.printHelp();
        break;

      default:
        console.error(`Unknown command: ${command}\n`);
        cli.printHelp();
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unexpected error occurred');
    }
    process.exit(1);
  }
}

// Use top-level await pattern (SonarQube compliance)
await main();
