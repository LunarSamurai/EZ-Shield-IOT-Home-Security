import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendAlarmNotifications } from '@/lib/mailer';
import type { PiEventPayload } from '@/lib/types';

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.PI_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: PiEventPayload = await request.json();
  const supabase = createServiceClient();

  // Auto-register zone if it doesn't exist
  let { data: zone } = await supabase
    .from('zones')
    .select('*')
    .eq('id', body.zone_id)
    .single();

  if (!zone) {
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

  // Don't create events for registration messages
  if (body.event_type === 'register') {
    return Response.json({ success: true, registered: true });
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

  // Get current system mode
  const { data: state } = await supabase
    .from('system_state')
    .select('mode')
    .order('changed_at', { ascending: false })
    .limit(1)
    .single();

  const mode = state?.mode || 'disarm';

  // Determine if this event should trigger an alarm based on mode
  // STAY: Only hall sensors (doors/windows) trigger — people are home, movement is normal
  // AWAY: Both hall AND ultrasonic sensors trigger — nobody should be home
  // DISARM: Nothing triggers
  let shouldAlarm = false;

  if (mode === 'stay') {
    // Stay mode: only door/window breaches
    shouldAlarm = body.sensor_type === 'hall' && body.event_type === 'open';
  } else if (mode === 'away') {
    // Away mode: doors/windows AND motion/proximity
    shouldAlarm =
      (body.sensor_type === 'hall' && body.event_type === 'open') ||
      (body.sensor_type === 'ultrasonic' && body.event_type === 'triggered');
  }

  if (shouldAlarm) {
    const zoneName = zone?.name || body.zone_name || `Zone ${body.zone_id}`;

    // Check alert cooldown — don't spam notifications
    const { data: config } = await supabase
      .from('app_config')
      .select('key, value');

    const settings: Record<string, string> = {};
    config?.forEach((row) => { settings[row.key] = row.value; });

    const cooldown = parseInt(settings.alert_cooldown_seconds || '10', 10) * 1000;

    const { data: lastAlert } = await supabase
      .from('alerts')
      .select('created_at')
      .eq('zone_id', body.zone_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const timeSinceLastAlert = lastAlert
      ? Date.now() - new Date(lastAlert.created_at).getTime()
      : Infinity;

    if (timeSinceLastAlert < cooldown) {
      // Throttled — still insert event but don't create alert or notify
      return Response.json({ success: true, event, throttled: true });
    }

    // Create the alert
    const alertMessage = `ALARM: ${zoneName} — ${body.event_type.toUpperCase()} detected while system is in ${mode.toUpperCase()} mode`;

    const { data: alert } = await supabase
      .from('alerts')
      .insert({
        event_id: event.id,
        zone_id: body.zone_id,
        severity: 'critical',
        message: alertMessage,
      })
      .select()
      .single();

    // Send notifications (email + SMS)
    const notifyResult = await sendAlarmNotifications(
      {
        smtp_email: settings.smtp_email || '',
        smtp_password: settings.smtp_password || '',
        emergency_email: settings.emergency_email || '',
        emergency_phone: settings.emergency_phone || '',
        phone_carrier: settings.phone_carrier || '',
        notify_email_enabled: settings.notify_email_enabled || 'false',
        notify_sms_enabled: settings.notify_sms_enabled || 'false',
        alarm_message: settings.alarm_message || 'Your home security has been triggered.',
      },
      {
        zoneName,
        eventType: body.event_type,
        mode,
        timestamp: new Date().toISOString(),
        value: body.value,
      }
    );

    // Log notification results
    const logs = [];
    if (settings.notify_email_enabled === 'true') {
      logs.push({
        alert_id: alert?.id,
        channel: 'email',
        recipient: settings.emergency_email,
        status: notifyResult.email.sent ? 'sent' : 'failed',
        error_message: notifyResult.email.error || null,
      });
    }
    if (settings.notify_sms_enabled === 'true') {
      logs.push({
        alert_id: alert?.id,
        channel: 'sms',
        recipient: settings.emergency_phone,
        status: notifyResult.sms.sent ? 'sent' : 'failed',
        error_message: notifyResult.sms.error || null,
      });
    }
    if (logs.length > 0) {
      await supabase.from('notification_log').insert(logs);
    }

    return Response.json({ success: true, event, alert, notifications: notifyResult });
  }

  return Response.json({ success: true, event });
}
