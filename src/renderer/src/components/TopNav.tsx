import { useEffect, useRef, useState } from 'react'
import type { ViewId } from '../types'
import { useAuth } from '../lib/authContext'
import { AuthModal } from './AuthModal'
import { DatePicker } from './DatePicker'
import { HistoryIcon, StatsIcon, TasksIcon, TimerIcon, UserIcon } from './icons'
import { SyncIndicator } from './SyncIndicator'

interface TopNavProps {
  active: ViewId
  onChange: (view: ViewId) => void
}

const LS_DDAY = 'disiplin_dday'

const items: { id: ViewId; label: string; Icon: (p: { size?: number }) => React.JSX.Element }[] = [
  { id: 'timer', label: 'Focus', Icon: TimerIcon },
  { id: 'tasks', label: 'Tugas', Icon: TasksIcon },
  { id: 'history', label: 'Riwayat', Icon: HistoryIcon },
  { id: 'stats', label: 'Statistik', Icon: StatsIcon }
]

function daysUntil(target: Date): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  return Math.round((end - start) / 86_400_000)
}

function loadDDay(): string | null {
  try {
    return localStorage.getItem(LS_DDAY)
  } catch {
    return null
  }
}

function saveDDay(val: string | null): void {
  try {
    if (val) localStorage.setItem(LS_DDAY, val)
    else localStorage.removeItem(LS_DDAY)
  } catch {
    /* empty */
  }
}

export function TopNav({ active, onChange }: TopNavProps): React.JSX.Element {
  const [dday, setDday] = useState<string | null>(loadDDay)
  const [open, setOpen] = useState(false)
  const { user, loading: authLoading, signOut } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // tutup menu akun saat klik di luar
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const ddayTs = dday ? new Date(dday + 'T00:00:00').getTime() : null
  const diff = ddayTs !== null ? daysUntil(new Date(ddayTs)) : null

  const handlePick = (date: Date): void => {
    const val = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    setDday(val)
    saveDDay(val)
    setOpen(false)
  }

  return (
    <header className="topnav">
      <div className="brand">
        <span className="brand__dot" />
        <span className="brand__name">Disiplin</span>
      </div>
      <nav className="nav">
        {items.map((item) => {
          const Icon = item.Icon
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item${active === item.id ? ' nav-item--active' : ''}`}
              onClick={() => onChange(item.id)}
              aria-current={active === item.id ? 'page' : undefined}
            >
              <span className="nav-item__icon">
                <Icon size={16} />
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="topnav__right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SyncIndicator />
        {!authLoading &&
          (user ? (
            <div className="account-wrap" ref={menuRef}>
              <button
                type="button"
                className="account-avatar"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title={user.email ?? 'Akun'}
              >
                {(user.email?.trim()?.[0] ?? '?').toUpperCase()}
              </button>
              {menuOpen && (
                <div className="account-menu" role="menu">
                  <p className="account-menu__email" title={user.email ?? ''}>
                    {user.email}
                  </p>
                  <button
                    type="button"
                    className="cta cta--danger account-menu__logout"
                    disabled={signingOut}
                    onClick={() => {
                      setSigningOut(true)
                      void signOut().finally(() => {
                        setSigningOut(false)
                        setMenuOpen(false)
                      })
                    }}
                  >
                    {signingOut ? 'Keluar...' : 'Keluar →'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="account-btn" onClick={() => setAuthOpen(true)}>
              <UserIcon size={14} />
              Masuk
            </button>
          ))}
        <button type="button" className="topnav__dday" onClick={() => setOpen((o) => !o)}>
          {diff !== null ? (
            diff > 0 ? (
              <>D-{diff}</>
            ) : diff === 0 ? (
              <>Hari ini</>
            ) : (
              <>D+{Math.abs(diff)}</>
            )
          ) : (
            <>Atur D-Day</>
          )}
        </button>

        {open && (
          <div className="topnav__dday-popup">
            <DatePicker
              value={ddayTs !== null ? new Date(ddayTs) : new Date()}
              onChange={handlePick}
            />
            {dday && (
              <button
                type="button"
                className="topnav__dday-clear"
                onClick={() => {
                  setDday(null)
                  saveDDay(null)
                  setOpen(false)
                }}
              >
                Hapus
              </button>
            )}
          </div>
        )}
      </div>
      {authOpen && <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />}
    </header>
  )
}
