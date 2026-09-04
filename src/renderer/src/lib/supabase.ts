import { createClient } from '@supabase/supabase-js'
import type { FocusSession, SessionItem, Task } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] Missing env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Cek file .env di root project.'
  )
}

export const supabase = createClient(
  supabaseUrl ?? 'https://rsvswhrenusryblyzvcn.supabase.co',
  supabaseAnonKey ?? 'MISSING_ANON_KEY'
)

// --- auth: user aktif saat ini (di-set oleh AuthProvider, tamu = null) ---
// Mode tamu (belum login): semua fetch/push remote di-skip, app murni pakai localStorage.
let authUserId: string | null = null

export function setAuthUserId(id: string | null): void {
  authUserId = id
}

export function getAuthUserId(): string | null {
  return authUserId
}

// init awal (sebelum AuthProvider mount) biar push yang terjadi duluan tetap benar
if (typeof window !== 'undefined') {
  void supabase.auth
    .getSession()
    .then(({ data }) => {
      authUserId = data.session?.user?.id ?? null
    })
    .catch(() => {})
}

// --- DB row types (snake_case sesuai schema.sql) ---
// kolom "order" di DB di-quote karena reserved keyword, tapi PostgREST handle via supabase-js
export type DbTask = {
  id: string
  title: string
  done: boolean
  created_at: number
  completed_at: number | null
  week: number | null
  order: number | null
  user_id: string
}
export type DbSession = {
  id: string
  task_id: string | null
  task_title: string | null
  seconds: number
  started_at: number
  completed_at: number
  user_id: string
}
export type DbSessionItem = { id: string; title: string; user_id: string }

// --- mappers (user_id wajib — data dipisah per akun) ---
export const toDbTask = (t: Task, userId: string): DbTask => ({
  id: t.id,
  title: t.title,
  done: t.done,
  created_at: t.createdAt,
  completed_at: t.completedAt,
  week: t.week ?? null,
  order: t.order ?? null,
  user_id: userId
})
export const fromDbTask = (r: DbTask): Task => ({
  id: r.id,
  title: r.title,
  done: r.done,
  createdAt: Number(r.created_at),
  completedAt: r.completed_at !== null ? Number(r.completed_at) : null,
  week: r.week ?? undefined,
  order: (r as unknown as { order: number | null }).order ?? undefined
})
export const toDbSession = (s: FocusSession, userId: string): DbSession => ({
  id: s.id,
  task_id: s.taskId,
  task_title: s.taskTitle,
  seconds: s.seconds,
  started_at: s.startedAt,
  completed_at: s.completedAt,
  user_id: userId
})
export const fromDbSession = (r: DbSession): FocusSession => ({
  id: r.id,
  taskId: r.task_id,
  taskTitle: r.task_title,
  seconds: r.seconds,
  startedAt: Number(r.started_at),
  completedAt: Number(r.completed_at)
})

// --- offline queue ---
const LS_PENDING = 'disiplin.pendingSync'

type PendingOp =
  | { type: 'upsert_task'; task: Task }
  | { type: 'delete_task'; id: string }
  | { type: 'upsert_session'; session: FocusSession }
  | { type: 'delete_session'; id: string }
  | { type: 'clear_sessions' }
  | { type: 'upsert_session_list'; item: SessionItem }
  | { type: 'delete_session_list'; id: string }

function loadPending(): PendingOp[] {
  try {
    const raw = localStorage.getItem(LS_PENDING)
    return raw ? (JSON.parse(raw) as PendingOp[]) : []
  } catch {
    return []
  }
}
function savePending(ops: PendingOp[]): void {
  try {
    localStorage.setItem(LS_PENDING, JSON.stringify(ops))
  } catch {}
}
function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return (
    !navigator.onLine ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('fetch failed') ||
    msg.includes('Load failed') ||
    msg.includes('violates the document') // CSP
  )
}
function enqueue(op: PendingOp): void {
  const ops = loadPending()
  ops.push(op)
  savePending(ops)
  console.log(`[supabase] offline queue +1 (${op.type}), pending: ${ops.length}`)
}

export async function flushPending(): Promise<{ flushed: number; remaining: number; errors: string[] }> {
  const ops = loadPending()
  if (ops.length === 0) return { flushed: 0, remaining: 0, errors: [] }
  if (!navigator.onLine) return { flushed: 0, remaining: ops.length, errors: ['offline'] }
  const uid = authUserId
  // Tamu tidak punya user_id -> simpan antrean sampai login (jangan kirim, RLS akan menolak)
  if (!uid) return { flushed: 0, remaining: ops.length, errors: ['login dulu untuk sync'] }
  console.log(`[supabase] flushing ${ops.length} pending ops...`)
  const remaining: PendingOp[] = []
  const errors: string[] = []
  for (const op of ops) {
    try {
      if (op.type === 'upsert_task') {
        const { error } = await supabase.from('tasks').upsert(toDbTask(op.task, uid), { onConflict: 'id' })
        if (error) throw error
      } else if (op.type === 'delete_task') {
        const { error } = await supabase.from('tasks').delete().eq('id', op.id).eq('user_id', uid)
        if (error) throw error
      } else if (op.type === 'upsert_session') {
        const { error } = await supabase.from('sessions').upsert(toDbSession(op.session, uid), { onConflict: 'id' })
        if (error) throw error
      } else if (op.type === 'delete_session') {
        const { error } = await supabase.from('sessions').delete().eq('id', op.id).eq('user_id', uid)
        if (error) throw error
      } else if (op.type === 'clear_sessions') {
        const { error } = await supabase.from('sessions').delete().eq('user_id', uid)
        if (error) throw error
      } else if (op.type === 'upsert_session_list') {
        const { error } = await supabase
          .from('session_list')
          .upsert({ ...op.item, user_id: uid }, { onConflict: 'id' })
        if (error) throw error
      } else if (op.type === 'delete_session_list') {
        const { error } = await supabase.from('session_list').delete().eq('id', op.id).eq('user_id', uid)
        if (error) throw error
      }
    } catch (e) {
      if (isNetworkError(e)) {
        remaining.push(op)
        errors.push(`${op.type} network fail, re-queued`)
        break // stop flush, tetap offline
      } else {
        errors.push(`${op.type}: ${e instanceof Error ? e.message : String(e)}`)
        // jangan re-queue untuk error validasi, biar ga loop
      }
    }
  }
  // simpan sisa yang belum ke-flush + yang belum diproses
  if (remaining.length > 0) {
    const idx = ops.indexOf(remaining[0])
    const tail = ops.slice(idx + 1)
    savePending([...remaining, ...tail])
    return { flushed: idx, remaining: remaining.length + tail.length, errors }
  }
  // kalau tidak ada network fail, remaining = 0, semua sukses atau error validasi (di-skip)
  savePending(remaining)
  console.log(`[supabase] flush done: ${ops.length - remaining.length} ok, ${remaining.length} pending`)
  return { flushed: ops.length - remaining.length, remaining: remaining.length, errors }
}

export function getPendingCount(): number {
  return loadPending().length
}

export function clearPending(): void {
  try {
    localStorage.removeItem(LS_PENDING)
  } catch {}
}

// Hapus sisa data milik akun sebelumnya dari perangkat ini.
// Dipanggil saat logout / ganti akun biar data user lama tidak kebaca lagi
// oleh tamu maupun akun lain (tasks, sessions, sessionList, antrean offline).
export function clearLocalUserData(): void {
  try {
    localStorage.removeItem('disiplin.tasks')
    localStorage.removeItem('disiplin.sessions')
    localStorage.removeItem('disiplin.sessionList')
    localStorage.removeItem('disiplin.weekNames')
    localStorage.removeItem('disiplin.groupOrder')
    localStorage.removeItem(LS_PENDING)
  } catch {}
}

// auto-flush saat online balik
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[supabase] online -> flushing pending...')
    void flushPending().then((r) => console.log('[supabase] online flush:', r))
    // juga coba bulk sync full localStorage biar aman (idempotent)
    void migrateLocalStorageToSupabase().then((r) => {
      if (r.tasks + r.sessions + r.sessionList > 0) console.log('[supabase] online bulk sync:', r)
    })
  })
}

// --- helpers (fire-and-forget, log error aja biar ga block UI) ---
const logErr = (label: string, err: unknown): void => {
  if (err) console.warn(`[supabase] ${label}:`, err)
}

export async function fetchTasks(): Promise<Task[]> {
  const uid = authUserId
  if (!uid) throw new Error('not-logged-in')
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', uid)
    .order('order', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data as DbTask[]).map(fromDbTask)
}
export async function fetchSessions(): Promise<FocusSession[]> {
  const uid = authUserId
  if (!uid) throw new Error('not-logged-in')
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', uid)
    .order('completed_at', { ascending: false })
  if (error) throw error
  return (data as DbSession[]).map(fromDbSession)
}
export async function fetchSessionList(): Promise<SessionItem[]> {
  const uid = authUserId
  if (!uid) throw new Error('not-logged-in')
  const { data, error } = await supabase.from('session_list').select('*').eq('user_id', uid)
  if (error) throw error
  return data as DbSessionItem[]
}

// push helpers (dipakai di store.tsx tanpa await agar tidak block render)
// sekarang dengan offline queue: kalau offline/network fail -> enqueue, nanti auto-flush pas online
// tamu (belum login): no-op, data hanya di localStorage sampai user masuk
export const pushTaskUpsert = (task: Task): void => {
  const uid = authUserId
  if (!uid) return
  if (!navigator.onLine) {
    enqueue({ type: 'upsert_task', task })
    return
  }
  void (async (): Promise<void> => {
    try {
      const { error } = await supabase.from('tasks').upsert(toDbTask(task, uid), { onConflict: 'id' })
      if (error) {
        if (isNetworkError(error)) enqueue({ type: 'upsert_task', task })
        else logErr('upsert task', error)
      }
    } catch (e) {
      if (isNetworkError(e)) enqueue({ type: 'upsert_task', task })
      else logErr('upsert task', e)
    }
  })()
}
export const pushTaskDelete = (id: string): void => {
  const uid = authUserId
  if (!uid) return
  if (!navigator.onLine) {
    enqueue({ type: 'delete_task', id })
    return
  }
  void (async (): Promise<void> => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', uid)
      if (error) {
        if (isNetworkError(error)) enqueue({ type: 'delete_task', id })
        else logErr('delete task', error)
      }
    } catch (e) {
      if (isNetworkError(e)) enqueue({ type: 'delete_task', id })
      else logErr('delete task', e)
    }
  })()
}
export const pushTasksBulkUpsert = (tasks: Task[]): void => {
  const uid = authUserId
  if (!uid || tasks.length === 0) return
  if (!navigator.onLine) {
    for (const t of tasks) enqueue({ type: 'upsert_task', task: t })
    return
  }
  void (async (): Promise<void> => {
    try {
      const { error } = await supabase.from('tasks').upsert(tasks.map((t) => toDbTask(t, uid)), { onConflict: 'id' })
      if (error) {
        if (isNetworkError(error)) for (const t of tasks) enqueue({ type: 'upsert_task', task: t })
        else logErr('bulk upsert tasks', error)
      }
    } catch (e) {
      if (isNetworkError(e)) for (const t of tasks) enqueue({ type: 'upsert_task', task: t })
      else logErr('bulk upsert tasks', e)
    }
  })()
}
export const pushSessionUpsert = (s: FocusSession): void => {
  const uid = authUserId
  if (!uid) return
  if (!navigator.onLine) {
    enqueue({ type: 'upsert_session', session: s })
    return
  }
  void (async (): Promise<void> => {
    try {
      const { error } = await supabase.from('sessions').upsert(toDbSession(s, uid), { onConflict: 'id' })
      if (error) {
        if (isNetworkError(error)) enqueue({ type: 'upsert_session', session: s })
        else logErr('upsert session', error)
      }
    } catch (e) {
      if (isNetworkError(e)) enqueue({ type: 'upsert_session', session: s })
      else logErr('upsert session', e)
    }
  })()
}
export const pushSessionDelete = (id: string): void => {
  const uid = authUserId
  if (!uid) return
  if (!navigator.onLine) {
    enqueue({ type: 'delete_session', id })
    return
  }
  void (async (): Promise<void> => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', id).eq('user_id', uid)
      if (error) {
        if (isNetworkError(error)) enqueue({ type: 'delete_session', id })
        else logErr('delete session', error)
      }
    } catch (e) {
      if (isNetworkError(e)) enqueue({ type: 'delete_session', id })
      else logErr('delete session', e)
    }
  })()
}
export const pushSessionsClear = (): void => {
  const uid = authUserId
  if (!uid) return
  if (!navigator.onLine) {
    enqueue({ type: 'clear_sessions' })
    return
  }
  void (async (): Promise<void> => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('user_id', uid)
      if (error) {
        if (isNetworkError(error)) enqueue({ type: 'clear_sessions' })
        else logErr('clear sessions', error)
      }
    } catch (e) {
      if (isNetworkError(e)) enqueue({ type: 'clear_sessions' })
      else logErr('clear sessions', e)
    }
  })()
}
export const pushSessionItemUpsert = (item: SessionItem): void => {
  const uid = authUserId
  if (!uid) return
  if (!navigator.onLine) {
    enqueue({ type: 'upsert_session_list', item })
    return
  }
  void (async (): Promise<void> => {
    try {
      const { error } = await supabase.from('session_list').upsert({ ...item, user_id: uid }, { onConflict: 'id' })
      if (error) {
        if (isNetworkError(error)) enqueue({ type: 'upsert_session_list', item })
        else logErr('upsert session_list', error)
      }
    } catch (e) {
      if (isNetworkError(e)) enqueue({ type: 'upsert_session_list', item })
      else logErr('upsert session_list', e)
    }
  })()
}
export const pushSessionItemDelete = (id: string): void => {
  const uid = authUserId
  if (!uid) return
  if (!navigator.onLine) {
    enqueue({ type: 'delete_session_list', id })
    return
  }
  void (async (): Promise<void> => {
    try {
      const { error } = await supabase.from('session_list').delete().eq('id', id).eq('user_id', uid)
      if (error) {
        if (isNetworkError(error)) enqueue({ type: 'delete_session_list', id })
        else logErr('delete session_list', error)
      }
    } catch (e) {
      if (isNetworkError(e)) enqueue({ type: 'delete_session_list', id })
      else logErr('delete session_list', e)
    }
  })()
}

// --- MIGRASI: pindahin semua localStorage -> Supabase (jalanin sekali di DevTools) ---
export async function migrateLocalStorageToSupabase(): Promise<{
  tasks: number
  sessions: number
  sessionList: number
  errors: string[]
}> {
  const errors: string[] = []
  let tasksCount = 0
  let sessionsCount = 0
  let listCount = 0
  const uid = authUserId
  if (!uid) {
    return { tasks: 0, sessions: 0, sessionList: 0, errors: ['login dulu sebelum migrasi'] }
  }
  try {
    const rawTasks = localStorage.getItem('disiplin.tasks')
    if (rawTasks) {
      const tasks = JSON.parse(rawTasks) as Task[]
      if (tasks.length > 0) {
        const { error } = await supabase.from('tasks').upsert(tasks.map((t) => toDbTask(t, uid)), { onConflict: 'id' })
        if (error) errors.push(`tasks: ${error.message}`)
        else tasksCount = tasks.length
      }
    }
  } catch (e) {
    errors.push(`tasks parse: ${e instanceof Error ? e.message : String(e)}`)
  }
  try {
    const rawSessions = localStorage.getItem('disiplin.sessions')
    if (rawSessions) {
      const sessions = JSON.parse(rawSessions) as FocusSession[]
      // migrasi minutes -> seconds kalau masih ada data lama
      const normalized = sessions.map((s) => {
        const anyS = s as unknown as { minutes?: number; seconds?: number }
        if (typeof anyS.seconds !== 'number' && typeof anyS.minutes === 'number') {
          return { ...s, seconds: Math.round(anyS.minutes * 60) }
        }
        return s
      })
      if (normalized.length > 0) {
        // batch 500 biar ga kena limit
        for (let i = 0; i < normalized.length; i += 500) {
          const chunk = normalized.slice(i, i + 500)
          const { error } = await supabase.from('sessions').upsert(chunk.map((s) => toDbSession(s, uid)), { onConflict: 'id' })
          if (error) errors.push(`sessions chunk ${i}: ${error.message}`)
          else sessionsCount += chunk.length
        }
      }
    }
  } catch (e) {
    errors.push(`sessions parse: ${e instanceof Error ? e.message : String(e)}`)
  }
  try {
    const rawList = localStorage.getItem('disiplin.sessionList')
    if (rawList) {
      const list = JSON.parse(rawList) as SessionItem[]
      if (list.length > 0) {
        const { error } = await supabase.from('session_list').upsert(list.map((it) => ({ ...it, user_id: uid })), { onConflict: 'id' })
        if (error) errors.push(`session_list: ${error.message}`)
        else listCount = list.length
      }
    } else {
      // fallback: generate dari sessions kalau sessionList belum ada
      const rawSessions = localStorage.getItem('disiplin.sessions')
      if (rawSessions) {
        const sessions = JSON.parse(rawSessions) as FocusSession[]
        const titles = new Set<string>()
        const list: SessionItem[] = []
        for (const s of sessions) if (s.taskTitle && !titles.has(s.taskTitle)) { titles.add(s.taskTitle); list.push({ id: s.taskTitle, title: s.taskTitle }) }
        if (list.length > 0) {
          const { error } = await supabase.from('session_list').upsert(list.map((it) => ({ ...it, user_id: uid })), { onConflict: 'id' })
          if (error) errors.push(`session_list fallback: ${error.message}`)
          else listCount = list.length
        }
      }
    }
  } catch (e) {
    errors.push(`sessionList parse: ${e instanceof Error ? e.message : String(e)}`)
  }
  return { tasks: tasksCount, sessions: sessionsCount, sessionList: listCount, errors }
}

// expose ke window biar bisa dipanggil manual di DevTools: migrateToSupabase()
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).migrateToSupabase = migrateLocalStorageToSupabase
  ;(window as unknown as Record<string, unknown>).supabase = supabase
  ;(window as unknown as Record<string, unknown>).flushPending = flushPending
  ;(window as unknown as Record<string, unknown>).getPendingCount = getPendingCount
}

// helper buat test koneksi: panggil di console atau di component
export async function testSupabaseConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    // coba hit REST endpoint via supabase client (ambil 1 row dari tabel apapun, atau cuma cek auth)
    // kalau belum punya tabel, ini akan error "relation does not exist" tapi tetap berarti konek
    const { error } = await supabase.from('_connection_test_').select('*').limit(1)
    if (error) {
      // 42P01 = undefined_table -> berarti koneksi OK tapi tabel belum ada (wajar)
      if (error.code === '42P01') return { ok: true }
      // invalid API key
      if (error.message.includes('Invalid API key') || error.message.includes('API key')) {
        return { ok: false, error: 'Invalid API key - cek VITE_SUPABASE_ANON_KEY di .env' }
      }
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
