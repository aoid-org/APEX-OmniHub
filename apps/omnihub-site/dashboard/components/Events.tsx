/**
 * @deprecated - This component is currently orphaned and scheduled for wiring or removal.
 */
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOmniLinkEvents } from '@/omnidash/omnilink-api';
import { HiddenValue } from './HiddenMetric';
import { Activity, RadioReceiver, Clock as ClockIcon, Hash } from 'lucide-react';
import { useMemo } from 'react';

export const Events = () => {
  const { user } = useAuth();
  const eventsQuery = useQuery({
    queryKey: ['omnilink-events', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('User required');
      return fetchOmniLinkEvents(user.id);
    },
  });

  const events = useMemo(() => eventsQuery.data || [], [eventsQuery.data]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>OmniLink Events</CardTitle>
        <CardDescription>Latest universal events ingested through the OmniLink port.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-x-hidden">
        {events.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No events found.</div>
        ) : (
          <div className="space-y-3 px-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="border border-white/10 bg-[#1A1F2E]/30 rounded-lg p-3 relative hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold"><HiddenValue icon={Activity} value={event.type} /></p>
                    <p className="text-sm text-muted-foreground"><HiddenValue icon={RadioReceiver} value={event.source} /></p>
                  </div>
                  <Badge variant="outline"><HiddenValue icon={ClockIcon} value={new Date(event.time).toLocaleString()} /></Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Envelope ID: <HiddenValue icon={Hash} value={event.envelope_id} /></p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Events;
