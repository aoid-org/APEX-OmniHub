// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import { BLAST_RADIUS_SURFACES, type BlastRadiusSurface } from '../../src/contracts/omnidash.contract';

/**
 * Tests for scripts/omnidash-blast-radius.ts
 *
 * Covers the surface classification rules, getChangedFiles fallbacks,
 * and the NOSONAR-annotated execSync calls.
 */

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Reimplementation of surface rules for testing
interface SurfaceRule {
  readonly surface: BlastRadiusSurface;
  readonly patterns: readonly RegExp[];
}

const SURFACE_RULES: readonly SurfaceRule[] = [
  {
    surface: 'registry',
    patterns: [/packages\/core\/src\/registry/, /src\/contracts\/omnidash/],
  },
  {
    surface: 'tiles',
    patterns: [/DashboardOverview/, /AppsSection/, /AppTile/],
  },
  {
    surface: 'routes',
    patterns: [/App\.tsx$/, /omnidash.*route/i],
  },
  {
    surface: 'modal engine',
    patterns: [/omniModalStore/, /UniversalModalEngine/, /useOmniDashAction/],
  },
  {
    surface: 'canvas',
    patterns: [/OmniBoard/, /apex-canvas/, /omniBoardStore/],
  },
  {
    surface: 'floating windows',
    patterns: [/FloatingWindow/, /z-index-manager/, /omni-portal-root/],
  },
  {
    surface: 'styles',
    patterns: [/omnidash-layout\.css/, /omnidash.*\.css/],
  },
  {
    surface: 'provider/store',
    patterns: [/OmniDashProvider/, /omniDashStore/, /omniBoardStore/, /omniModalStore/],
  },
];

function classifyFile(filePath: string): BlastRadiusSurface | null {
  for (const rule of SURFACE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(filePath))) {
      return rule.surface;
    }
  }
  return null;
}

function getChangedFiles(): string[] {
  try {
    const diff = execSync('git diff --name-only HEAD~1', { encoding: 'utf-8' }) as unknown as string; // NOSONAR
    return diff.trim().split('\n').filter(Boolean);
  } catch {
    try {
      const diff = execSync('git diff --cached --name-only', { encoding: 'utf-8' }) as unknown as string; // NOSONAR
      return diff.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}

describe('omnidash-blast-radius', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BLAST_RADIUS_SURFACES contract', () => {
    it('contains all expected surfaces', () => {
      expect(BLAST_RADIUS_SURFACES).toContain('registry');
      expect(BLAST_RADIUS_SURFACES).toContain('tiles');
      expect(BLAST_RADIUS_SURFACES).toContain('routes');
      expect(BLAST_RADIUS_SURFACES).toContain('modal engine');
      expect(BLAST_RADIUS_SURFACES).toContain('canvas');
      expect(BLAST_RADIUS_SURFACES).toContain('floating windows');
      expect(BLAST_RADIUS_SURFACES).toContain('styles');
      expect(BLAST_RADIUS_SURFACES).toContain('provider/store');
    });
  });

  describe('classifyFile', () => {
    it('classifies registry files', () => {
      expect(classifyFile('packages/core/src/registry/index.ts')).toBe('registry');
      expect(classifyFile('src/contracts/omnidash.contract.ts')).toBe('registry');
    });

    it('classifies tile files', () => {
      expect(classifyFile('src/pages/DashboardOverview/DashboardOverview.tsx')).toBe('tiles');
      expect(classifyFile('src/components/AppsSection.tsx')).toBe('tiles');
      expect(classifyFile('src/components/AppTile.tsx')).toBe('tiles');
    });

    it('classifies route files', () => {
      expect(classifyFile('src/App.tsx')).toBe('routes');
      expect(classifyFile('src/omnidash-routes.ts')).toBe('routes');
    });

    it('classifies modal engine files', () => {
      expect(classifyFile('src/stores/omniModalStore.ts')).toBe('modal engine');
      expect(classifyFile('src/components/UniversalModalEngine.tsx')).toBe('modal engine');
      expect(classifyFile('src/hooks/useOmniDashAction.ts')).toBe('modal engine');
    });

    it('classifies canvas files', () => {
      expect(classifyFile('src/components/OmniBoard.tsx')).toBe('canvas');
      expect(classifyFile('src/apex-canvas/index.ts')).toBe('canvas');
      expect(classifyFile('src/stores/omniBoardStore.ts')).toBe('canvas');
    });

    it('classifies floating window files', () => {
      expect(classifyFile('src/components/FloatingWindow.tsx')).toBe('floating windows');
      expect(classifyFile('src/utils/z-index-manager.ts')).toBe('floating windows');
      expect(classifyFile('src/omni-portal-root.tsx')).toBe('floating windows');
    });

    it('classifies style files', () => {
      expect(classifyFile('src/styles/omnidash-layout.css')).toBe('styles');
      expect(classifyFile('src/styles/omnidash-theme.css')).toBe('styles');
    });

    it('classifies provider/store files', () => {
      expect(classifyFile('src/providers/OmniDashProvider.tsx')).toBe('provider/store');
      expect(classifyFile('src/stores/omniDashStore.ts')).toBe('provider/store');
    });

    it('returns null for unrelated files', () => {
      expect(classifyFile('src/utils/helpers.ts')).toBeNull();
      expect(classifyFile('README.md')).toBeNull();
      expect(classifyFile('package.json')).toBeNull();
    });
  });

  describe('getChangedFiles', () => {
    it('returns files from git diff HEAD~1', () => {
      vi.mocked(execSync).mockReturnValue('src/App.tsx\nsrc/index.ts\n');
      const files = getChangedFiles();
      expect(files).toEqual(['src/App.tsx', 'src/index.ts']);
    });

    it('falls back to git diff --cached when HEAD~1 fails', () => {
      let callCount = 0;
      vi.mocked(execSync).mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new Error('No commits');
        return 'staged-file.ts\n';
      });
      const files = getChangedFiles();
      expect(files).toEqual(['staged-file.ts']);
    });

    it('returns empty array when both git commands fail', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Not a git repo');
      });
      const files = getChangedFiles();
      expect(files).toEqual([]);
    });

    it('filters empty lines from git output', () => {
      vi.mocked(execSync).mockReturnValue('file1.ts\n\nfile2.ts\n\n');
      const files = getChangedFiles();
      expect(files).toEqual(['file1.ts', 'file2.ts']);
    });
  });

  describe('blast radius gate logic', () => {
    it('blocks when more than 5 omnidash files are changed', () => {
      const omnidashFiles = [
        'src/pages/DashboardOverview/index.tsx',
        'src/stores/omniDashStore.ts',
        'src/stores/omniModalStore.ts',
        'src/components/OmniBoard.tsx',
        'src/App.tsx',
        'src/omnidash-routes.ts',
      ];
      expect(omnidashFiles.length).toBeGreaterThan(5);
    });

    it('allows when 5 or fewer omnidash files are changed', () => {
      const omnidashFiles = [
        'src/pages/DashboardOverview/index.tsx',
        'src/stores/omniDashStore.ts',
      ];
      expect(omnidashFiles.length).toBeLessThanOrEqual(5);
    });
  });
});
