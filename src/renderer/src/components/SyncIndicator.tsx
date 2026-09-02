import { useEffect, useState } from 'react'
import { flushPending, getPendingCount } from '../lib/supabase'

export function SyncIndicator(): React.JSX.Element {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [pending, setPending] = useState<number>(() => getPendingCount())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const onOnline = (): void => setIsOnline(true)
    const onOffline = (): void => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setPending(getPendingCount()), 1000)
    const onStorage = (e: StorageEvent): void => {
      if (e.key === 'disiplin.pendingSync') setPending(getPendingCount())
    }
    window.addEventListener('storage', onStorage)
    // juga cek saat fokus window (habis enqueue di tab yang sama storage event ga fire)
    const onFocus = (): void => setPending(getPendingCount())
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const handleClick = (): void => {
    if (!isOnline) return
    if (pending === 0) return
    setSyncing(true)
    void flushPending()
      .then(() => setPending(getPendingCount()))
      .finally(() => setSyncing(false))
  }

  let dotColor = '#22c55e' // green synced
  let label = 'Tersinkron'
  if (!isOnline) {
    dotColor = '#ef4444'
    label = pending > 0 ? `Offline • ${pending} pending` : 'Offline'
  } else if (syncing) {
    dotColor = '#eab308'
    label = 'Menyinkronkan...'
  } else if (pending > 0) {
    dotColor = '#eab308'
    label = `${pending} pending`
  }

  const clickable = isOnline && pending > 0 && !syncing

  return (
    <button
      type="button"
      className="sync-indicator"
      onClick={handleClick}
      disabled={!clickable}
      title={clickable ? 'Klik untuk sync sekarang' : label}
      aria-label={label}
    >
      <span className="sync-indicator__dot" style={{ background: dotColor }} />
      <span className="sync-indicator__label">{label}</span>
    </button>
  )
}
