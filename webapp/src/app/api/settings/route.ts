import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('app_config')
    .select('key, value');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const settings: Record<string, string> = {};
  data?.forEach((row) => {
    settings[row.key] = row.value;
  });

  return Response.json(settings);
}

export async function PUT(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates: Record<string, string> = await request.json();
  const serviceClient = createServiceClient();

  // Don't allow changing registration_secret from the UI
  const safeKeys = [
    'entry_delay_seconds', 'exit_delay_seconds', 'alarm_duration_seconds',
    'siren_enabled', 'auto_arm_enabled', 'auto_arm_time',
    'alert_cooldown_seconds', 'ultrasonic_poll_interval_ms',
    'emergency_email', 'emergency_phone', 'phone_carrier',
    'smtp_email', 'smtp_password',
    'notify_email_enabled', 'notify_sms_enabled', 'notify_voice_enabled',
    'alarm_message',
  ];

  for (const [key, value] of Object.entries(updates)) {
    if (!safeKeys.includes(key)) continue;

    await serviceClient
      .from('app_config')
      .update({ value: String(value), updated_at: new Date().toISOString() })
      .eq('key', key);
  }

  return Response.json({ success: true });
}
