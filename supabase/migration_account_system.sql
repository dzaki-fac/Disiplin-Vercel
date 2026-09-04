-- MIGRASI SISTEM AKUN (data dipisah per user)
-- Jalankan di Supabase Dashboard > SQL Editor > New Query
-- Untuk project: rsvswhrenusryblyzvcn
--
-- Yang dilakukan:
-- 1. Tambah kolom user_id (pemilik baris) ke tasks, sessions, session_list
-- 2. Ganti policy "allow all" jadi per-user (auth.uid() = user_id)
-- 3. Index user_id biar query tetap cepat
--
-- SEBELUM migrate, pastikan di dashboard:
-- - Authentication > Providers > Email = ENABLED (untuk login email+password)
-- - Kalau tidak mau user verifikasi email: Email > "Confirm email" = OFF
-- - Database > Replication/Realtime: nyalakan untuk tasks, sessions, session_list (untuk sync antar device)
--
-- CATATAN DATA LAMA: baris yang sudah ada sebelum migrasi punya user_id = NULL
-- dan TIDAK akan terlihat oleh siapa pun setelah RLS per-user aktif.
-- Pilihan: (a) hapus (uncomment blok CLEANUP di bawah), atau
-- (b) login lalu jalankan ulang migrasi data dari app (otomatis attach ke user tsb).

-- 1. Kolom user_id
alter table public.tasks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.session_list
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2. Index
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists session_list_user_id_idx on public.session_list (user_id);

-- 2b. Cabut unique global judul sesi (skema lama) — tiap user boleh punya judul yang sama.
-- Nama constraint default Postgres untuk "title unique" adalah session_list_title_key.
alter table public.session_list drop constraint if exists session_list_title_key;

-- 3. Ganti policy: hapus yang lama (allow all), buat yang per-user
drop policy if exists "Allow all for anon tasks" on public.tasks;
drop policy if exists "Allow all for anon sessions" on public.sessions;
drop policy if exists "Allow all for anon session_list" on public.session_list;

-- (idempotent) hapus policy per-user kalau migrasi dijalankan ulang
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

-- 4. CLEANUP (opsional): hapus data lama tanpa pemilik.
-- Uncomment 3 baris di bawah ini HANYA kalau data lama memang boleh dibuang.
-- delete from public.tasks where user_id is null;
-- delete from public.sessions where user_id is null;
-- delete from public.session_list where user_id is null;
