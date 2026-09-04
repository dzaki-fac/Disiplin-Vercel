import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../lib/authContext'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

type Mode = 'signin' | 'signup'

export function AuthModal({ open, onClose }: AuthModalProps): React.JSX.Element | null {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // NOTE: form di-reset via remount — TopNav hanya mount modal saat authOpen true,
  // jadi initial state di bawah selalu fresh setiap modal dibuka.

  // tutup pakai Escape + kunci scroll latar saat modal terbuka
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const switchMode = (m: Mode): void => {
    setMode(m)
    setError(null)
    setNotice(null)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const em = email.trim()
    if (!em || !password) {
      setError('Isi email dan password dulu.')
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = mode === 'signin' ? await signIn(em, password) : await signUp(em, password)
      if (!res.ok) {
        setError(res.error ?? 'Gagal. Coba lagi.')
        return
      }
      if (res.needsConfirmation) {
        setNotice('Akun dibuat! Cek inbox email kamu untuk verifikasi, lalu masuk.')
        setMode('signin')
        setPassword('')
        return
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  // Portal ke document.body: modal harus fixed terhadap viewport.
  // Sebelumnya modal di-render di dalam <header class="topnav"> yang punya
  // backdrop-filter, sehingga position:fixed overlay terkungkung di area
  // header (tidak di tengah layar dan redupnya hanya seluas header).
  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="session-edit auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'signin' ? 'Masuk akun' : 'Daftar akun'}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="session-edit__title">{mode === 'signin' ? 'Masuk' : 'Daftar akun'}</h2>
        <p className="auth-sub">
          {mode === 'signin'
            ? 'Masuk untuk sync data ke semua perangkat.'
            : 'Buat akun untuk sync data ke semua perangkat.'}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Pilih masuk atau daftar">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`auth-tab${mode === 'signin' ? ' is-active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            Masuk
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-tab${mode === 'signup' ? ' is-active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Daftar
          </button>
        </div>

        <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="session-edit__label">
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="session-edit__label">
            Password
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="auth-notice" role="status">
              {notice}
            </p>
          )}

          <div className="session-edit__actions">
            <button type="button" className="cta cta--ghost" onClick={onClose} disabled={busy}>
              Batal
            </button>
            <button type="submit" className="cta cta--primary" disabled={busy}>
              {busy ? 'Tunggu...' : mode === 'signin' ? 'Masuk →' : 'Daftar →'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
