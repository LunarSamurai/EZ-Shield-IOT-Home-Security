import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pin, current_pin } = await request.json();

  if (!pin || typeof pin !== 'string' || pin.length < 4) {
    return Response.json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
  }

  // If user already has a PIN set, require current PIN to change it
  const { data: profile } = await supabase
    .from('profiles')
    .select('pin_code, pin_set')
    .eq('id', user.id)
    .single();

  if (profile?.pin_set && profile.pin_code !== current_pin) {
    return Response.json({ error: 'Current PIN is incorrect' }, { status: 403 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ pin_code: pin, pin_set: true })
    .eq('id', user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
