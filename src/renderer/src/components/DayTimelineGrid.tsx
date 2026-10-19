import { useMemo } from 'react'
import { useStore } from '../lib/storeContext'
import type { FocusSession } from '../types'

const SLOT_MS = 10 * 60_000 // 10 menit per sel
const ROWS = 24 // 24 jam
const COLS = 6 // 6 kolom x 10 menit
const DAY_MS = 24 * 60 * 60 * 1000
const FIVE_AM = 5 * 60 * 60 * 1000

/** Satu potongan isi di dalam sel: posisi kiri & lebar dalam persen (0-100). */
interface TlSeg {
  left: number
  width: number
}

interface TlCell {
  segs: TlSeg[]
}

interface TlRow {
  label: string
  cells: TlCell[]
}

/** Label jam 12 jam tanpa AM/PM: 5,6,...,11,12,1,...,11,12,1,...,4 */
function hourLabel(row: number): string {
  const h = (((row + 5) % 24) + 24) % 24
  return `${h % 12 === 0 ? 12 : h % 12}`
}

/**
 * Grid timeline 24 jam (05:00 – 05:00 besok) per 10 menit.
 * Setiap baris = 1 label jam + 6 sel (selalu 6, termasuk kosong).
 * Perhitungan menit per sel: awal isi = max(start, awal sel),
 * akhir isi = min(end, akhir sel); left & width = persentase relatif
 * terhadap sel itu sendiri. Sesi lintas batas sel dipecah per sel.
 */
export function DayTimelineGrid({ dayStart }: { dayStart: number }): React.JSX.Element {
  const { sessions } = useStore()

  const rows = useMemo<TlRow[]>(() => {
    const windowStart = dayStart + FIVE_AM
    const windowEnd = windowStart + DAY_MS

    // Kumpulkan interval sesi yang terpotong (clip) ke jendela hari itu
    const intervals: [number, number][] = []
    for (const s of sessions) {
      if (!(s.seconds > 0)) continue
      const spanMs = s.completedAt - s.startedAt
      let a: number
      let b: number
      if (!(spanMs > 0)) {
        // Data tanpa rentang waktu: taruh satu kotak 10 menit di completedAt
        a = s.completedAt
        b = s.completedAt + SLOT_MS
      } else {
        a = s.startedAt
        b = s.completedAt
      }
      a = Math.max(a, windowStart)
      b = Math.min(b, windowEnd)
      if (b > a) intervals.push([a, b])
    }

    const size = ROWS * COLS
    const cells: TlCell[] = []
    for (let i = 0; i < size; i++) {
      const cs = windowStart + i * SLOT_MS
      const ce = cs + SLOT_MS
      const segs: TlSeg[] = []
      for (const [iv0, iv1] of intervals) {
        // Interval dipotong ke sel ini — tidak pernah digabung lintas sel
        const a = Math.max(iv0, cs)
        const b = Math.min(iv1, ce)
        if (b > a) {
          segs.push({
            left: ((a - cs) / SLOT_MS) * 100,
            width: ((b - a) / SLOT_MS) * 100
          })
        }
      }
      cells.push({ segs })
    }

    const out: TlRow[] = []
    for (let r = 0; r < ROWS; r++) {
      out.push({ label: hourLabel(r), cells: cells.slice(r * COLS, (r + 1) * COLS) })
    }
    return out
  }, [sessions, dayStart])

  return (
    <div className="day-grid" role="img" aria-label="Grid timeline aktivitas harian per 10 menit">
      {rows.map((row, r) => (
        <div key={r} className="tl-row">
          <span className="tl-hour">{row.label}</span>
          {row.cells.map((cell, c) => (
            <span key={c} className="tl-cell">
              {cell.segs.map((seg, k) => (
                <span
                  key={k}
                  className="tl-cell__fill"
                  style={{ left: `${seg.left.toFixed(2)}%`, width: `${seg.width.toFixed(2)}%` }}
                />
              ))}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
