import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Root } from 'react-dom/client';

const renderMock = vi.fn();
const createRootMock = vi.fn((): Root => ({
  render: renderMock,
  unmount: vi.fn(),
}));

vi.mock('react-dom/client', () => ({
  default: { createRoot: createRootMock },
  createRoot: createRootMock,
}));

describe('bootstrapOmniHubProof', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('mounts the proof app into the provided root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const { bootstrapOmniHubProof } = await import('../../../apps/omnihub-proof/src/main');
    const root = document.createElement('div');

    createRootMock.mockClear();
    renderMock.mockClear();
    bootstrapOmniHubProof(root);

    expect(createRootMock).toHaveBeenCalledWith(root);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the root element is missing', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const { bootstrapOmniHubProof } = await import('../../../apps/omnihub-proof/src/main');

    expect(() => bootstrapOmniHubProof(null)).toThrow('OmniHub Proof root element not found');
  });
});
