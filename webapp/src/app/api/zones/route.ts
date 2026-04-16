import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch zones and latest events in two queries instead of N+1
  const [zonesResult, eventsResult] = await Promise.all([
    supabase
      .from('zones')
      .select('*')
      .eq('is_active', true)
      .order('id'),
    supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (zonesResult.error) {
    return Response.json({ error: zonesResult.error.message }, { status: 500 });
  }

  const zones = zonesResult.data || [];
  const events = eventsResult.data || [];

  // Build a map of zone_id -> latest event
  const latestEventByZone: Record<number, typeof events[0]> = {};
  for (const event of events) {
    if (!latestEventByZone[event.zone_id]) {
      latestEventByZone[event.zone_id] = event;
    }
  }

  const zonesWithStatus = zones.map((zone) => {
    const latestEvent = latestEventByZone[zone.id] || null;

    const isConnected = zone.last_seen_at
      ? Date.now() - new Date(zone.last_seen_at).getTime() < 60000
      : false;

    const isTriggered = isConnected && (
      zone.sensor_type === 'hall'
        ? latestEvent?.event_type === 'open'
        : latestEvent?.event_type === 'triggered'
    );

    return {
      ...zone,
      connected: isConnected,
      latest_event: latestEvent,
      is_triggered: isTriggered,
    };
  });

  return Response.json(zonesWithStatus);
}
