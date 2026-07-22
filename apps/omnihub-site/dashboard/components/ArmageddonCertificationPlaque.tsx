import React, { useState } from 'react';
import { ShieldCheck, Award, Lock, ExternalLink, Download, FileText, CheckCircle2, Copy, Check } from 'lucide-react';

export interface ArmageddonCertificationPlaqueProps {
  readonly className?: string;
  readonly compact?: boolean;
}

export const ARMAGEDDON_CERT_DATA = {
  runId: 'e982d187-3363-4295-99c3-3cecc3c410f0',
  date: 'Wed, 22 Jul 2026 12:54:25 GMT',
  verdict: 'CERTIFIED',
  grade: 'A',
  score: 100,
  level: 7,
  mode: 'LIVE_FIRE',
  seed: 468941141,
  target: 'APEX-OmniHub Orchestrator API (staging)',
  targetUrl: 'https://apex-orchestrator-api-staging.onrender.com',
  pdfPath: '/certificates/ARMAGEDDONLevel7CERTIFIEDe982d187.pdf',
  jsonPath: '/certificates/certificatereport.json',
  attestation: {
    spec: 'armageddon-attestation/1.0',
    algorithm: 'ed25519',
    chainId: 'armageddon:37557e9ef2e85246',
    keyId: '37557e9ef2e85246',
    merkleRoot: '2bf66a8e88011499e86bacff0591abd9ed92cdcfbb65d2e0e7962f72b38cbba5',
    digest: '6748cefa6a3db1083a68e76be197478ad16ca6933fe80a8020e3952b295fffb9',
    signature: 'd54ZNh4uzWV0jfbtaxmMp3G7EZv+gy3qRSRFmA+gXilWA3EpCqpLieky340j/C6pXkg3l5fBO2qc0dULFXpXDQ==',
  },
  batteries: [
    { id: 10, name: 'Goal Hijack', code: 'B10_GOAL_HIJACK', tests: 5, blocked: 5, breaches: 0, durationMs: 2700 },
    { id: 13, name: 'Supply Chain', code: 'B13_SUPPLY_CHAIN', tests: 5, blocked: 5, breaches: 0, durationMs: 3402 },
  ],
};

export function ArmageddonCertificationPlaque({ className = '', compact = false }: ArmageddonCertificationPlaqueProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-slate-950/90 via-slate-900/95 to-emerald-950/40 p-4 text-slate-100 shadow-2xl backdrop-blur-md ${className}`}
      style={{
        boxShadow: '0 0 25px -5px rgba(16, 185, 129, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Decorative Gold & Emerald Glass Glow Header Background */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />

      {/* Header Banner Plaque */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-emerald-400/30 shadow-inner">
            <Award className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-wider text-amber-300 uppercase">
                ARMAGEDDON LEVEL {ARMAGEDDON_CERT_DATA.level} CERTIFIED
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Grade {ARMAGEDDON_CERT_DATA.grade} ({ARMAGEDDON_CERT_DATA.score}/100)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live-Fire Adversarial Security & Defense Verification • {ARMAGEDDON_CERT_DATA.date}
            </p>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={ARMAGEDDON_CERT_DATA.pdfPath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-300 transition-all hover:bg-amber-500/20 hover:shadow-lg hover:shadow-amber-500/10 active:scale-95"
            title="Download Official PDF Certificate"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            <span>PDF Plaque</span>
          </a>
          <a
            href={ARMAGEDDON_CERT_DATA.jsonPath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95"
            title="Download JSON Attestation Report"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
            <span>JSON Report</span>
          </a>
        </div>
      </div>

      {/* Target & Mode Summary Grid */}
      <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Target System</div>
          <div className="mt-0.5 truncate text-xs font-medium text-slate-200" title={ARMAGEDDON_CERT_DATA.target}>
            {ARMAGEDDON_CERT_DATA.target}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Execution Mode</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" /> {ARMAGEDDON_CERT_DATA.mode} (Seed: {ARMAGEDDON_CERT_DATA.seed})
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Run ID</div>
          <div className="mt-0.5 flex items-center justify-between text-xs font-mono text-slate-300">
            <span className="truncate">{ARMAGEDDON_CERT_DATA.runId}</span>
            <button
              onClick={() => copyToClipboard(ARMAGEDDON_CERT_DATA.runId, 'runId')}
              className="ml-1 text-slate-400 hover:text-white"
              title="Copy Run ID"
            >
              {copiedField === 'runId' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Test Batteries Passed */}
      <div className="mb-4">
        <div className="mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Verified Test Batteries (100% Breaches Blocked)
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ARMAGEDDON_CERT_DATA.batteries.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200">{b.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{b.code}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-emerald-300">{b.blocked}/{b.tests} Blocked</div>
                <div className="text-[10px] text-slate-400">{b.durationMs}ms</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cryptographic Attestation Seal */}
      {!compact && (
        <div className="rounded-lg border border-amber-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>Tamper-Evident Ed25519 Cryptographic Attestation</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Spec: {ARMAGEDDON_CERT_DATA.attestation.spec}</span>
          </div>
          <div className="space-y-1 text-[10px] font-mono text-slate-400">
            <div className="flex items-center justify-between">
              <span>Merkle Root:</span>
              <span className="text-slate-300 truncate max-w-[280px]" title={ARMAGEDDON_CERT_DATA.attestation.merkleRoot}>
                {ARMAGEDDON_CERT_DATA.attestation.merkleRoot}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Signature Digest:</span>
              <span className="text-slate-300 truncate max-w-[280px]" title={ARMAGEDDON_CERT_DATA.attestation.digest}>
                {ARMAGEDDON_CERT_DATA.attestation.digest}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
