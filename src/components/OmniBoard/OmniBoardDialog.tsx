/**
 * OmniBoardDialog — Connect-Only Onboarding Engine UI
 *
 * A stepped wizard dialog that visualizes the OmniBoard FSM.
 * Walks users through: Find App → Authenticate → Verify → Done
 */

import { useState } from 'react';
import { Search, Key, Globe, Smartphone, Loader2, CheckCircle2, ShieldCheck, ArrowLeft, Plug } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOmniBoardFSM, type AuthType } from './useOmniBoardFSM';

const STEP_LABELS = ['Find App', 'Authenticate', 'Verify', 'Connected'] as const;

interface OmniBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-1 flex-1">
          <div
            className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 transition-all ${
              i < current
                ? 'bg-green-500 text-white'
                : i === current
                  ? 'bg-accent text-accent-foreground ring-2 ring-accent/30'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          <span
            className={`text-xs hidden sm:block truncate ${
              i === current ? 'font-semibold text-foreground' : 'text-muted-foreground'
            }`}
          >
            {label}
          </span>
          {i < STEP_LABELS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 rounded ${
                i < current ? 'bg-green-500' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function AppGrid({
  candidates,
  onSelect,
  searchQuery,
  onSearch,
}: {
  candidates: { name: string; type: string; description: string; icon: unknown }[];
  onSelect: (app: typeof candidates[0]) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search apps..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1">
        {candidates.map((app) => {
          const Icon = app.icon as React.ElementType;
          return (
            <Card
              key={app.type}
              className="cursor-pointer hover:border-accent hover:bg-accent/5 transition-all duration-150 group"
              onClick={() => onSelect(app)}
            >
              <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-accent/20 transition-colors">
                  {Icon && <Icon className="h-5 w-5 text-primary" />}
                </div>
                <span className="text-sm font-medium leading-tight">{app.name}</span>
                <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                  {app.description}
                </span>
              </CardContent>
            </Card>
          );
        })}
        {candidates.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No apps match your search.
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {candidates.length} integration{candidates.length !== 1 ? 's' : ''} available
      </p>
    </div>
  );
}

function AuthMethodPicker({
  appName,
  onSelect,
  onBack,
}: {
  appName: string;
  onSelect: (method: AuthType) => void;
  onBack: () => void;
}) {
  const methods: { type: AuthType; label: string; desc: string; icon: React.ElementType }[] = [
    { type: 'api_key', label: 'API Key', desc: 'Enter your API key or secret token', icon: Key },
    { type: 'oauth', label: 'OAuth 2.0', desc: 'Authorize via provider login page', icon: Globe },
    { type: 'device_code', label: 'Device Code', desc: 'Pair using a code on your device', icon: Smartphone },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="font-semibold">{appName}</p>
          <p className="text-xs text-muted-foreground">Choose authentication method</p>
        </div>
      </div>
      <div className="grid gap-3">
        {methods.map((m) => (
          <Card
            key={m.type}
            className="cursor-pointer hover:border-accent hover:bg-accent/5 transition-all duration-150"
            onClick={() => onSelect(m.type)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <m.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CredentialInput({
  authType,
  onSubmit,
  onBack,
}: {
  authType: AuthType;
  onSubmit: (cred: string) => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState('');

  if (authType === 'oauth') {
    return (
      <div className="space-y-4 text-center py-4">
        <Globe className="h-10 w-10 mx-auto text-accent animate-pulse" />
        <p className="text-sm text-muted-foreground">
          In production, this would redirect to the provider&apos;s OAuth consent page.
        </p>
        <Button onClick={() => onSubmit('oauth_mock_token')} className="w-full">
          Simulate Authorization
        </Button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium">
          {authType === 'api_key' ? 'Enter API Key' : 'Enter Device Code'}
        </p>
      </div>
      <Input
        type={authType === 'api_key' ? 'password' : 'text'}
        placeholder={authType === 'api_key' ? 'sk-...' : 'ABCD-1234'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <Button onClick={() => onSubmit(value)} disabled={!value.trim()} className="w-full">
        <Key className="h-4 w-4 mr-2" /> Verify & Connect
      </Button>
    </div>
  );
}

function VerifyingStep() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
      <div className="space-y-2 text-center">
        <p className="font-semibold">Verifying Connection</p>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span>Performing least-privilege ping...</span>
          <span>Checking token scopes...</span>
        </div>
      </div>
    </div>
  );
}

function CompletionStep({
  spec,
  onConnectAnother,
  onDone,
}: {
  spec: { connection: { provider_name: string; connection_id: string; auth_type: string; connected_at: string } };
  onConnectAnother: () => void;
  onDone: () => void;
}) {
  const [showSpec, setShowSpec] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
      </div>
      <div className="text-center">
        <p className="font-bold text-lg">{spec.connection.provider_name} Connected</p>
        <p className="text-sm text-muted-foreground">
          ID: {spec.connection.connection_id.slice(0, 18)}...
        </p>
      </div>
      <div className="w-full space-y-2 text-sm">
        <div className="flex justify-between px-3 py-2 bg-muted/50 rounded-lg">
          <span className="text-muted-foreground">Auth Type</span>
          <span className="font-medium capitalize">{spec.connection.auth_type.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between px-3 py-2 bg-muted/50 rounded-lg">
          <span className="text-muted-foreground">Verified</span>
          <ShieldCheck className="h-4 w-4 text-green-500" />
        </div>
      </div>
      {showSpec && (
        <pre className="w-full text-xs bg-black/90 text-green-400 p-4 rounded-lg overflow-x-auto max-h-48">
          {JSON.stringify(spec, null, 2)}
        </pre>
      )}
      <Button variant="ghost" size="sm" onClick={() => setShowSpec(!showSpec)}>
        {showSpec ? 'Hide' : 'View'} Connection Spec
      </Button>
      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1" onClick={onConnectAnother}>
          <Plug className="h-4 w-4 mr-2" /> Connect Another
        </Button>
        <Button className="flex-1" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

export function OmniBoardDialog({ open, onOpenChange }: OmniBoardDialogProps) {
  const { ctx, uiStep, searchApps, selectApp, selectAuthMethod, submitCredentials, reset } =
    useOmniBoardFSM();

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation completes
    setTimeout(reset, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            OmniBoard
          </DialogTitle>
          <DialogDescription>Connect-only onboarding engine</DialogDescription>
        </DialogHeader>

        <StepIndicator current={uiStep} />

        {/* Step 0: Find App */}
        {uiStep === 0 && (
          <AppGrid
            candidates={ctx.candidates}
            onSelect={selectApp}
            searchQuery={ctx.providerHint}
            onSearch={searchApps}
          />
        )}

        {/* Step 1: Authenticate */}
        {uiStep === 1 && ctx.state === 'AUTH_SETUP' && (
          <AuthMethodPicker
            appName={ctx.selectedApp?.name ?? ''}
            onSelect={selectAuthMethod}
            onBack={reset}
          />
        )}

        {uiStep === 1 && ctx.state === 'AUTH_COMPLETE' && (
          <CredentialInput
            authType={ctx.authType!}
            onSubmit={submitCredentials}
            onBack={() =>
              selectApp(ctx.selectedApp!)
            }
          />
        )}

        {/* Step 2: Verify */}
        {uiStep === 2 && <VerifyingStep />}

        {/* Step 3: Completion */}
        {uiStep === 3 && ctx.connectionSpec && (
          <CompletionStep
            spec={ctx.connectionSpec}
            onConnectAnother={reset}
            onDone={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
