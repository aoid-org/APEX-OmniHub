import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FilesModule from '../../apps/omnihub-site/dashboard/components/modules/FilesModule';
import LinksModule from '../../apps/omnihub-site/dashboard/components/modules/LinksModule';

vi.mock('../../apps/omnihub-site/src/hooks/useOmniModuleState', () => ({
  useOmniModuleState: vi.fn(() => ({
    actions: [],
    stats: [],
    items: [],
  })),
}));

describe('Module Interactions', () => {
  it('Files module has real action beyond close', () => {
    render(<FilesModule onClose={() => {}} />);
    expect(screen.getAllByText(/browse/i, { exact: false })[0]).toBeInTheDocument();
  });

  it('Links module has real action beyond close', () => {
    render(<LinksModule onClose={() => {}} />);
    expect(screen.getByText(/save/i, { exact: false })).toBeInTheDocument();
  });
});
