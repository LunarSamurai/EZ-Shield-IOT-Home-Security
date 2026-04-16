import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const { secret } = await request.json();

  if (!secret || typeof secret !== 'string') {
    return Response.json({ error: 'Secret required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'registration_secret')
    .single();

  if (!data || data.value !== secret) {
    return Response.json({ valid: false, error: 'Invalid registration secret' }, { status: 403 });
  }

  return Response.json({ valid: true });
}
