import type { ViewId } from '../types'
import { HistoryIcon, StatsIcon, TasksIcon, TimerIcon } from './icons'

interface BottomNavProps {
  active: ViewId
  onChange: (v: ViewId) => void
}

const items: { id: ViewId; label: string; Icon: (p: { size?: number }) => React.JSX.Element }[] = [
  { id: 'timer', label: 'Fokus', Icon: TimerIcon },
  { id: 'tasks', label: 'Tugas', Icon: TasksIcon },
  { id: 'history', label: 'Riwayat', Icon: HistoryIcon },
  { id: 'stats', label: 'Statistik', Icon: StatsIcon }
]

export function BottomNav({ active, onChange }: BottomNavProps): React.JSX.Element {
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {items.map((it) => {
        const Icon = it.Icon
        const isActive = active === it.id
        return (
          <button
            key={it.id}
            type="button"
            className={`bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(it.id)}
          >
            <span className="bottom-nav__icon">
              <Icon size={20} />
            </span>
            <span className="bottom-nav__label">{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
