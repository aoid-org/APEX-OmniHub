// Root-package stub; tests mock this via vi.mock('@/lib/motionPresets')
// The real file lives at apps/omnihub-site/src/lib/motionPresets.ts
export const SPRING_DAMPED = { type: 'spring' as const, damping: 20, stiffness: 300 };
export const SPRING_NATURAL = { type: 'spring' as const, damping: 26, stiffness: 170 };
export const SPRING_SNAPPY = { type: 'spring' as const, damping: 30, stiffness: 300 };
export const GPU_STYLE = { willChange: 'transform' };
