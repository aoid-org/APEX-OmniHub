/**
 * OmniVision Global State — "The Third Eye"
 * @version 1.0.0
 * @module src/stores/omniVisionStore
 *
 * Zustand store providing reactive access to vision pipeline state.
 * Components subscribe to vision processing events (frame captures,
 * OCR results, PII redaction status) without coupling to internals.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: submitFrame() with same hash produces identical state
 * - Memory Safety: structuredClone on exports to prevent mutation leaks
 * - Modularity: Pure Zustand store — zero React dependencies
 * - Privacy-First: PII redaction status always tracked, never bypassed
 * - Determinism: Same image → same vision_context_id
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export type VisionStatus =
  | 'idle'
  | 'capturing'
  | 'processing'
  | 'redacting'
  | 'complete'
  | 'error';

export type RedactionLevel = 'none' | 'standard' | 'strict';

export const VisionFrameSchema = z.object({
  /** Deterministic hash of the frame content */
  frameId: z.string().min(1),
  /** Timestamp of capture */
  capturedAt: z.string().datetime(),
  /** MIME type of the source media */
  mimeType: z.string().min(1),
  /** Frame dimensions */
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Estimated size in bytes */
  sizeBytes: z.number().int().nonnegative(),
  /** Whether PII redaction has been applied */
  redacted: z.boolean(),
  /** Redaction level applied */
  redactionLevel: z.enum(['none', 'standard', 'strict']),
  /** Extracted text (OCR) if available */
  ocrText: z.string().optional(),
  /** Vision context ID for idempotent lookups */
  visionContextId: z.string().min(1),
});

export type VisionFrame = z.infer<typeof VisionFrameSchema>;

export const VisionPipelineResultSchema = z.object({
  /** Whether processing completed successfully */
  success: z.boolean(),
  /** Total processing time in milliseconds */
  processingMs: z.number().int().nonnegative(),
  /** Detected objects / labels */
  labels: z.array(z.string()),
  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),
  /** PII regions detected (for redaction overlay) */
  piiRegions: z.array(
    z.object({
      x: z.number().nonnegative(),
      y: z.number().nonnegative(),
      width: z.number().positive(),
      height: z.number().positive(),
      type: z.enum(['face', 'text', 'plate', 'document']),
    }),
  ),
});

export type VisionPipelineResult = z.infer<typeof VisionPipelineResultSchema>;

// ============================================================================
// Store Interface
// ============================================================================

interface OmniVisionState {
  /** Current operational status */
  readonly status: VisionStatus;
  /** Active frame being processed */
  readonly activeFrame: VisionFrame | null;
  /** Most recent pipeline result */
  readonly lastResult: VisionPipelineResult | null;
  /** Processing history (last N frames) */
  readonly history: readonly VisionFrame[];
  /** Maximum history entries to retain */
  readonly maxHistory: number;
  /** Current redaction level preference */
  readonly redactionLevel: RedactionLevel;
  /** Total frames processed in this session */
  readonly framesProcessed: number;
  /** Last error message */
  readonly lastError: string | null;

  /** Submit a frame for processing */
  submitFrame: (frame: VisionFrame) => void;
  /** Record pipeline result */
  recordResult: (result: VisionPipelineResult) => void;
  /** Update redaction level preference */
  setRedactionLevel: (level: RedactionLevel) => void;
  /** Clear active frame and reset to idle */
  clearActiveFrame: () => void;
  /** Clear all history */
  clearHistory: () => void;
  /** Set error state */
  setError: (message: string) => void;
}

// ============================================================================
// Store
// ============================================================================

const MAX_HISTORY = 50;

export const useOmniVision = create<OmniVisionState>((set, get) => ({
  status: 'idle',
  activeFrame: null,
  lastResult: null,
  history: [],
  maxHistory: MAX_HISTORY,
  redactionLevel: 'standard',
  framesProcessed: 0,
  lastError: null,

  submitFrame: (frame) => {
    // Validate at boundary — reject malformed frames
    const parsed = VisionFrameSchema.safeParse(frame);
    if (!parsed.success) {
      console.error('[OmniVision] Invalid frame rejected:', parsed.error.issues);
      set({ status: 'error', lastError: 'Invalid frame data' });
      return;
    }

    // Idempotency check: same frameId → no-op
    const current = get().activeFrame;
    if (current?.frameId === frame.frameId) return;

    set({
      status: 'processing',
      activeFrame: structuredClone(frame),
      lastError: null,
    });
  },

  recordResult: (result) => {
    const parsed = VisionPipelineResultSchema.safeParse(result);
    if (!parsed.success) {
      console.error('[OmniVision] Invalid result rejected:', parsed.error.issues);
      set({ status: 'error', lastError: 'Invalid pipeline result' });
      return;
    }

    const state = get();
    const activeFrame = state.activeFrame;
    if (!activeFrame) return;

    // Add frame to history, enforce max capacity
    const updatedHistory = [...state.history, activeFrame].slice(
      -state.maxHistory,
    );

    set({
      status: 'complete',
      lastResult: structuredClone(result),
      history: updatedHistory,
      framesProcessed: state.framesProcessed + 1,
      lastError: null,
    });
  },

  setRedactionLevel: (level) => {
    set({ redactionLevel: level });
  },

  clearActiveFrame: () => {
    set({ status: 'idle', activeFrame: null, lastResult: null });
  },

  clearHistory: () => {
    set({ history: [], framesProcessed: 0 });
  },

  setError: (message) => {
    set({ status: 'error', lastError: message });
  },
}));
