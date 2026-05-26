import { useSearchParams } from 'react-router-dom';
import PhysiOmniWhiteLabelDash from '@/components/physiomni/PhysiOmniWhiteLabelDash';

export function PhysiOmniPilotPage() {
  const [searchParams] = useSearchParams();

  // Parse query parameters for white-labeled customization, falling back to default branding
  const tenantLogoUrl = searchParams.get('logo') || 'https://raw.githubusercontent.com/lucide-react/lucide/main/icons/shield.svg';
  const brandHexColor = searchParams.get('color') || '#F97316';
  const tenantId = searchParams.get('tenant') || 'e28bbd91-4cf6-4444-8d4e-120a1337beef'; // Default pilot tenant UUID

  return (
    <PhysiOmniWhiteLabelDash
      tenantLogoUrl={tenantLogoUrl}
      brandHexColor={brandHexColor}
      tenantId={tenantId}
    />
  );
}
