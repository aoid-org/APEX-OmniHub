/**
 * OmniMediaGallery — user-facing error honesty.
 *
 * Proves the OmniMedia surface NEVER renders a raw SDK / Edge Function error to the user,
 * even when the catalog client fails. The visible copy is the allowed honest message and a
 * Retry control re-attempts the load. (APEX Bible: raw errors are NO-GO.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const fakeState = {
  catalogVersion: 0,
  bumpCatalog: vi.fn(),
  loadMedia: vi.fn(),
  setDocked: vi.fn(),
};

vi.mock('@/stores/omniMediaStore', () => ({
  useOmniMedia: (selector: (s: typeof fakeState) => unknown) => selector(fakeState),
}));

// i18n is not initialized in the vitest setup; mock the hook (same resolved module the
// component imports relatively) so tx() deterministically returns the English defaultValue.
vi.mock('../../apps/omnihub-site/src/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    tx: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
  }),
}));

vi.mock('@/dashboard/lib/omniMediaCatalog', () => {
  class OmniMediaError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.name = 'OmniMediaError';
      this.code = code;
    }
  }
  return {
    fetchOmniMediaCatalog: vi.fn(),
    deleteOmniMediaAsset: vi.fn(),
    OmniMediaError,
  };
});

import { OmniMediaGallery } from '@/dashboard/components/media/OmniMediaGallery';
import { fetchOmniMediaCatalog, OmniMediaError } from '@/dashboard/lib/omniMediaCatalog';

const fetchMock = fetchOmniMediaCatalog as unknown as ReturnType<typeof vi.fn>;
const RAW_SDK = 'Edge Function returned a non-2xx status code';

describe('OmniMediaGallery error honesty', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('shows honest copy and never the raw SDK string when the catalog fails', async () => {
    fetchMock.mockRejectedValue(new OmniMediaError('omnimedia_catalog_failed'));

    render(<OmniMediaGallery variant="compact" />);

    const alert = await screen.findByTestId('omnimedia-gallery-error');
    expect(alert).toHaveTextContent(
      'OmniMedia is temporarily unavailable. Retry, or check media service status.',
    );
    // The forbidden raw/backend wording must not appear in user-visible text.
    expect(alert.textContent).not.toContain(RAW_SDK);
    expect(alert.textContent?.toLowerCase()).not.toContain('non-2xx');
    expect(alert.textContent?.toLowerCase()).not.toContain('functionshttperror');
    expect(alert.textContent?.toLowerCase()).not.toContain('omnilink');
  });

  it('retries the load when Retry is pressed', async () => {
    fetchMock.mockRejectedValueOnce(new OmniMediaError('omnimedia_catalog_failed'));
    render(<OmniMediaGallery variant="compact" />);

    await screen.findByTestId('omnimedia-gallery-error');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByTestId('omnimedia-gallery-retry'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByTestId('omnimedia-gallery-empty');
  });
});
