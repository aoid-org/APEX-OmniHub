/**
 * IntegrationOnboarder
 * 3-step wizard: app details → 3 forced-choice questions → ConnectorKit hand-off.
 * Calls createOmniLinkIntegration then passes resulting def to parent via onComplete.
 * Lives in src/components/omnibridge/ — the only new component in this contract.
 */
import { useState } from 'react';
import type { IntegrationDef } from '@/omniconnect/core/registry';
import { createOmniLinkIntegration } from '@/omnidash/omnilink-api';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';

// ---------------------------------------------------------------------------
// Deterministic type maps — exact values from contract
// ---------------------------------------------------------------------------
const AUTH_MAP: Record<string, { requiresApiKey: boolean; auth_type?: string; requiresUsername?: boolean }> = {
  'API Key':           { requiresApiKey: true,  auth_type: 'apikey'  },
  'OAuth':             { requiresApiKey: true,  auth_type: 'oauth2'  },
  'Username+Password': { requiresApiKey: false, requiresUsername: true },
  'None':              { requiresApiKey: false, auth_type: 'none'    },
};

const DIRECTION_MAP: Record<string, { category: IntegrationDef['category'] }> = {
  'I call it':   { category: 'api'      },
  'It calls me': { category: 'webhook'  },
  'Both':        { category: 'platform' },
};

const INTENT_MAP: Record<string, { scopes: string[] }> = {
  'Monitor':         { scopes: ['read']                     },
  'Trigger actions': { scopes: ['read', 'write']             },
  'Receive events':  { scopes: ['events']                   },
  'All':             { scopes: ['read', 'write', 'events']  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  onComplete: (def: IntegrationDef) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function IntegrationOnboarder({ onComplete }: Props) {
  const [step, setStep] = useState<'details' | 'questions' | 'saving'>('details');
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl]   = useState('');
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [q3, setQ3] = useState<string | null>(null);
  const [probing, setProbing]  = useState(false);
  const [error, setError]      = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Step A → B: probe URL silently then move to questions
  // ---------------------------------------------------------------------------
  const handleDetailsNext = async () => {
    if (!appName.trim()) { setError('App name is required.'); return; }
    setError(null);
    if (appUrl) {
      setProbing(true);
      try {
        const res = await fetch('/api/omniboard/probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: appUrl }),
        });
        if (res.ok) {
          const data = await res.json() as { q1?: string | null; confidence?: string };
          if (data.confidence === 'high' && data.q1) setQ1(data.q1);
        }
      } catch {
        // probe failure is non-fatal — wizard continues normally
      } finally {
        setProbing(false);
      }
    }
    setStep('questions');
  };

  // ---------------------------------------------------------------------------
  // Step B → save: construct def + call Supabase + hand off
  // ---------------------------------------------------------------------------
  const handleFinish = async () => {
    if (!q1 || !q2 || !q3) { setError('Please answer all questions.'); return; }
    setError(null);
    setStep('saving');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const authAttrs  = AUTH_MAP[q1];
      const dirAttrs   = DIRECTION_MAP[q2];
      const intentAttrs = INTENT_MAP[q3];

      // Derive a deterministic slug type from the app name
      const typeSlug = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const record = await createOmniLinkIntegration(session.user.id, appName, typeSlug);

      const def: IntegrationDef = {
        id:               record.id,
        name:             appName,
        type:             typeSlug,
        description:      appUrl ? `Integration with ${appName} (${appUrl})` : `Integration with ${appName}`,
        icon:             Globe,
        requiresApiKey:   authAttrs.requiresApiKey,
        requiresUsername: authAttrs.requiresUsername,
        category:         dirAttrs.category,
        scopes:           intentAttrs.scopes,
        status:           'beta',
      };

      onComplete(def);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create integration.');
      setStep('questions');
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const ChoiceGroup = ({
    label, options, value, onChange,
  }: { label: string; options: string[]; value: string | null; onChange: (v: string) => void }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              value === opt
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:border-primary/50',
            ].join(' ')}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step A — App details
  // ---------------------------------------------------------------------------
  if (step === 'details') {
    return (
      <div className="space-y-6 pt-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="app-name">App name</Label>
            <Input
              id="app-name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. Shopify, Linear, Stripe"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="app-url">App URL <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="app-url"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="https://api.example.com"
              className="mt-1"
            />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          className="w-full"
          onClick={() => void handleDetailsNext()}
          disabled={probing}
        >
          {probing ? 'Probing...' : 'Next'}
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Saving state
  // ---------------------------------------------------------------------------
  if (step === 'saving') {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Creating integration…</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step B — 3 forced-choice questions
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 pt-4">
      <ChoiceGroup
        label="Q1: How does it authenticate?"
        options={['API Key', 'OAuth', 'Username+Password', 'None']}
        value={q1}
        onChange={setQ1}
      />
      <ChoiceGroup
        label="Q2: Which direction does data flow?"
        options={['I call it', 'It calls me', 'Both']}
        value={q2}
        onChange={setQ2}
      />
      <ChoiceGroup
        label="Q3: What do you want to do?"
        options={['Monitor', 'Trigger actions', 'Receive events', 'All']}
        value={q3}
        onChange={setQ3}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep('details')}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => void handleFinish()}
          disabled={!q1 || !q2 || !q3}
        >
          Connect
        </Button>
      </div>
    </div>
  );
}

export default IntegrationOnboarder;
