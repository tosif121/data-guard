-- Enable extensions
create extension if not exists vector;

-- 1. SERVICES
create table services (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- Payment API, Database, CDN, Auth
  status text check (status in ('healthy', 'degraded', 'down')) default 'healthy',
  response_time_ms integer default 0,
  uptime_percent numeric(5,2) default 100.00,
  last_check timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- 2. INCIDENTS
create table incidents (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references services(id),
  type text not null, -- api_failure, database_slow, traffic_spike
  severity text check (severity in ('critical', 'high', 'medium', 'low')) default 'medium',
  status text check (status in ('active', 'resolving', 'resolved')) default 'active',
  description text,
  started_at timestamp with time zone default now(),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 3. INCIDENT EVENTS
create table incident_events (
  id uuid default gen_random_uuid() primary key,
  incident_id uuid references incidents(id),
  event_type text check (event_type in ('detected', 'investigation', 'action_taken', 'recovered')) not null,
  description text,
  user_id text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- 4. ERROR LOGS
create table error_logs (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references services(id),
  incident_id uuid references incidents(id),
  severity text check (severity in ('error', 'warn', 'info')) default 'error',
  message text not null,
  stack_trace text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- 5. METRICS
create table metrics (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references services(id),
  metric_type text check (metric_type in ('error_count', 'response_time', 'traffic')) not null,
  value numeric not null,
  timestamp timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Row Level Security
alter table services enable row level security;
alter table incidents enable row level security;
alter table incident_events enable row level security;
alter table error_logs enable row level security;
alter table metrics enable row level security;

-- Policies (Permissive for Demo)
create policy "Public Access" on services for all using (true);
create policy "Public Access" on incidents for all using (true);
create policy "Public Access" on incident_events for all using (true);
create policy "Public Access" on error_logs for all using (true);
create policy "Public Access" on metrics for all using (true);

-- Indexes
create index idx_incidents_service_id on incidents(service_id);
create index idx_events_incident_id on incident_events(incident_id);
create index idx_logs_service_id on error_logs(service_id);
create index idx_metrics_service_id on metrics(service_id);

-- Realtime
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table incident_events;
alter publication supabase_realtime add table error_logs;
alter publication supabase_realtime add table metrics;
