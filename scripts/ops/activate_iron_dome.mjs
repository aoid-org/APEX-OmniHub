#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const REPORT_DIR = path.resolve('reports/ops');
const REPORT_FILE = path.join(REPORT_DIR, 'iron_dome_activation.json');

const REQUIRED_GUARDS = [
  'guardian',
  'zero_trust',
  'telemetry',
  'request_signing',
  'dr_controls',
];

const STATUS = {
  READY: 'ready',
  DEGRADED: 'degraded',
  BLOCKED: 'blocked',
};

function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

function normalizeFlag(value) {
  if (!value) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function readGuardStatus(guardName) {
  const envName = `IRON_DOME_${guardName.toUpperCase()}_ENABLED`;
  return {
    guard: guardName,
    enabled: normalizeFlag(process.env[envName]),
    source: envName,
  };
}

function collectGuardStatuses() {
  return REQUIRED_GUARDS.map(readGuardStatus);
}

function countEnabled(guards) {
  return guards.reduce((count, guard) => (guard.enabled ? count + 1 : count), 0);
}

function determineActivationStatus(guards) {
  const enabledCount = countEnabled(guards);
  const totalGuards = guards.length;

  if (enabledCount === totalGuards) {
    return STATUS.READY;
  }

  if (enabledCount === 0) {
    return STATUS.BLOCKED;
  }

  return STATUS.DEGRADED;
}

function buildSummaryMessage(activationStatus, enabledCount, totalGuards) {
  if (activationStatus === STATUS.READY) {
    return `Iron Dome fully activated (${enabledCount}/${totalGuards} guards enabled).`;
  }

  if (activationStatus === STATUS.BLOCKED) {
    return 'Iron Dome activation blocked: no required guards are enabled.';
  }

  return `Iron Dome partially activated (${enabledCount}/${totalGuards} guards enabled).`;
}

function collectMissingGuards(guards) {
  return guards.filter((guard) => !guard.enabled).map((guard) => guard.guard);
}

function buildReport() {
  const guards = collectGuardStatuses();
  const enabledCount = countEnabled(guards);
  const totalGuards = guards.length;
  const activationStatus = determineActivationStatus(guards);
  const missingGuards = collectMissingGuards(guards);
  const message = buildSummaryMessage(activationStatus, enabledCount, totalGuards);

  return {
    generatedAt: new Date().toISOString(),
    activationStatus,
    enabledCount,
    totalGuards,
    message,
    missingGuards,
    guards,
  };
}

function printHumanSummary(report) {
  console.log('🛡️  Iron Dome Activation Report');
  console.log(`Status: ${report.activationStatus}`);
  console.log(report.message);

  if (report.missingGuards.length > 0) {
    console.log(`Missing guards: ${report.missingGuards.join(', ')}`);
  }
}

function writeReport(report) {
  ensureReportDir();
  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
}

function exitCodeForStatus(status) {
  if (status === STATUS.READY) {
    return 0;
  }

  if (status === STATUS.DEGRADED) {
    return 1;
  }

  return 2;
}

function main() {
  const report = buildReport();
  writeReport(report);
  printHumanSummary(report);
  process.exitCode = exitCodeForStatus(report.activationStatus);
}

main();
