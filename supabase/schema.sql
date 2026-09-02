-- Jalankan di Supabase Dashboard > SQL Editor > New Query
-- Untuk project: rsvswhrenusryblyzvcn

-- 1. TASKS
create table if not exists public.tasks (
  id text primary key,
  title text not null,
  done boolean not null default false,
  created_at bigint not null,
  completed_at bigint,
  week int,
  "order" int
);

-- 2. FOCUS SESSIONS
create table if not exists public.sessions (
  id text primary key,
  task_id text,
  task_title text,
  seconds int not null,
  started_at bigint not null,
  completed_at bigint not null
);

-- 3. SESSION LIST (opsional, untuk daftar judul sesi)
create table if not exists public.session_list (
  id text primary key,
  title text not null unique
);

-- Aktifkan RLS
alter table public.tasks enable row level security;
alter table public.sessions enable row level security;
alter table public.session_list enable row level security;

-- Policy: izinkan anon read/write (buat development, nanti bisa di-ketat-in pakai auth)
-- Hapus dulu kalau sudah ada
drop policy if exists "Allow all for anon tasks" on public.tasks;
drop policy if exists "Allow all for anon sessions" on public.sessions;
drop policy if exists "Allow all for anon session_list" on public.session_list;

create policy "Allow all for anon tasks"
  on public.tasks for all
  to anon, authenticated
  using (true) with check (true);

create policy "Allow all for anon sessions"
  on public.sessions for all
  to anon, authenticated
  using (true) with check (true);

create policy "Allow all for anon session_list"
  on public.session_list for all
  to anon, authenticated
  using (true) with check (true);
