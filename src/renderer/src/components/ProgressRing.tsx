interface ProgressRingProps {
  size: number
  stroke: number
  progress: number
  color: string
  trackColor: string
  children: React.ReactNode
}

export function ProgressRing({
  size,
  stroke,
  progress,
  color,
  trackColor,
  children
}: ProgressRingProps): React.JSX.Element {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, progress))
  const offset = circumference * (1 - clamped)

  // Responsive: clamp to viewport on small screens, keep exact size on desktop
  const responsiveStyle = {
    width: `min(${String(size)}px, 72vw)`,
    height: `min(${String(size)}px, 72vw)`,
    maxWidth: `${String(size)}px`,
    maxHeight: `${String(size)}px`
  } as React.CSSProperties

  return (
    <div className="ring" style={responsiveStyle}>
      <svg viewBox={`0 0 ${String(size)} ${String(size)}`} width="100%" height="100%" role="img" style={{ display: 'block' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.2s linear' }}
        />
      </svg>
      <div className="ring__content">{children}</div>
    </div>
  )
}
