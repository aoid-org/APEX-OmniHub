import { describe, it, expect, vi } from 'vitest';

// Mock react-dom/client
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({ render: mockRender }));

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));

// Mock the imported components and styles
vi.mock('../../apps/omnihub-site/src/pages/OmniBoard', () => ({
  OmniBoardPage: () => <div data-testid="omniboard-page" />,
}));
vi.mock('../../apps/omnihub-site/src/styles/theme.css', () => ({}));
vi.mock('../../apps/omnihub-site/src/styles/components.css', () => ({}));

describe('omniboard entry point', () => {
  it('should render OmniBoardPage into the root element', async () => {
    // Setup a dummy root element
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    // Dynamic import to trigger the execution
    await import('../../apps/omnihub-site/src/omniboard');

    expect(mockCreateRoot).toHaveBeenCalledWith(root);
    expect(mockRender).toHaveBeenCalled();
  });
});
