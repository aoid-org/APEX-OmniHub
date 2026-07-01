/**
 * alignmentGuides — Live magnetic-alignment overlay lines for DraggableWidget.
 *
 * Extracted from DraggableWidget so that module stays under the repo's
 * per-file line budget. DOM-manipulation only (module-level singleton guide
 * elements, reused across drags) — no React state, no position mutation.
 * Snapping itself is applied at drag-end via widgetLayout.ts's
 * resolveAlignment; this module only draws the live feedback lines.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { ALIGN_THRESHOLD_PX } from './widgetLayout';
import type { Rect } from './widgetLayout';

// Two singleton overlay lines (vertical = x-axis snap, horizontal = y-axis snap)
// lazily parented to the canvas and reused — never created/destroyed per move.
let guideX: HTMLDivElement | null = null;
let guideY: HTMLDivElement | null = null;

export function ensureGuides(canvas: HTMLElement): { gx: HTMLDivElement; gy: HTMLDivElement } {
  if (!guideX || guideX.parentElement !== canvas) {
    guideX = document.createElement('div');
    guideX.dataset.omniAlignGuide = 'x';
    guideX.style.cssText =
      'position:absolute;top:0;width:1px;pointer-events:none;background:rgba(249,115,22,0.45);z-index:998;display:none;';
    canvas.appendChild(guideX);
  }
  if (!guideY || guideY.parentElement !== canvas) {
    guideY = document.createElement('div');
    guideY.dataset.omniAlignGuide = 'y';
    guideY.style.cssText =
      'position:absolute;left:0;height:1px;pointer-events:none;background:rgba(249,115,22,0.45);z-index:998;display:none;';
    canvas.appendChild(guideY);
  }
  return { gx: guideX, gy: guideY };
}

export function hideGuides(): void {
  if (guideX) guideX.style.display = 'none';
  if (guideY) guideY.style.display = 'none';
}

/**
 * Live, read-only alignment feedback while dragging. Finds the nearest sibling
 * edge/center within ALIGN_THRESHOLD_PX per axis and positions the guide line(s)
 * there; hides the line for any axis with no match. No position mutation here —
 * snapping is applied only at drag-end via resolveAlignment.
 */
export function updateAlignmentGuides(canvas: HTMLElement, myRect: DOMRect, siblings: Rect[]): void {
  const { gx, gy } = ensureGuides(canvas);
  const cRect = canvas.getBoundingClientRect();

  const mCenterX = (myRect.left + myRect.right) / 2;
  const mCenterY = (myRect.top + myRect.bottom) / 2;

  let matchX: number | null = null;
  let bestX = ALIGN_THRESHOLD_PX;
  let matchY: number | null = null;
  let bestY = ALIGN_THRESHOLD_PX;

  for (const s of siblings) {
    const sCenterX = (s.left + s.right) / 2;
    const sCenterY = (s.top + s.bottom) / 2;
    for (const from of [myRect.left, myRect.right, mCenterX]) {
      for (const to of [s.left, s.right, sCenterX]) {
        const d = Math.abs(from - to);
        if (d <= bestX) { bestX = d; matchX = to; }
      }
    }
    for (const from of [myRect.top, myRect.bottom, mCenterY]) {
      for (const to of [s.top, s.bottom, sCenterY]) {
        const d = Math.abs(from - to);
        if (d <= bestY) { bestY = d; matchY = to; }
      }
    }
  }

  if (matchX !== null) {
    gx.style.left = `${matchX - cRect.left + canvas.scrollLeft}px`;
    gx.style.top = `${canvas.scrollTop}px`;
    gx.style.height = `${canvas.clientHeight}px`;
    gx.style.display = 'block';
  } else {
    gx.style.display = 'none';
  }

  if (matchY !== null) {
    gy.style.top = `${matchY - cRect.top + canvas.scrollTop}px`;
    gy.style.left = `${canvas.scrollLeft}px`;
    gy.style.width = `${canvas.clientWidth}px`;
    gy.style.display = 'block';
  } else {
    gy.style.display = 'none';
  }
}
