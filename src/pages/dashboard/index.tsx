import { useMemo } from 'react';
import ApexAssistant from '@/pages/ApexAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { useOmniStream } from '@/hooks/useOmniStream';
import OmniSupportWidget from '@/components/global/OmniSupportWidget';

function TradeLineStatus(): JSX.Element {
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const { events, isConnected } = useOmniStream(sessionId);

  const activeCalls = useMemo(
    () => events.filter((event) => event.type === 'run.started').length,
    [events],
  );

  const activeAgents = useMemo(() => {
    const names = new Set(
      events
        .filter((event) => event.type === 'run.completed')
        .map((event) => event.agent)
        .filter((name): name is string => Boolean(name)),
    );

    return names.size;
  }, [events]);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">TradeLineStatus</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        <li>Realtime Link: {isConnected ? 'Online' : 'Offline'}</li>
        <li>Active Calls: {activeCalls}</li>
        <li>Active Agents: {activeAgents}</li>
      </ul>
    </section>
  );
}

export default function DashboardIndex(): JSX.Element {
  const { user } = useAuth();
  const isSystemHealthy = true;

  return (
    <div className="relative p-4 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <main className="space-y-4">
          <header className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">OmniDash</h1>
                <p className="text-sm text-muted-foreground">
                  {user?.email ? `Welcome back, ${user.email}` : 'Welcome to your dashboard command center.'}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${isSystemHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}
                  aria-hidden
                />
                <span>System Status: {isSystemHealthy ? 'Green' : 'Red'}</span>
              </div>
            </div>
          </header>

          <section className="rounded-xl border border-border bg-card p-2 shadow-sm">
            <ApexAssistant />
          </section>
        </main>

        <aside>
          <TradeLineStatus />
        </aside>
      </div>

      <OmniSupportWidget />
    </div>
  );
}
