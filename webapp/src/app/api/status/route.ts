import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [stateResult, heartbeatResult, alertResult] = await Promise.all([
    supabase
      .from('system_state')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('heartbeats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('alerts')
      .select('*')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false }),
  ]);

  const lastHeartbeat = heartbeatResult.data;
  const isOnline = lastHeartbeat
    ? Date.now() - new Date(lastHeartbeat.created_at).getTime() < 60000
    : false;

  return Response.json({
    mode: stateResult.data?.mode || 'disarm',
    pi_online: isOnline,
    last_heartbeat: lastHeartbeat?.created_at || null,
    active_alerts: alertResult.data?.length || 0,
  });
}
