import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearLocalUserData, setAuthUserId, supabase } from './supabase'
import { AuthContext, type AuthResult, type AuthState } from './authContext'

/** Terjemahkan error Supabase Auth ke Bahasa Indonesia yang ramah. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email atau password salah.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Email sudah terdaftar. Silakan masuk.'
  if (m.includes('email not confirmed')) return 'Email belum diverifikasi. Cek inbox kamu.'
  if (m.includes('password should be at least')) return 'Password minimal 6 karakter.'
  if (m.includes('invalid email') || m.includes('email address') || m.includes('is invalid'))
    return 'Alamat email tidak valid.'
  if (m.includes('signup is disabled') || m.includes('signups not allowed'))
    return 'Pendaftaran akun sedang dimatikan.'
  if (m.includes('too many requests') || m.includes('rate limit') || m.includes('email rate limit'))
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  if (m.includes('network') || m.includes('fetch failed') || m.includes('failed to fetch'))
    return 'Gagal terhubung. Periksa koneksi internet.'
  return message
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<AuthState['session']>(null)
  const [user, setUser] = useState<AuthState['user']>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
        setAuthUserId(data.session?.user?.id ?? null)
      } catch (e) {
        console.warn('[auth] getSession failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setAuthUserId(nextSession?.user?.id ?? null)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      session,
      loading,
      signUp: async (email, password): Promise<AuthResult> => {
        try {
          const { data, error } = await supabase.auth.signUp({ email, password })
          if (error) return { ok: false, error: friendlyAuthError(error.message) }
          // Kalau "Confirm email" mati di dashboard, session langsung ada -> langsung masuk.
          // Kalau hidup, session null -> user harus verifikasi via email dulu.
          if (data.session) return { ok: true }
          return { ok: true, needsConfirmation: true }
        } catch (e) {
          return { ok: false, error: friendlyAuthError(e instanceof Error ? e.message : String(e)) }
        }
      },
      signIn: async (email, password): Promise<AuthResult> => {
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) return { ok: false, error: friendlyAuthError(error.message) }
          return { ok: true }
        } catch (e) {
          return { ok: false, error: friendlyAuthError(e instanceof Error ? e.message : String(e)) }
        }
      },
      signOut: async (): Promise<void> => {
        // Hapus dulu sisa data lokal milik akun ini sebelum session dilepas,
        // biar tidak sempat kebaca lagi setelah logout (oleh tamu / akun lain).
        clearLocalUserData()
        await supabase.auth.signOut()
      }
    }),
    [user, session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
