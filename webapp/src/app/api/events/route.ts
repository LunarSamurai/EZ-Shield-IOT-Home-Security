import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { PiEventPayload } from '@/lib/types';

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.PI_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: PiEventPayload = await request.json();
  const supabase = createServiceClient();

  // Check if zone exists, auto-register if not
  let { data: zone } = await supabase
    .from('zones')
    .select('*')
    .eq('id', body.zone_id)
    .single();

  if (!zone) {
    // Auto-register zone from ESP data
    const { data: newZone } = await supabase
      .from('zones')
      .insert({
        id: body.zone_id,
        name: body.zone_name || `Zone ${body.zone_id}`,
        sensor_type: body.sensor_type,
        location: null,
        device_name: body.device_name || null,
        connected: true,
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();
    zone = newZone;
  } else {
    // Update zone: mark as connected, update last seen, update name if provided
    const updateData: Record<string, unknown> = {
      connected: true,
      last_seen_at: new Date().toISOString(),
    };
    if (body.zone_name) updateData.name = body.zone_name;
    if (body.device_name) updateData.device_name = body.device_name;

    await supabase
      .from('zones')
      .update(updateData)
      .eq('id', body.zone_id);
  }

  // Insert the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      zone_id: body.zone_id,
      event_type: body.event_type,
      value: body.value || null,
    })
    .select()
    .single();

  if (eventError) {
    return Response.json({ error: eventError.message }, { status: 500 });
  }

  // Check if system is armed and this is an alarm-worthy event
  const { data: state } = await supabase
    .from('system_state')
    .select('mode')
    .order('changed_at', { ascending: false })
    .limit(1)
    .single();

  if (state && state.mode !== 'disarm') {
    const isAlarmEvent =
      (body.sensor_type === 'hall' && body.event_type === 'open') ||
      (body.sensor_type === 'ultrasonic' && body.event_type === 'triggered');

    if (isAlarmEvent) {
      await supabase.from('alerts').insert({
        event_id: event.id,
        zone_id: body.zone_id,
        severity: 'critical',
        message: `ALARM: ${zone?.name || 'Zone ' + body.zone_id} - ${body.event_type} while system is ${state.mode}`,
      });
    }
  }

  return Response.json({ success: true, event });
}
