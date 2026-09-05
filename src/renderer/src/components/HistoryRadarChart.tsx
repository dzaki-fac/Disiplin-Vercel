import { useMemo } from 'react'
import { useStore } from '../lib/storeContext'
import { fmtMinutes, startOfDay } from '../lib/utils'

// Pie 6 segitiga: tiap segitiga mewakili satu bagian 4 jam sehari
// (00–04, 04–08, …, 20–24). Panjang segitiga dari pusat (linear)
// menunjukkan banyaknya menit fokus HARI INI di blok itu.
const BLOCK_HOURS = 4
const DAY_MS = 24 * 3600 * 1000
const BLOCK_LABELS = ['00–04', '04–08', '08–12', '12–16', '16–20', '20–24'] as const
const COX_SIZE = 232
const COX_CENTER = COX_SIZE / 2
const COX_MAX_R = 84
const COX_MIN_R = 12

// Skala warna sama dengan heatmap di tab Statistik
// (.heatmap__cell--0..4): makin pekat = makin banyak fokus.
const LEVEL_COLORS = ['var(--fog)', '#f8d7c6', '#eda976', '#e26b33', 'var(--ember)']

/** Level intensitas per blok 4 jam berdasarkan menit fokus. */
function levelForBlock(minutes: number): number {
  if (minutes <= 0) return 0
  if (minutes < 30) return 1
  if (minutes < 60) return 2
  if (minutes < 120) return 3
  return 4
}

interface RadarDatum {
  block: string
  minutes: number
}

/**
 * Bagi `s.seconds` (sumber kebenaran yang sama dengan daftar Riwayat &
 * Statistik) ke blok-blok 4 jam yang dilewati sesi, proporsional
 * terhadap overlap waktu. Timestamp hanya menentukan posisi blok.
 */
function distributeByBlock(
  seconds: number,
  startedAt: number,
  completedAt: number,
  windowStart: number,
  windowEnd: number,
  out: number[]
): boolean {
  if (!(seconds > 0)) return false
  const a = Math.max(startedAt, windowStart)
  const b = Math.min(completedAt, windowEnd)
  if (b <= a) return false
  const spanMs = completedAt - startedAt
  if (!(spanMs > 0)) {
    // Data tanpa rentang waktu: taruh semua di blok completedAt
    const block = Math.min(5, Math.floor(new Date(completedAt).getHours() / BLOCK_HOURS))
    out[block] += seconds / 60
    return true
  }
  let t = a
  while (t < b) {
    const d = new Date(t)
    const block = Math.floor(d.getHours() / BLOCK_HOURS)
    const boundary = new Date(d)
    boundary.setHours((block + 1) * BLOCK_HOURS, 0, 0, 0)
    const chunkEnd = Math.min(b, boundary.getTime())
    out[block] += ((chunkEnd - t) / spanMs) * (seconds / 60)
    t = chunkEnd
  }
  return true
}

/** Ubah sudut (0° = atas, searah jarum jam) jadi koordinat SVG. */
function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** Segitiga blok ke-i: puncak di pusat, alas lurus di radius r. */
function trianglePath(cx: number, cy: number, r: number, index: number): string {
  const s = polar(cx, cy, r, index * 60)
  const e = polar(cx, cy, r, (index + 1) * 60)
  return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} L ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`
}

export function HistoryRadarChart(): React.JSX.Element {
  const { sessions } = useStore()

  const { data, totalMinutes, count, maxMinutes } = useMemo(() => {
    // Hanya sesi hari ini (00.00–24.00) yang dihitung
    const windowStart = startOfDay(new Date().getTime())
    const windowEnd = windowStart + DAY_MS
    const byBlock = [0, 0, 0, 0, 0, 0]
    let winCount = 0
    for (const s of sessions) {
      if (
        distributeByBlock(s.seconds, s.startedAt, s.completedAt, windowStart, windowEnd, byBlock)
      ) {
        winCount += 1
      }
    }
    const chartData: RadarDatum[] = BLOCK_LABELS.map((block, i) => ({
      block,
      minutes: Math.round(byBlock[i] ?? 0)
    }))
    return {
      data: chartData,
      totalMinutes: chartData.reduce((acc, d) => acc + d.minutes, 0),
      count: winCount,
      maxMinutes: Math.max(0, ...chartData.map((d) => d.minutes))
    }
  }, [sessions])

  if (sessions.length === 0) {
    return <p className="panel__empty">Belum ada sesi.</p>
  }

  return (
    <div className="history-radar">
      <div
        className="history-radar__chart ring"
        role="img"
        aria-label={`Distribusi fokus per 4 jam: ${fmtMinutes(totalMinutes)}, ${String(count)} sesi`}
      >
        <svg viewBox={`0 0 ${String(COX_SIZE)} ${String(COX_SIZE)}`} aria-hidden="true">
          {/* trek tiap blok */}
          {data.map((d, i) => (
            <path
              key={`track-${d.block}`}
              d={trianglePath(COX_CENTER, COX_CENTER, COX_MAX_R, i)}
              fill="var(--fog)"
            />
          ))}
          {/* nilai tiap blok */}
          {data.map((d, i) => {
            if (d.minutes <= 0 || maxMinutes <= 0) return null
            const r = Math.max(COX_MIN_R, (COX_MAX_R * d.minutes) / maxMinutes)
            return (
              <path
                key={d.block}
                d={trianglePath(COX_CENTER, COX_CENTER, r, i)}
                fill={LEVEL_COLORS[levelForBlock(d.minutes)] ?? 'var(--ember)'}
              >
                <title>{`${d.block} · ${fmtMinutes(d.minutes)}`}</title>
              </path>
            )
          })}
          {/* label tiap blok */}
          {data.map((d, i) => {
            const p = polar(COX_CENTER, COX_CENTER, COX_MAX_R + 18, i * 60 + 30)
            return (
              <text
                key={`label-${d.block}`}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10.5"
                fill="var(--slate)"
              >
                {d.block}
              </text>
            )
          })}
        </svg>
        <div className="ring__content">
          <span className="history-radar__total">{fmtMinutes(totalMinutes)}</span>
          <span className="history-radar__sub">{count} sesi</span>
        </div>
      </div>
    </div>
  )
}
