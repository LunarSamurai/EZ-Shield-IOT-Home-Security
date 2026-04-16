import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: zones, error: zonesError } = await supabase
    .from('zones')
    .select('*')
    .eq('is_active', true)
    .order('id');

  if (zonesError) {
    return Response.json({ error: zonesError.message }, { status: 500 });
  }

  // Get latest event for each zone + determine connection status
  const zonesWithStatus = await Promise.all(
    (zones || []).map(async (zone) => {
      const { data: latestEvent } = await supabase
        .from('events')
        .select('*')
        .eq('zone_id', zone.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Zone is disconnected if no data received in last 60 seconds
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
        latest_event: latestEvent || null,
        is_triggered: isTriggered,
      };
    })
  );

  return Response.json(zonesWithStatus);
}
