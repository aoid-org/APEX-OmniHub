/**
 * OmniBoard — Integration Hub Page
 * Renders all available integrations as tiles.
 * Opens ConnectorKit on tile click, IntegrationOnboarder for new apps.
 */
import { useState, useEffect, useCallback } from 'react';
import { availableIntegrations, type IntegrationDef } from '@/omniconnect/core/registry';
import { fetchOmniLinkIntegrations } from '@/omnidash/omnilink-api';
import { ConnectorKit } from '@/components/ConnectorKit';
import { AppTile } from '@/components/AppTile';
import { IntegrationOnboarder } from '@/components/omnibridge/IntegrationOnboarder';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';

export function OmniBoardPage() {
  const [selected, setSelected] = useState<IntegrationDef | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [onboarderOpen, setOnboarderOpen] = useState(false);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  const loadConnected = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const integrations = await fetchOmniLinkIntegrations(session.user.id);
    setConnectedIds(new Set(integrations.map((i) => i.type)));
  }, []);

  useEffect(() => { void loadConnected(); }, [loadConnected]);

  const openKit = (def: IntegrationDef) => {
    setSelected(def);
    setSheetOpen(true);
  };

  const handleOnboardComplete = (def: IntegrationDef) => {
    setOnboarderOpen(false);
    openKit(def);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">OmniBoard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect and manage your integrations.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Connect New App tile */}
        <button
          onClick={() => setOnboarderOpen(true)}
          className="aspect-square rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 bg-white cursor-pointer transition-transform hover:scale-105 w-full p-4"
        >
          <Plus className="w-8 h-8 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Connect New App</span>
        </button>

        {/* Available integration tiles */}
        {availableIntegrations.map((def) => (
          <AppTile
            key={def.id}
            app={{
              name: def.name,
              alt: def.name,
              path: `/omniboard?connect=${def.type}`,
            }}
            isInstallable={!connectedIds.has(def.type)}
            onInstall={() => openKit(def)}
            onNavigate={() => openKit(def)}
            onOpenUrl={() => openKit(def)}
            variant="small"
          />
        ))}
      </div>

      {/* ConnectorKit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.name ?? 'Connect'}</SheetTitle>
          </SheetHeader>
          {selected && (
            <ConnectorKit
              integration={selected}
              onConnect={() => {
                void loadConnected();
                setSheetOpen(false);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* IntegrationOnboarder sheet */}
      <Sheet open={onboarderOpen} onOpenChange={setOnboarderOpen}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Connect a New App</SheetTitle>
          </SheetHeader>
          <IntegrationOnboarder onComplete={handleOnboardComplete} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default OmniBoardPage;
