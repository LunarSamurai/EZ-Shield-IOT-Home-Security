-- Registration secret (admin sets this, required to create accounts)
create table public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

create policy "Authenticated users can read config"
  on public.app_config for select using (auth.role() = 'authenticated');

create policy "Service role can manage config"
  on public.app_config for all using (true);

-- Default registration secret — change this in Supabase dashboard or via settings
insert into public.app_config (key, value) values
  ('registration_secret', 'EZ2025'),
  ('entry_delay_seconds', '30'),
  ('exit_delay_seconds', '30'),
  ('alarm_duration_seconds', '300'),
  ('siren_enabled', 'true'),
  ('auto_arm_enabled', 'false'),
  ('auto_arm_time', '23:00'),
  ('alert_cooldown_seconds', '10'),
  ('ultrasonic_poll_interval_ms', '500');

-- Add pin_set flag and settings to profiles
alter table public.profiles add column pin_set boolean not null default false;
alter table public.profiles add column settings jsonb not null default '{}';

-- Update the trigger to set pin_set = false for new users (no default PIN anymore)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, pin_code, pin_set)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'User'), '', false);
  return new;
end;
$$ language plpgsql security definer;

-- Add connected status tracking to zones
alter table public.zones add column connected boolean not null default false;
alter table public.zones add column last_seen_at timestamptz;
alter table public.zones add column device_name text;

-- Remove seed zones — zones are auto-created from ESP registration
delete from public.zones;

-- Allow service role to manage zones (for Pi server auto-registration)
create policy "Service can manage zones"
  on public.zones for all using (true);

-- Allow authenticated users to update zones (for settings)
create policy "Authenticated users can update zones"
  on public.zones for update using (auth.role() = 'authenticated');

-- Enable realtime for app_config changes
alter publication supabase_realtime add table public.app_config;
