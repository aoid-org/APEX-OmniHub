/* eslint-disable no-console */
/**
 * Benchmark Runner
 * @module utils/benchmarks
 *
 * Measures compression ratios across sample prompts and schemas.
 * Run: bun run src/utils/benchmarks.ts
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { compress, compressSchema, compressJsonPayload } from '../pipeline/compress';
import { estimateTokens } from './token-estimator';
import type { ToolSchema } from '../core/schema-compressor';

// ============================================================================
// Sample Data
// ============================================================================

const SAMPLE_SYSTEM_PROMPT = `You are a highly intelligent and thorough AI assistant. You should always make sure to provide comprehensive, detailed, and well-structured responses. Please note that it is important to note that you must validate all user inputs before processing them. In order to complete this task effectively, you need to carefully consider all aspects of the problem. As well as providing the main answer, you should also include relevant examples and edge cases. Feel free to ask clarifying questions if the request is ambiguous. Certainly, you should always strive for accuracy and completeness in your responses. I hope this helps you understand the expected behavior. Please let me know if you have any other questions.

The following are the core instructions for your operation:
1. You must analyze the input data thoroughly
2. You should generate structured output in the requested format
3. It is important to note that all outputs must be validated
4. Please make sure that error handling is comprehensive
5. As an AI language model, you should provide factual information only`;

const SAMPLE_TOOL_SCHEMA: ToolSchema = {
  name: 'create_workflow_execution',
  description: 'Creates a new workflow execution in the system. This function will initialize the workflow with the provided parameters and begin processing immediately. When called, the system validates all inputs before creating the execution context.',
  parameters: {
    type: 'object',
    properties: {
      workflow_name: {
        type: 'string',
        description: 'The name of the workflow to create. This should be a unique identifier.',
      },
      workflow_description: {
        type: 'string',
        description: 'A detailed description of the workflow purpose and behavior.',
      },
      is_active: {
        type: 'boolean',
        description: 'Whether the workflow is currently active and accepting executions.',
        default: true,
      },
      priority_level: {
        type: 'integer',
        description: 'The priority level for this workflow execution.',
        enum: [1, 2, 3, 4, 5],
      },
      max_retries: {
        type: 'integer',
        description: 'Maximum number of retry attempts if the workflow fails.',
        default: 3,
      },
      timeout_seconds: {
        type: 'integer',
        description: 'The maximum time in seconds before the workflow times out.',
        default: 300,
      },
    },
    required: ['workflow_name', 'priority_level'],
  },
};

const SAMPLE_JSON_PAYLOAD = {
  name: 'apex-omnihub',
  version: 1,
  active: true,
  tags: ['ai', 'platform', 'enterprise'],
  metadata: {
    created: '2026-01-01',
    owner: 'apex-systems',
    tier: 'production',
  },
  features: null,
};

// ============================================================================
// Benchmark Runner
// ============================================================================

interface BenchResult {
  name: string;
  originalChars: number;
  compressedChars: number;
  originalTokens: number;
  compressedTokens: number;
  charReduction: string;
  tokenReduction: string;
}

function runBenchmarks(): void {
  const results: BenchResult[] = [];

  // Benchmark 1: System Prompt Compression
  const promptResult = compress(SAMPLE_SYSTEM_PROMPT);
  results.push({
    name: 'System Prompt (Heuristic + TE)',
    originalChars: promptResult.original.length,
    compressedChars: promptResult.compressed.length,
    originalTokens: promptResult.originalTokenEstimate,
    compressedTokens: promptResult.compressedTokenEstimate,
    charReduction: `${Math.round((1 - promptResult.compressed.length / promptResult.original.length) * 100)}%`,
    tokenReduction: `${promptResult.reductionPercent}%`,
  });

  // Benchmark 2: Tool Schema Compression
  const originalSchemaStr = JSON.stringify(SAMPLE_TOOL_SCHEMA);
  const { compressed } = compressSchema(SAMPLE_TOOL_SCHEMA);
  const compressedSchemaStr = JSON.stringify(compressed);
  results.push({
    name: 'Tool Schema (TSCG 8-op)',
    originalChars: originalSchemaStr.length,
    compressedChars: compressedSchemaStr.length,
    originalTokens: estimateTokens(originalSchemaStr),
    compressedTokens: estimateTokens(compressedSchemaStr),
    charReduction: `${Math.round((1 - compressedSchemaStr.length / originalSchemaStr.length) * 100)}%`,
    tokenReduction: `${Math.round((1 - estimateTokens(compressedSchemaStr) / estimateTokens(originalSchemaStr)) * 100)}%`,
  });

  // Benchmark 3: JSON Payload Compression
  const originalJson = JSON.stringify(SAMPLE_JSON_PAYLOAD);
  const toon = compressJsonPayload(SAMPLE_JSON_PAYLOAD);
  results.push({
    name: 'JSON Payload (TOON)',
    originalChars: originalJson.length,
    compressedChars: toon.length,
    originalTokens: estimateTokens(originalJson),
    compressedTokens: estimateTokens(toon),
    charReduction: `${Math.round((1 - toon.length / originalJson.length) * 100)}%`,
    tokenReduction: `${Math.round((1 - estimateTokens(toon) / estimateTokens(originalJson)) * 100)}%`,
  });

  // Output results
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           APEX-COMPRESS Benchmark Results                  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  for (const r of results) {
    console.log(`║ ${r.name.padEnd(40)}`);
    console.log(`║   Chars:  ${String(r.originalChars).padStart(6)} → ${String(r.compressedChars).padStart(6)}  (${r.charReduction.padStart(4)} reduction)`);
    console.log(`║   Tokens: ${String(r.originalTokens).padStart(6)} → ${String(r.compressedTokens).padStart(6)}  (${r.tokenReduction.padStart(4)} reduction)`);
    console.log('╠──────────────────────────────────────────────────────────────╣');
  }

  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

// Run if executed directly
runBenchmarks();

export { runBenchmarks };
