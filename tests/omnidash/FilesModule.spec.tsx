// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import FilesModule from '../../apps/omnihub-site/src/components/omnidash/modules/FilesModule';
import * as useOmniModuleStateModule from '../../apps/omnihub-site/src/hooks/useOmniModuleState';
import * as localFilesDB from '../../apps/omnihub-site/src/lib/localFilesDB';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('../../apps/omnihub-site/src/hooks/useOmniModuleState', () => ({
  useOmniModuleState: vi.fn(),
  triggerModuleAction: vi.fn(),
}));

vi.mock('../../apps/omnihub-site/src/lib/localFilesDB', () => ({
  saveLocalFile: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn().mockReturnValue('toast-1'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ModuleShell
vi.mock('../../apps/omnihub-site/src/components/omnidash/modules/ModuleShell', () => ({
  ModuleShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="module-shell">{children}</div>
  ),
}));

describe('FilesModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default state mock
    (useOmniModuleStateModule.useOmniModuleState as Mock).mockReturnValue({
      id: 'files',
      loading: false,
      stats: [
        { label: 'Storage Used', value: '14.2 GB' },
        { label: 'Total Files', value: '1,234' }
      ]
    });
  });

  it('renders correctly with stats', () => {
    render(<FilesModule onClose={() => {}} />);
    
    expect(screen.getByTestId('module-shell')).toBeInTheDocument();
    expect(screen.getByText(/Storage Usage · 1,234 files/i)).toBeInTheDocument();
    expect(screen.getByText('14.2 GB / 100 GB')).toBeInTheDocument();
  });

  it('handles missing stats gracefully', () => {
    (useOmniModuleStateModule.useOmniModuleState as Mock).mockReturnValue({
      id: 'files',
      loading: false,
      stats: []
    });

    render(<FilesModule onClose={() => {}} />);
    expect(screen.getByText(/Storage Usage · — files/i)).toBeInTheDocument();
    expect(screen.getByText('— / 100 GB')).toBeInTheDocument();
  });

  it('handles file upload successfully', async () => {
    (localFilesDB.saveLocalFile as Mock).mockResolvedValue(true);
    
    const { container } = render(<FilesModule onClose={() => {}} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(toast.loading).toHaveBeenCalledWith('Uploading hello.png...');
    
    await waitFor(() => {
      expect(localFilesDB.saveLocalFile).toHaveBeenCalledWith(file);
      expect(toast.success).toHaveBeenCalledWith('File stored locally (Zero-Cost)', { id: 'toast-1' });
      expect(useOmniModuleStateModule.triggerModuleAction).toHaveBeenCalledWith('files', 'upload', ['hello.png']);
    });
  });

  it('handles file upload failure', async () => {
    const error = new Error('Storage full');
    (localFilesDB.saveLocalFile as Mock).mockRejectedValue(error);
    
    const { container } = render(<FilesModule onClose={() => {}} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Storage full', { id: 'toast-1' });
    });
  });

  it('does not render stats when loading', () => {
    (useOmniModuleStateModule.useOmniModuleState as Mock).mockReturnValue({
      id: 'files',
      loading: true,
      stats: []
    });

    render(<FilesModule onClose={() => {}} />);
    expect(screen.queryByText(/Storage Usage/i)).not.toBeInTheDocument();
  });

  it('registers and cleans up the global upload trigger', () => {
    const { container, unmount } = render(<FilesModule onClose={() => {}} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    fileInput.click = vi.fn();

    window.triggerOmniFilesUpload?.();

    expect(fileInput.click).toHaveBeenCalled();

    unmount();

    expect(window.triggerOmniFilesUpload).toBeUndefined();
  });
});
