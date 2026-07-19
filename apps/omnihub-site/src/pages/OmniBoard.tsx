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
    if (!session?.user?.id) return;
    const rows = await fetchOmniLinkIntegrations(session.user.id);
    setConnectedIds(new Set(rows.map((r: { type: string }) => r.type)));
  }, []);

  useEffect(() => { loadConnected(); }, [loadConnected]);

  const openKit = useCallback((def: IntegrationDef) => {
    setSelected(def);
    setSheetOpen(true);
  }, []);

  const handleOnboardComplete = useCallback((def: IntegrationDef) => {
    setOnboarderOpen(false);
    openKit(def);
  }, [openKit]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">OmniBoard</h1>
          <p className="text-muted-foreground mt-1">
            Connect and manage your integrations
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Connect New App tile */}
          <button
            onClick={() => setOnboarderOpen(true)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-accent transition-all cursor-pointer min-h-[120px]"
            aria-label="Connect a new app"
          >
            <Plus className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Connect New App</span>
          </button>

          {/* Available integration tiles */}
          {availableIntegrations.map((def) => (
            <AppTile
              key={def.id}
              app={{
                name: def.name,
                icon: def.id,
                alt: def.description,
                path: `/omniboard/${def.id}`,
              }}
              isInstallable={!connectedIds.has(def.type)}
              onInstall={() => openKit(def)}
              onNavigate={() => openKit(def)}
              onOpenUrl={() => {
                if (def.docsUrl) window.open(def.docsUrl, '_blank', 'noopener');
              }}
            />
          ))}
        </div>
      </div>

      {/* ConnectorKit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.name ?? 'Connect'}</SheetTitle>
          </SheetHeader>
          {selected && (
            <ConnectorKit
              integration={selected}
              onConnect={() => {
                setSheetOpen(false);
                loadConnected();
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* IntegrationOnboarder Sheet */}
      <Sheet open={onboarderOpen} onOpenChange={setOnboarderOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Connect New App</SheetTitle>
          </SheetHeader>
          <IntegrationOnboarder onComplete={handleOnboardComplete} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
