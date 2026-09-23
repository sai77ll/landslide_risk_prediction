import { useState } from 'react'
import { ALERT_LEVEL_ICONS } from '../utils/riskColors'
import { timeAgo } from '../utils/formatters'
import { acknowledgeAlert } from '../utils/api'

export default function AlertBanners({ alerts = [], onDismiss }) {
  const [dismissing, setDismissing] = useState(new Set())

  const handleDismiss = async (id) => {
    setDismissing((prev) => new Set([...prev, id]))
    try {
      await acknowledgeAlert(id)
      onDismiss?.(id)
    } catch {
      setDismissing((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  if (!alerts.length) return null

  return (
    <div role="region" aria-label="Active alerts" aria-live="polite">
      {alerts.slice(0, 5).map((alert) => (
        <div
          key={alert.id}
          className={`alert-banner ${alert.level}`}
          role="alert"
        >
          <span className="alert-icon" aria-hidden="true">
            {ALERT_LEVEL_ICONS[alert.level] || '⚠️'}
          </span>
          <div className="alert-content">
            <div className="alert-title">{alert.title}</div>
            <div className="alert-message">{alert.message}</div>
            <div className="alert-meta">
              <span>📍 {alert.location}</span>
              <span style={{ margin: '0 6px' }}>·</span>
              <span>{timeAgo(alert.created_at)}</span>
              <span style={{ margin: '0 6px' }}>·</span>
              <span style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 700 }}>
                {alert.level}
              </span>
            </div>
          </div>
          <button
            className="alert-dismiss"
            onClick={() => handleDismiss(alert.id)}
            disabled={dismissing.has(alert.id)}
            aria-label={`Dismiss alert: ${alert.title}`}
          >
            ✕
          </button>
        </div>
      ))}
      {alerts.length > 5 && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
          +{alerts.length - 5} more alerts — view all in Alerts section
        </p>
      )}
    </div>
  )
}
