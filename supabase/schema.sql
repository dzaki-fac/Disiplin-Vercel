-- Jalankan di Supabase Dashboard > SQL Editor > New Query
-- Untuk project: rsvswhrenusryblyzvcn
--
-- Skema fresh-install (sudah termasuk sistem akun: data dipisah per user via user_id + RLS).
-- Kalau tabel SUDAH ADA dari versi lama (tanpa user_id), jangan pakai file ini —
-- pakai supabase/migration_account_system.sql sebagai gantinya.

-- 1. TASKS
create table if not exists public.tasks (
  id text primary key,
  title text not null,
  done boolean not null default false,
  created_at bigint not null,
  completed_at bigint,
  week int,
  "order" int,
  user_id uuid not null references auth.users(id) on delete cascade
);

-- 2. FOCUS SESSIONS
create table if not exists public.sessions (
  id text primary key,
  task_id text,
  task_title text,
  seconds int not null,
  started_at bigint not null,
  completed_at bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade
);

-- 3. SESSION LIST (opsional, untuk daftar judul sesi)
create table if not exists public.session_list (
  id text primary key,
  title text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique (id, user_id)
);

-- Index pemilik baris
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists session_list_user_id_idx on public.session_list (user_id);

-- Aktifkan RLS
alter table public.tasks enable row level security;
alter table public.sessions enable row level security;
alter table public.session_list enable row level security;

-- Policy per-user: tiap user hanya bisa baca/tulis baris miliknya sendiri
-- Hapus dulu kalau sudah ada (biar aman dijalankan ulang)
drop policy if exists "Allow all for anon tasks" on public.tasks;
drop policy if exists "Allow all for anon sessions" on public.sessions;
drop policy if exists "Allow all for anon session_list" on public.session_list;
drop policy if exists "Users manage own tasks" on public.tasks;
drop policy if exists "Users manage own sessions" on public.sessions;
drop policy if exists "Users manage own session_list" on public.session_list;

create policy "Users manage own tasks"
  on public.tasks for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own sessions"
  on public.sessions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own session_list"
  on public.session_list for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
