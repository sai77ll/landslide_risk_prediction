import { getRiskInfo } from '../utils/riskColors'

export function RiskBadge({ level, size = 'sm' }) {
  const info = getRiskInfo(level)
  return (
    <span
      className={`risk-badge ${level}`}
      role="status"
      aria-label={`Risk level: ${info.text}`}
      style={{ fontSize: size === 'lg' ? 13 : undefined }}
    >
      <span aria-hidden="true">{info.icon}</span>
      {info.label}
    </span>
  )
}

export function StatusBadge({ status }) {
  const STATUS = {
    reported:     { icon: '🟡', label: 'Reported' },
    under_review: { icon: '🔵', label: 'Under Review' },
    corroborated: { icon: '🟠', label: 'Corroborated' },
    verified:     { icon: '🟢', label: 'Verified' },
    rejected:     { icon: '⚫', label: 'Rejected' },
  }
  const meta = STATUS[status] || STATUS.reported
  return (
    <span
      className={`status-badge ${status}`}
      role="status"
      aria-label={`Verification status: ${meta.label}`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  )
}

export function PriorityBadge({ level }) {
  const lvl = (level || 'low').toUpperCase()
  return (
    <span
      className={`priority-badge ${lvl}`}
      role="status"
      aria-label={`Priority level: ${lvl}`}
    >
      {lvl}
    </span>
  )
}

export function SeverityBadge({ severity }) {
  const COLOR_MAP = {
    critical: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
    severe:   { bg: 'rgba(249,115,22,0.12)', color: '#F97316' },
    moderate: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
    minor:    { bg: 'rgba(107,114,128,0.12)', color: '#94A3B8' },
  }
  const s = (severity || 'minor').toLowerCase()
  const style = COLOR_MAP[s] || COLOR_MAP.minor
  return (
    <span
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
      role="status"
      aria-label={`Severity: ${severity}`}
    >
      {severity}
    </span>
  )
}
