-- Ladies Planet: fresh Supabase project bootstrap.
-- Run once in the SQL Editor of the intended NEW, EMPTY project.
-- This file creates only application tables; it does not delete or modify data.
-- The frontend uses Supabase Auth, whose tables are managed by Supabase.

begin;

create table if not exists public.users (
  id uuid primary key,
  name text not null,
  email text not null unique,
  role text not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dresses (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  description text,
  category varchar(100) not null,
  sku varchar(100) not null unique,
  image_url text not null,
  thumbnail_url text,
  is_available boolean default true,
  is_deleted boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  video_url text not null,
  type text not null default 'generated',
  title text,
  description text,
  metadata jsonb default '{}'::jsonb,
  thumbnail_url text,
  bride_image_url text,
  dress_image_url text,
  jewellery_image_url text,
  logo_url text,
  jewellery_style text,
  appearance_mode text,
  background text,
  makeup text,
  show_branding boolean default false,
  duration integer,
  aspect_ratio text,
  quality text,
  status text default 'completed',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.bride (
  id serial primary key,
  name text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.bride_image (
  id serial primary key,
  bride_id integer not null references public.bride(id) on delete cascade,
  image_url text not null,
  image_type text not null,
  angle text not null default 'unknown',
  created_at timestamptz not null default now()
);

create table if not exists public.time_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  start_time text not null,
  end_time text not null,
  max_bookings integer default 1,
  current_bookings integer default 0,
  is_available boolean default true,
  is_deleted boolean default false,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_email text not null,
  client_phone text,
  appointment_date date not null,
  time_slot_id uuid,
  start_time text not null,
  end_time text not null,
  service_type text default 'consultation',
  notes text,
  status text default 'pending',
  is_deleted boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_bride_status on public.bride(status);
create index if not exists idx_bride_image_bride_id on public.bride_image(bride_id);
create index if not exists idx_dresses_deleted_available on public.dresses(is_deleted, is_available);
create index if not exists idx_appointments_date on public.appointments(appointment_date);
create index if not exists idx_time_slots_date on public.time_slots(slot_date);

-- Browser clients must not read boutique records directly. The current
-- backend connects as the database owner or through a server-only key.
alter table public.users enable row level security;
alter table public.dresses enable row level security;
alter table public.videos enable row level security;
alter table public.bride enable row level security;
alter table public.bride_image enable row level security;
alter table public.time_slots enable row level security;
alter table public.appointments enable row level security;

commit;

-- The expected result is seven table names.
select tablename
from pg_tables
where schemaname = 'public'
  and tablename in ('users', 'dresses', 'videos', 'bride', 'bride_image', 'time_slots', 'appointments')
order by tablename;
