import { useMemo, useRef, useState } from 'react'
import type { FocusSession } from '../types'
import { useStore } from '../lib/storeContext'
import { AnimatedInView } from './AnimatedInView'
import { dayKey, fmtDay, fmtDuration, fmtTime, isToday, startOfDay } from '../lib/utils'
import { CustomSelect } from './CustomSelect'
import { DayTimelineGrid } from './DayTimelineGrid'
import { DatePicker } from './DatePicker'
import { HistoryRadarChart } from './HistoryRadarChart'
import { ChevronLeftIcon, ChevronRightIcon, ExportIcon, ImportIcon, PlusIcon } from './icons'

const CHART_DAY_MS = 24 * 3600 * 1000

function toTimeValue(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function secondsOfDay(v: string): number {
  const clean = v.replace(/\./g, ':').trim()
  const parts = clean.split(':').map(Number)
  const h = Math.min(23, Math.max(0, parts[0] || 0))
  const m = Math.min(59, Math.max(0, parts[1] || 0))
  const s = Math.min(59, Math.max(0, parts[2] || 0))
  return h * 3600 + m * 60 + s
}

function normalizeTimeValue(v: string): string {
  const clean = v.replace(/\./g, ':').trim()
  if (!clean) return '00:00:00'
  const parts = clean.split(':').map((p) => Number(p.replace(/\D/g, '')))
  const h = Math.min(23, Math.max(0, Number.isNaN(parts[0]) ? 0 : parts[0]))
  const m = Math.min(59, Math.max(0, Number.isNaN(parts[1]) ? 0 : (parts[1] ?? 0)))
  const s = Math.min(59, Math.max(0, Number.isNaN(parts[2]) ? 0 : (parts[2] ?? 0)))
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const MAX_DAY_SEC = 23 * 3600 + 59 * 60 + 59

/** Detik-hari -> string HH:MM:SS, di-box maksimum 23:59:59. */
function fmtSecondsOfDay(total: number): string {
  const s = clamp2(total, MAX_DAY_SEC)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Saat jam mulai digeser (maju/mundur) durasi dipertahankan:
 *  jam selesai ikut bergeser sepanjang durasi lama,
 *  di-box maksimum 23:59:59. Durasi hanya berubah bila yang
 *  diedit adalah jam selesai. */
function shiftEndByDuration(newStart: string, oldStart: string, end: string): string {
  const dur = Math.max(0, secondsOfDay(end) - secondsOfDay(oldStart))
  return fmtSecondsOfDay(secondsOfDay(newStart) + dur)
}

const clamp2 = (n: number, max: number): number => Math.min(max, Math.max(0, n))

/** Wadah waktu bersegmen (HH : MM : SS) — nilai selalu ada:
 *  sel tidak pernah kosong, Backspace tidak menghapus segmen (kursor
 *  mundur ke sel sebelumnya), angka dampai ke batas (23 / 59),
 *  ↑/↓ memutar nilai, dua digit auto-lompat ke sel berikutnya. */
function TimeInput({
  value,
  onChange,
  label
}: {
  value: string
  onChange: (v: string) => void
  label: string
}): React.JSX.Element {
  const parts = useMemo((): number[] => {
    const clean = value.replace(/\D+/g, ':')
    const p = clean.split(':').filter(Boolean).map(Number)
    return [clamp2(p[0] || 0, 23), clamp2(p[1] || 0, 59), clamp2(p[2] || 0, 59)]
  }, [value])

  const cells = useRef<(HTMLInputElement | null)[]>([])
  // Digit yang sedang diketik di sel aktif; hilang saat blur sehingga
  // sel selalu kembali menampilkan nilai (tidak pernah kosong)
  const [draft, setDraft] = useState<{ i: number; digits: string } | null>(null)

  const pad = (n: number): string => String(n).padStart(2, '0')
  const fmt = (p: number[]): string => `${pad(p[0])}:${pad(p[1])}:${pad(p[2])}`

  const commitAt = (i: number, n: number): void => {
    const max = i === 0 ? 23 : 59
    const next = [...parts]
    next[i] = clamp2(n, max)
    onChange(fmt(next))
  }

  const step = (i: number, dir: 1 | -1): void => {
    const max = i === 0 ? 23 : 59
    const n = parts[i] + dir
    setDraft(null)
    commitAt(i, n < 0 ? max : n > max ? 0 : n)
  }

  const focusCell = (i: number): void => {
    const el = cells.current[Math.min(2, Math.max(0, i))]
    if (el) el.focus()
  }

  const onCellBody = (i: number, raw: string): void => {
    const digits = raw.replace(/\D/g, '')
    // Tidak bisa dihapus: input kosong diabaikan, nilai segmen tetap
    if (!digits) return
    // DOM input sudah memuat digit-digit yang diketik (draft tampil di
    // sel aktif), cukup ambil 2 digit terakhirlah
    const typed = digits.slice(-2)
    setDraft({ i, digits: typed })
    if (typed.length === 2) {
      // Dua digit cukup: commit di sel ini, tetap terfokus (dengan isi
      // terseleksi) sehingga bisa lanjut dikoreksi atau pindah manual
      setDraft(null)
      commitAt(i, Number(typed))
      const el = cells.current[i]
      if (el) el.select()
    }
  }

  const onCellBlur = (i: number): void => {
    if (draft && draft.i === i) {
      setDraft(null)
      commitAt(i, Number(draft.digits))
    }
  }

  const onCellKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      step(i, 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      step(i, -1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setDraft(null)
      focusCell(i - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (draft && draft.i === i && draft.digits.length === 2) {
        const num = Number(draft.digits)
        setDraft(null)
        commitAt(i, num)
      }
      focusCell(i + 1)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      focusCell(i - 1)
    }
  }

  const shown = (i: number): string =>
    draft && draft.i === i ? draft.digits : pad(parts[i])

  const seg = (i: 0 | 1 | 2, aria: string): React.JSX.Element => (
    <input
      ref={(el) => {
        cells.current[i] = el
      }}
      className="time-input__cell"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={`${label} ${aria}`}
      value={shown(i)}
      onFocus={(e) => e.target.select()}
      onWheel={(e) => e.currentTarget.blur()}
      onChange={(e) => onCellBody(i, e.target.value)}
      onKeyDown={(e) => onCellKey(i, e)}
      onBlur={() => onCellBlur(i)}
    />
  )

  return (
    <span className="time-input" role="group" aria-label={label} title={label}>
      {seg(0, 'jam')}
      <span className="time-input__sep" aria-hidden="true">
        :
      </span>
      {seg(1, 'menit')}
      <span className="time-input__sep" aria-hidden="true">
        :
      </span>
      {seg(2, 'detik')}
    </span>
  )
}

function EditPopup({
  session,
  onSave,
  onCancel
}: {
  session: FocusSession
  onSave: (
    patch: Partial<Pick<FocusSession, 'taskTitle' | 'seconds' | 'startedAt' | 'completedAt'>>
  ) => void
  onCancel: () => void
}): React.JSX.Element {
  const { sessionList } = useStore()
  const [title, setTitle] = useState(session.taskTitle ?? '')
  const [editDate, setEditDate] = useState(() => new Date(session.startedAt))
  const [start, setStart] = useState(toTimeValue(session.startedAt))
  const [end, setEnd] = useState(toTimeValue(session.completedAt))

  const sSec = secondsOfDay(start)
  const eSec = secondsOfDay(end)
  const totalSeconds = Math.max(1, eSec - sSec)

  // Geser jam mulai: durasi dipertahankan — jam selesai ikut maju/mundur
  // sepanjang durasi lama, maksimal 23.59
  const applyStart = (v: string): void => {
    setEnd(shiftEndByDuration(v, start, end))
    setStart(v)
  }

  const commit = (): void => {
    let endNorm = normalizeTimeValue(end)
    if (secondsOfDay(endNorm) < secondsOfDay(start)) endNorm = normalizeTimeValue(start)
    setStart(normalizeTimeValue(start))
    setEnd(endNorm)
    const baseDate = new Date(editDate)
    baseDate.setHours(0, 0, 0, 0)
    const baseTs = baseDate.getTime()
    const startTs = baseTs + secondsOfDay(start) * 1000
    const endTs = baseTs + secondsOfDay(endNorm) * 1000
    const seconds = Math.max(1, Math.round((endTs - startTs) / 1000))
    onSave({ taskTitle: title.trim() || null, seconds, startedAt: startTs, completedAt: endTs })
  }

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <form
        className="session-edit"
        onSubmit={(e) => {
          e.preventDefault()
          commit()
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="session-edit__title">Edit sesi</h3>

        <label className="session-edit__label" htmlFor="session-pick">
          Pilih sesi yang ada
        </label>
        <CustomSelect
          options={[
            { value: '', label: 'Tanpa tugas' },
            ...sessionList.map((s) => ({ value: s.title, label: s.title }))
          ]}
          value={sessionList.some((s) => s.title === title) ? title : ''}
          onChange={(v) => setTitle(v)}
        />

        <label className="session-edit__label" htmlFor="session-title">
          Nama sesi
        </label>
        <input
          id="session-title"
          type="text"
          maxLength={80}
          placeholder="Nama sesi"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="session-edit__label">Tanggal</label>
        <DatePicker value={editDate} onChange={setEditDate} />

        <div className="session-edit__times">
          <span className="session-edit__label">Jam mulai</span>
          <span className="session-edit__label">Jam selesai</span>
          <TimeInput value={start} onChange={applyStart} label="Jam mulai (format 24 jam)" />
          <TimeInput value={end} onChange={setEnd} label="Jam selesai (format 24 jam)" />
        </div>

        <div className="session-edit__footer">
          <p className="session-edit__total">
            Durasi: <strong>{fmtDuration(totalSeconds)}</strong>
          </p>

          <div className="session-edit__actions">
            <button type="submit" className="cta cta--primary">
              Simpan
            </button>
            <button type="button" className="cta cta--ghost" onMouseDown={onCancel}>
              Batal
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function SessionRow({ session }: { session: FocusSession }): React.JSX.Element {
  const { deleteSession, updateSession } = useStore()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <AnimatedInView key={session.id} as="li" className="session-row">
        <span className="session-row__dot" />
        <div className="session-row__body">
          <span className="session-row__title">{session.taskTitle ?? 'Tanpa tugas'}</span>
          <span className="session-row__time">
            {fmtTime(session.startedAt)} – {fmtTime(session.completedAt)}
          </span>
        </div>
        <span className="session-row__minutes">{fmtDuration(session.seconds)}</span>
        <span className="session-row__actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="Edit sesi"
            onClick={() => setEditing(true)}
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            aria-label="Hapus sesi"
            data-sound-none
            onClick={() => setConfirming(true)}
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M8 6V4h8v2m1 0-1 14H8L7 6" />
            </svg>
          </button>
        </span>
      </AnimatedInView>
      {editing && (
        <EditPopup
          session={session}
          onSave={(patch) => {
            updateSession(session.id, patch)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      )}
      {confirming && (
        <div className="modal-overlay" onMouseDown={() => setConfirming(false)}>
          <div className="confirm-dialog" onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="confirm-dialog__title">Hapus sesi ini?</h3>
            <p className="confirm-dialog__text">
              Sesi{' '}
              <strong>{session.taskTitle ?? 'Tanpa tugas'}</strong> ({fmtTime(session.startedAt)} –{' '}
              {fmtTime(session.completedAt)}) akan dihapus permanen dari riwayat.
            </p>
            <div className="confirm-dialog__actions">
              <button
                type="button"
                data-sound-none
                className="cta cta--danger"
                onClick={() => {
                  deleteSession(session.id)
                  setConfirming(false)
                }}
              >
                Hapus
              </button>
              <button
                type="button"
                data-sound-none
                className="cta cta--ghost"
                onMouseDown={() => setConfirming(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function HistoryView(): React.JSX.Element {
  const { sessions, sessionList, exportSessions, importSessions, addManualSession, timer } =
    useStore()
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<number | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualDate, setManualDate] = useState(() => new Date())
  const [manualStart, setManualStart] = useState(() => toTimeValue(Date.now()))
  const [manualEnd, setManualEnd] = useState(() => {
    const d = new Date(Date.now() + 25 * 60_000)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [chartDay, setChartDay] = useState(() => startOfDay(new Date().getTime()))

  // Default dropdown tambah sesi langsung terpilih saat modal dibuka:
  // pakai sesi aktif timer kalau masih ada, kalau tidak pakai sesi pertama.
  const openManual = (): void => {
    if (
      timer.activeSessionTitle &&
      sessionList.some((s) => s.title === timer.activeSessionTitle)
    ) {
      setManualTitle(timer.activeSessionTitle)
    } else if (sessionList.length > 0) {
      setManualTitle(sessionList[0].title)
    } else {
      setManualTitle('')
    }
    setManualOpen(true)
  }

  const isChartToday = chartDay === startOfDay(new Date().getTime())
  const shiftChartDay = (delta: number): void => {
    setChartDay((prev) => prev + delta * CHART_DAY_MS)
  }

  const showNotice = (text: string): void => {
    setNotice(text)
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3000)
  }

  const handleExport = async (): Promise<void> => {
    const res = await exportSessions()
    if (res === 'ok') showNotice('Riwayat sesi berhasil diekspor')
    else if (res === 'error') showNotice('Gagal mengekspor riwayat')
  }

  const handleImport = async (): Promise<void> => {
    const res = await importSessions()
    if (!res) return
    showNotice(res.count > 0 ? `${res.count} sesi diimpor` : 'Tidak ada sesi baru di file tersebut')
  }

  const daySessions = useMemo(() => {
    const day = dayKey(chartDay)
    return sessions
      .filter((s) => dayKey(s.completedAt) === day)
      .sort((a, b) => b.completedAt - a.completedAt)
  }, [sessions, chartDay])

  return (
    <div className="view">
      <header className="view__header view__header--actions">
        <h1>Riwayat Sesi</h1>
        <p className="view__sub">{sessions.length} sesi fokus tercatat</p>
        <div className="view__actions">
          <button
            type="button"
            className="icon-btn icon-btn--bordered"
            aria-label="Export riwayat sesi"
            title="Export riwayat sesi"
            disabled={sessions.length === 0}
            onClick={handleExport}
          >
            <ExportIcon size={16} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--bordered"
            aria-label="Import riwayat sesi"
            title="Import riwayat sesi"
            onClick={handleImport}
          >
            <ImportIcon size={16} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--bordered"
            aria-label="Tambah sesi manual"
            title="Tambah sesi manual"
            onClick={() => {
              if (manualOpen) setManualOpen(false)
              else openManual()
            }}
            data-sound-none
          >
            <PlusIcon size={16} />
          </button>
        </div>
      </header>

      <AnimatedInView as="section" className="panel">
        <div className="panel__head">
          <h2>Pola Harian</h2>
          <div className="panel__head-right">
            <div className="day-nav">
              <button
                type="button"
                className="icon-btn icon-btn--bordered"
                aria-label="Hari sebelumnya"
                title="Hari sebelumnya"
                onClick={() => shiftChartDay(-1)}
              >
                <ChevronLeftIcon size={16} />
              </button>
              <span className="day-nav__label">
                {isChartToday ? 'Hari ini' : fmtDay(chartDay)}
              </span>
              <button
                type="button"
                className="icon-btn icon-btn--bordered"
                aria-label="Hari berikutnya"
                title="Hari berikutnya"
                onClick={() => shiftChartDay(1)}
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="charts-row">
          <HistoryRadarChart dayStart={chartDay} />
          <div className="history-card history-timeline">
            <DayTimelineGrid dayStart={chartDay} />
          </div>
        </div>
      </AnimatedInView>

      {manualOpen && (
        <div className="modal-overlay" onMouseDown={() => setManualOpen(false)}>
          <form
            className="session-edit"
            onSubmit={(e) => {
              e.preventDefault()
              let endNorm = normalizeTimeValue(manualEnd)
              if (secondsOfDay(endNorm) < secondsOfDay(manualStart)) {
                endNorm = normalizeTimeValue(manualStart)
              }
              const startNorm = normalizeTimeValue(manualStart)
              setManualStart(startNorm)
              setManualEnd(endNorm)
              const baseDate = new Date(manualDate)
              baseDate.setHours(0, 0, 0, 0)
              const baseTs = baseDate.getTime()
              const startTs = baseTs + secondsOfDay(startNorm) * 1000
              const endTs = baseTs + secondsOfDay(endNorm) * 1000
              const secs = Math.max(1, Math.round((endTs - startTs) / 1000))
              addManualSession(manualTitle.trim() || null, secs, startTs, endTs - startTs)
              setManualOpen(false)
              setManualTitle('')
              setManualDate(new Date())
              setManualStart(toTimeValue(Date.now()))
              const d2 = new Date(Date.now() + 25 * 60_000)
              setManualEnd(
                `${String(d2.getHours()).padStart(2, '0')}:${String(d2.getMinutes()).padStart(2, '0')}:${String(d2.getSeconds()).padStart(2, '0')}`
              )
              showNotice('Sesi berhasil ditambahkan')
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="session-edit__title">Tambah sesi</h3>

            <label className="session-edit__label" htmlFor="manual-session-pick">
              Pilih sesi
            </label>
            <CustomSelect
              options={[
                { value: '', label: 'Tanpa tugas' },
                ...sessionList.map((s) => ({ value: s.title, label: s.title }))
              ]}
              value={
                manualTitle === '' || sessionList.some((s) => s.title === manualTitle)
                  ? manualTitle
                  : ''
              }
              onChange={(v) => setManualTitle(v)}
            />

            <label className="session-edit__label">Tanggal</label>
            <DatePicker value={manualDate} onChange={setManualDate} />

            <div className="session-edit__times">
              <span className="session-edit__label">Jam mulai</span>
              <span className="session-edit__label">Jam selesai</span>
              <TimeInput
                value={manualStart}
                onChange={(v) => {
                  setManualEnd(shiftEndByDuration(v, manualStart, manualEnd))
                  setManualStart(v)
                }}
                label="Jam mulai (format 24 jam)"
              />
              <TimeInput
                value={manualEnd}
                onChange={setManualEnd}
                label="Jam selesai (format 24 jam)"
              />
            </div>

            <div className="session-edit__footer">
              <p className="session-edit__total">
                Durasi:{' '}
                <strong>
                  {(() => {
                    const diff = secondsOfDay(manualEnd) - secondsOfDay(manualStart)
                    return fmtDuration(Math.max(1, diff))
                  })()}
                </strong>
              </p>

              <div className="session-edit__actions">
                <button type="submit" className="cta cta--primary">
                  Tambah
                </button>
                <button
                  type="button"
                  className="cta cta--ghost"
                  onMouseDown={() => setManualOpen(false)}
                >
                  Batal
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {notice && <p className="history-notice">{notice}</p>}

      {daySessions.length > 0 && (
        <section className="history-group">
          <AnimatedInView className="history-group__head">
            <h2>{isToday(chartDay) ? 'Hari ini' : fmtDay(chartDay)}</h2>
            <span className="history-group__total">
              {fmtDuration(daySessions.reduce((acc, s) => acc + s.seconds, 0))}
            </span>
          </AnimatedInView>
          <ul className="session-list">
            {daySessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        </section>
      )}

      {daySessions.length === 0 && (
        <div className="empty-state">
          <p>{sessions.length === 0 ? 'Belum ada sesi fokus.' : 'Tidak ada sesi tercatat pada hari ini.'}</p>
          <p className="empty-state__sub">
            {sessions.length === 0
              ? 'Mulai timer di halaman Focus untuk mencatat sesi.'
              : 'Geser navigasi hari di panel Pola Harian untuk melihat hari lain.'}
          </p>
        </div>
      )}
    </div>
  )
}
