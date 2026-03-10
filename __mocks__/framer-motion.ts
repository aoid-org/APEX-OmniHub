/**
 * __mocks__/framer-motion.ts
 *
 * Global Vitest manual mock for framer-motion.
 * Activated by `vi.mock('framer-motion')` in tests/setup.ts.
 *
 * Purpose: prevent Framer Motion animation props (whileHover, animate, etc.)
 * from reaching jsdom DOM elements, which causes "React does not recognize the
 * `X` prop on a DOM element" warnings that pollute test stderr.
 *
 * Implementation: each motion.* tag becomes a forwardRef wrapper that strips
 * all Framer-specific props before passing the rest to React.createElement.
 */

import React from 'react';
import { vi } from 'vitest';

const FRAMER_PROPS = new Set([
  'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView',
  'animate', 'initial', 'exit', 'variants', 'transition', 'layout',
  'layoutId', 'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
  'dragTransition', 'onDragStart', 'onDragEnd', 'onAnimationStart',
  'onAnimationComplete', 'onHoverStart', 'onHoverEnd',
]);

function makeMotionComponent(tag: string) {
  return React.forwardRef(function MotionStub(
    { children, ...props }: Record<string, unknown>,
    ref: React.Ref<unknown>,
  ) {
    const filtered = Object.fromEntries(
      Object.entries(props).filter(([k]) => !FRAMER_PROPS.has(k)),
    );
    return React.createElement(tag, { ...filtered, ref }, children as React.ReactNode);
  });
}

const motionProxy = new Proxy({} as Record<string, ReturnType<typeof makeMotionComponent>>, {
  get(_target, prop: string) {
    return makeMotionComponent(prop);
  },
});

function AnimatePresence({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement;
}

export const motion = motionProxy;
export { AnimatePresence };
export const useAnimation = () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() });
export const useMotionValue = (v: unknown) => ({ get: () => v, set: vi.fn() });
export const useSpring = (v: unknown) => ({ get: () => v, set: vi.fn() });
export const useTransform = vi.fn(() => ({ get: vi.fn() }));
