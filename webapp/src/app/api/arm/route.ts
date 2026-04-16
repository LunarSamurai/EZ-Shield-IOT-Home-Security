import { createClient } from '@/lib/supabase/server';
import type { SystemMode } from '@/lib/types';

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { mode, pin } = (await request.json()) as { mode: SystemMode; pin: string };

  if (!['stay', 'away', 'disarm'].includes(mode)) {
    return Response.json({ error: 'Invalid mode' }, { status: 400 });
  }

  // Verify PIN
  const { data: profile } = await supabase
    .from('profiles')
    .select('pin_code')
    .eq('id', user.id)
    .single();

  if (!profile || profile.pin_code !== pin) {
    return Response.json({ error: 'Invalid PIN' }, { status: 403 });
  }

  // If disarming, acknowledge all active alerts
  if (mode === 'disarm') {
    await supabase
      .from('alerts')
      .update({ acknowledged: true })
      .eq('acknowledged', false);
  }

  const { data, error } = await supabase
    .from('system_state')
    .insert({
      mode,
      changed_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, state: data });
}
