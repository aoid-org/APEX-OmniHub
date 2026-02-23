import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOmniLinkEvents } from '@/omnidash/omnilink-api';
import { HiddenValue } from './HiddenMetric';
import { Activity, RadioReceiver, Clock as ClockIcon, Hash } from 'lucide-react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useState, useMemo } from 'react';

const ResponsiveGridLayout = WidthProvider(Responsive);

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

  const events = eventsQuery.data || [];

  const initialLayouts = useMemo(() => {
    const lg = events.map((event, i) => ({ i: event.id, x: 0, y: i, w: 1, h: 1, isResizable: false }));
    return { lg, md: lg, sm: lg, xs: lg, xxs: lg };
  }, [events]);

  const [layouts, setLayouts] = useState<Partial<Record<string, Layout>>>(initialLayouts);

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
          <ResponsiveGridLayout
            className="layout -mx-2 px-2"
            layouts={layouts}
            breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
            cols={{ lg: 1, md: 1, sm: 1, xs: 1, xxs: 1 }}
            rowHeight={80}
            onLayoutChange={(_layout, allLayouts) => setLayouts(allLayouts)}
            draggableHandle=".custom-drag-handle"
            margin={[12, 12]}
            useCSSTransforms={true}
          >
            {events.map((event) => (
              <div key={event.id}>
                <div className="border border-white/10 bg-[#1A1F2E]/30 rounded-lg p-3 h-full relative group hover:border-white/20 transition-colors">
                  <div className="custom-drag-handle absolute top-0 right-0 p-2 h-8 w-8 cursor-grab active:cursor-grabbing text-white/0 group-hover:text-white/30 hover:!text-white/60 transition-colors z-20">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  </div>
                  <div className="flex items-center justify-between pr-6">
                    <div>
                      <p className="font-semibold"><HiddenValue icon={Activity} value={event.type} /></p>
                      <p className="text-sm text-muted-foreground"><HiddenValue icon={RadioReceiver} value={event.source} /></p>
                    </div>
                    <Badge variant="outline"><HiddenValue icon={ClockIcon} value={new Date(event.time).toLocaleString()} /></Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Envelope ID: <HiddenValue icon={Hash} value={event.envelope_id} /></p>
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </CardContent>
    </Card>
  );
};

export default Events;
