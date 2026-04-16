-- EZShield Security System Schema

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  pin_code text not null default '1234',
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, pin_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'User'), '1234');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Zones (sensor definitions)
create table public.zones (
  id serial primary key,
  name text not null,
  sensor_type text not null check (sensor_type in ('hall', 'ultrasonic')),
  location text,
  threshold_cm integer default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.zones enable row level security;

create policy "Authenticated users can read zones"
  on public.zones for select using (auth.role() = 'authenticated');

create policy "Admins can manage zones"
  on public.zones for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Events (sensor readings)
create table public.events (
  id bigserial primary key,
  zone_id integer references public.zones(id) on delete cascade not null,
  event_type text not null,
  value text,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Authenticated users can read events"
  on public.events for select using (auth.role() = 'authenticated');

create policy "API can insert events"
  on public.events for insert with check (true);

-- System State (arm mode)
create table public.system_state (
  id serial primary key,
  mode text not null default 'disarm' check (mode in ('stay', 'away', 'disarm')),
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

alter table public.system_state enable row level security;

create policy "Authenticated users can read system state"
  on public.system_state for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert system state"
  on public.system_state for insert with check (auth.role() = 'authenticated');

-- Insert default system state
insert into public.system_state (mode) values ('disarm');

-- Alerts
create table public.alerts (
  id bigserial primary key,
  event_id bigint references public.events(id) on delete cascade,
  zone_id integer references public.zones(id) on delete cascade not null,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  message text,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.alerts enable row level security;

create policy "Authenticated users can read alerts"
  on public.alerts for select using (auth.role() = 'authenticated');

create policy "Authenticated users can update alerts"
  on public.alerts for update using (auth.role() = 'authenticated');

create policy "API can insert alerts"
  on public.alerts for insert with check (true);

-- Heartbeats (Pi server health)
create table public.heartbeats (
  id bigserial primary key,
  device_id text not null default 'pi-main',
  status text not null default 'online',
  created_at timestamptz not null default now()
);

alter table public.heartbeats enable row level security;

create policy "Authenticated users can read heartbeats"
  on public.heartbeats for select using (auth.role() = 'authenticated');

create policy "API can insert heartbeats"
  on public.heartbeats for insert with check (true);

-- Enable realtime for live dashboard updates
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.system_state;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.heartbeats;

-- Seed some default zones
insert into public.zones (name, sensor_type, location, threshold_cm) values
  ('Front Door', 'hall', 'Entrance', null),
  ('Back Door', 'hall', 'Kitchen', null),
  ('Garage Door', 'hall', 'Garage', null),
  ('Living Room Window', 'hall', 'Living Room', null),
  ('Hallway Motion', 'ultrasonic', 'Hallway', 30),
  ('Driveway', 'ultrasonic', 'Front Yard', 50);
