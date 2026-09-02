function MinIcon(): React.JSX.Element {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
      <rect x={2} y={5.4} width={8} height={1.2} fill="currentColor" rx={0.6} />
    </svg>
  )
}

function FullscreenIcon(): React.JSX.Element {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x={2.5} y={2.5} width={7} height={7} stroke="currentColor" strokeWidth={1.1} />
    </svg>
  )
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  )
}

/**
 * WindowControls — Electron custom chrome.
 * On the web this component is not rendered (App.tsx omits the titlebar).
 * Kept for reference and for potential future Electron builds archived under /electron.
 * If rendered on web, it gracefully no-ops.
 */
export function WindowControls(): React.JSX.Element | null {
  // Web: no Electron API — hide controls entirely
  if (typeof window === 'undefined' || typeof (window as unknown as { api?: unknown }).api === 'undefined') {
    return null
  }
  const api = (window as unknown as { api: { minimizeWindow: () => void; maximizeWindow: () => void; closeWindow: () => void } }).api
  return (
    <div className="window-controls">
      <button
        type="button"
        className="window-control"
        aria-label="Minimalkan"
        title="Minimalkan"
        onClick={() => api.minimizeWindow()}
      >
        <MinIcon />
      </button>
      <button
        type="button"
        className="window-control"
        aria-label="Fullscreen"
        title="Fullscreen"
        onClick={() => api.maximizeWindow()}
      >
        <FullscreenIcon />
      </button>
      <button
        type="button"
        className="window-control window-control--close"
        aria-label="Tutup"
        title="Tutup"
        onClick={() => api.closeWindow()}
      >
        <CloseIcon />
      </button>
    </div>
  )
}
