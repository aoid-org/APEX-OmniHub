import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUploadToken, uploadWithToken, listUserFiles, createDownloadUrl, deleteFile } from '@/lib/files';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('files utility', () => {
  const mockStorageFrom = {
    uploadToSignedUrl: vi.fn(),
    list: vi.fn(),
    createSignedUrl: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.storage.from).mockReturnValue(mockStorageFrom as unknown);
  });

  describe('getUploadToken', () => {
    it('should throw if not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as unknown);
      await expect(getUploadToken('test.txt', 'text/plain', 100)).rejects.toThrow('Not authenticated');
    });

    it('should throw if edge function returns error', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: {} }, error: null } as unknown);
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: { message: 'Upload failed' } } as unknown);
      
      await expect(getUploadToken('test.txt', 'text/plain', 100)).rejects.toThrow('Upload failed');
    });

    it('should return token data on success', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: {} }, error: null } as unknown);
      const mockResult = { path: '123/test.txt', token: 'token123', signedUrl: 'url' };
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: mockResult, error: null } as unknown);

      const result = await getUploadToken('test.txt', 'text/plain', 100);
      expect(result).toEqual(mockResult);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('storage-upload-url', {
        body: { filename: 'test.txt', mime: 'text/plain', size: 100 }
      });
    });
  });

  describe('uploadWithToken', () => {
    it('should call uploadToSignedUrl', async () => {
      mockStorageFrom.uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
      const file = new File([''], 'test.txt');
      await uploadWithToken('path', 'token', file);
      
      expect(supabase.storage.from).toHaveBeenCalledWith('user-files');
      expect(mockStorageFrom.uploadToSignedUrl).toHaveBeenCalledWith('path', 'token', file);
    });
  });

  describe('listUserFiles', () => {
    it('should list files ordered by created_at', async () => {
      mockStorageFrom.list.mockResolvedValue({ data: [], error: null });
      await listUserFiles('user123');
      
      expect(mockStorageFrom.list).toHaveBeenCalledWith('user123', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    });
  });

  describe('createDownloadUrl', () => {
    it('should create signed url with default expiration', async () => {
      mockStorageFrom.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'url' }, error: null });
      await createDownloadUrl('path/to/file');
      
      expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledWith('path/to/file', 60);
    });

    it('should create signed url with custom expiration', async () => {
      mockStorageFrom.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'url' }, error: null });
      await createDownloadUrl('path/to/file', 3600);
      
      expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledWith('path/to/file', 3600);
    });
  });

  describe('deleteFile', () => {
    it('should remove file', async () => {
      mockStorageFrom.remove.mockResolvedValue({ data: [], error: null });
      await deleteFile('path/to/file');
      
      expect(mockStorageFrom.remove).toHaveBeenCalledWith(['path/to/file']);
    });
  });
});
