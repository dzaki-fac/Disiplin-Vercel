# Disiplin — Focus Timer (Web)

> Timer fokus minimalis untuk deep work — versi web, siap deploy ke Vercel.

<p align="center">
  <img src="public/icon.png" alt="Disiplin" width="120" />
</p>

Disiplin adalah aplikasi focus timer untuk teknik Pomodoro, timer biasa, dan
stopwatch. Setiap sesi yang selesai tercatat otomatis, tugas diatur dalam
bucket mingguan, dan riwayatmu divisualisasikan jadi grafik, kalender bulanan,
dan heatmap tahunan.

Versi ini adalah **versi web** (migrasi dari versi Electron) dengan:

- **Akun per-user via Supabase Auth** (email + password) — data tiap user terpisah via Row Level Security
- **Mode tamu** — bisa dipakai tanpa login, data tersimpan di `localStorage`
- **Sync cloud + offline-first** — data lokal jadi cache, sinkron ke Supabase saat login
- **PWA installable** — bisa di-install di desktop & mobile, jalan offline via service worker
- **Responsif** — layout mobile (bottom nav) & desktop (top nav)

## Fitur

- **Tiga mode timer**
  - **Pomodoro** — siklus fokus / istirahat pendek / istirahat panjang, durasi & interval bisa diatur
  - **Timer** — countdown dengan durasi bebas
  - **Stopwatch** — hitung naik tanpa batas
  - Auto-start antar tahap, suara UI opsional, progress ring di sekeliling jam
- **Perencanaan tugas**
  - Tugas dikelompokkan dalam bucket mingguan (rolling 4 minggu)
  - Tambah, edit, selesaikan, hapus, drag untuk reorder, dan tempelkan sesi ke tugas
- **Riwayat**
  - Log lengkap setiap sesi: durasi, tugas, dan timestamp
  - **Export / import** riwayat sebagai JSON untuk backup atau pindah device
- **Statistik**
  - Kartu ringkasan: total waktu fokus, menit hari ini, streak, sesi hari ini
  - **Grafik 7 hari** (minggu ini vs minggu lalu + garis rata-rata)
  - **Kalender bulanan** heatmap
  - **Heatmap tahunan** dengan skala warna 2 jam (hingga 6+ jam)
  - Breakdown sesi teratas + radar chart riwayat
- **Akun & sinkronisasi**
  - Daftar / masuk dengan email + password (Supabase Auth)
  - Data dipisah per `user_id`, hanya pemilik yang bisa baca/tulis (RLS)
  - Mode tamu tetap bisa pakai semua fitur secara lokal
- **PWA**
  - Installable (manifest + ikon 192/512 + maskable)
  - Offline via `sw.js`, shortcut "Mulai Fokus / Tugas / Statistik"
- **Pixel Blast background** — background piksel animasi (Three.js + postprocessing) dengan efek ripple saat diklik

## Screenshot

### Fokus

![Fokus](screenshots/Screenshot%202026-08-15%20170639.png)

### Tugas

![Tugas](screenshots/Screenshot%202026-08-15%20170658.png)

### Riwayat

![Riwayat](screenshots/Screenshot%202026-08-15%20170707.png)

### Statistik

![Statistik atas](screenshots/Screenshot%202026-08-15%20170746.png)

![Statistik bawah](screenshots/Screenshot%202026-08-15%20170753.png)

## Tech Stack

| Layer    | Teknologi |
| -------- | --------- |
| UI       | [React](https://react.dev/) 19 |
| Bahasa   | [TypeScript](https://www.typescriptlang.org/) |
| Build    | [Vite](https://vitejs.dev/) 7 |
| Backend  | [Supabase](https://supabase.com/) (Auth + Postgres + Realtime) |
| Charts   | [Recharts](https://recharts.org/) |
| Efek     | [Three.js](https://threejs.org/) + [postprocessing](https://github.com/pmndrs/postprocessing) |
| Animasi  | [Motion](https://motion.dev/) |
| Hosting  | [Vercel](https://vercel.com/) |
| PWA      | Service worker kustom (`public/sw.js`) + Web App Manifest |

## Mulai Cepat

### Prasyarat

- [Node.js](https://nodejs.org/) 20+
- npm (bawaan Node) — tidak perlu pnpm untuk versi web ini
- Akun [Supabase](https://supabase.com/) gratis (untuk auth + database)

### 1. Install

```bash
npm install
```

### 2. Siapkan environment

```bash
copy .env.example .env
```

Isi `.env`:

```ini
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=isi_anon_key_dari_dashboard
```

> Ambil dari Supabase Dashboard → Project Settings → API.
> Jangan pernah taruh `service_role` key dengan prefix `VITE_` — itu akan terkirim ke browser.

### 3. Siapkan database

Buka Supabase Dashboard → SQL Editor → New Query, lalu jalankan salah satu:

- **Install baru:** isi dari `supabase/schema.sql`
- **Migrasi dari versi lama (tanpa `user_id`):** isi dari `supabase/migration_account_system.sql`

Pastikan juga di dashboard:

- Authentication → Providers → Email = **Enabled**
- Kalau tidak mau verifikasi email: Email → "Confirm email" = **OFF**
- Database → Replication → nyalakan Realtime untuk `tasks`, `sessions`, `session_list` (untuk sync antar device)

### 4. Development

```bash
npm run dev
```

Buka http://localhost:5173

### 5. Build & preview

```bash
npm run build
npm run preview
```

## Deploy ke Vercel

1. Push repo ini ke GitHub
2. Di [vercel.com](https://vercel.com) → Add New → Project → import repo
3. Framework preset: **Vite** (otomatis terdeteksi)
4. Tambahkan Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy — `vercel.json` sudah mengatur rewrite SPA (`/(.*)` → `/index.html`) dan header cache untuk `sw.js`, manifest, ikon, dan assets

## Struktur Proyek

```
├── public/                     # Aset statis + PWA (manifest, sw.js, icons/)
├── supabase/
│   ├── schema.sql              # Skema fresh-install (dengan sistem akun + RLS)
│   └── migration_account_system.sql  # Migrasi DB lama → sistem akun
├── src/
│   └── renderer/               # Root Vite
│       ├── index.html
│       └── src/
│           ├── components/     # Views, charts, backgrounds, icons
│           │   ├── TimerView.tsx
│           │   ├── TasksView.tsx
│           │   ├── HistoryView.tsx
│           │   ├── StatsView.tsx
│           │   ├── WeekAreaChart.tsx       # Grafik perbandingan 7 hari
│           │   ├── HistoryRadarChart.tsx   # Radar chart riwayat
│           │   ├── MonthCalendar.tsx       # Kalender heatmap bulanan
│           │   ├── Heatmap.tsx             # Heatmap tahunan
│           │   ├── AuthModal.tsx           # Login / daftar
│           │   └── PixelBlast.tsx          # Background WebGL
│           ├── lib/            # Auth, store, supabase client, utils
│           │   ├── auth.tsx
│           │   ├── store.tsx
│           │   └── supabase.ts
│           ├── App.tsx
│           └── types.ts
├── vercel.json                 # Rewrite SPA + header cache
└── vite.config.ts              # Root src/renderer, output dist/
```

## Data & Privasi

- **Sudah login:** data tersimpan di Supabase Postgres, dipisah per `user_id` dengan Row Level Security — tiap user hanya bisa akses baris miliknya sendiri. `localStorage` dipakai sebagai cache offline-first.
- **Mode tamu (belum login):** semua data hanya di `localStorage` — tidak ada yang terkirim ke server.
- Gunakan tombol **export** di view Riwayat untuk backup sesi sebagai file JSON, atau **import** untuk pindah device.

## Perintah Berguna

| Perintah           | Deskripsi                              |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Jalankan dev server (http://localhost:5173) |
| `npm run build`    | Typecheck + build produksi ke `dist/`  |
| `npm run preview`  | Preview hasil build produksi           |
| `npm run typecheck`| Type-check tanpa emit                  |
| `npm run lint`     | Jalankan ESLint                        |
| `npm run format`   | Format semua file dengan Prettier      |

## Roadmap

- [ ] Notifikasi desktop saat tahap fokus / istirahat selesai
- [ ] Mini window always-on-top / tray
- [ ] Tag & filter sesi di riwayat
- [ ] Export statistik sebagai CSV/PNG
- [ ] Login sosial (Google / GitHub via Supabase)

## Lisensi

MIT
