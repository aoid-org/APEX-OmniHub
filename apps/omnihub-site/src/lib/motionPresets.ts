/**
 * APEX OmniDash — Motion Presets (Layer 6: Physics Tokens)
 * @version 6.1.0
 * @module apps/omnihub-site/src/lib/motionPresets
 *
 * CANONICAL SINGLE SOURCE OF TRUTH for all spring physics in OmniDash.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Each preset returns identical config on every call
 * - Modularity: Pure constants — zero side effects, zero React dependencies
 * - Regression-Free: Inline CSS transitions inside widgets are STRICTLY PROHIBITED
 * - Overload-Free: Three presets only — snappy, natural, damped. No bloat.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ============================================================================
// Spring Physics Tokens
// ============================================================================

/**
 * SNAPPY — Widget snap-to-position, title bar interactions, button presses.
 * High stiffness + high damping = fast settle, minimal overshoot.
 */
export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
} as const;

/**
 * NATURAL — General entrance animations, widget mount/unmount transitions.
 * Balanced physics for organic, Apple-grade feel.
 */
export const SPRING_NATURAL = {
  type: 'spring' as const,
  stiffness: 170,
  damping: 26,
  mass: 1,
} as const;

/**
 * DAMPED — Heavy panel slides, PiP window open/close, canvas resize.
 * Low stiffness + moderate damping = deliberate, weighted motion.
 */
export const SPRING_DAMPED = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 20,
  mass: 1.2,
} as const;

// ============================================================================
// GPU Promotion Token
// ============================================================================

/**
 * GPU_STYLE — Inline style object for GPU-composited elements.
 * Applied to WidgetShell and FloatingWindow for hardware-accelerated rendering.
 *
 * RULE: Only `transform` and `opacity` should be animated on GPU-promoted
 * elements. Animating layout properties (width, height, top, left) on these
 * elements defeats the purpose and triggers reflows.
 *
 * Applied judiciously — excessive GPU layers cause memory pressure
 * ("layer explosion"). Only apply to actively interactive elements.
 */
export const GPU_STYLE: Readonly<React.CSSProperties> = {
  willChange: 'transform, opacity',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
} as const;

// ============================================================================
// Duration Constants (for non-spring CSS-level animations)
// ============================================================================

/** Hover state transitions — fast feedback. */
export const DURATION_HOVER_MS = 150;

/** Content reveal transitions — smooth entrance. */
export const DURATION_REVEAL_MS = 220;

/** Modal/PiP open-close transitions — deliberate weight. */
export const DURATION_MODAL_MS = 300;

// ============================================================================
// Type-safe re-export for consumers
// ============================================================================

export type SpringPreset = typeof SPRING_SNAPPY | typeof SPRING_NATURAL | typeof SPRING_DAMPED;

// Prevent React import error — GPU_STYLE uses React.CSSProperties
import type React from 'react';
