import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAlerts, acknowledgeAlert } from '../utils/api'
import { ALERT_LEVEL_ICONS, ALERT_LEVEL_COLORS } from '../utils/riskColors'
import { timeAgo, formatDate } from '../utils/formatters'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  const load = () => {
    getAlerts({ active_only: !showAll, limit: 50 })
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [showAll])

  const handleAck = async (id) => {
    await acknowledgeAlert(id)
    load()
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><p>Loading alerts…</p></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>🔔 Active Alerts</h1>
        <p>System-generated warnings from AI predictions and incident reports</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <button className={`btn btn-sm ${!showAll ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowAll(false)}>
          Active Only ({alerts.filter(a => a.is_active && !a.acknowledged).length})
        </button>
        <button className={`btn btn-sm ${showAll ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowAll(true)}>
          All Alerts
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>No Active Alerts</h3>
            <p>No outstanding alerts at this time. The system will generate alerts when HIGH or CRITICAL risk is predicted or incidents are reported.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map((alert) => {
            const color = ALERT_LEVEL_COLORS[alert.level] || '#94A3B8'
            const icon = ALERT_LEVEL_ICONS[alert.level] || '⚠️'
            return (
              <div
                key={alert.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${color}`,
                  opacity: alert.acknowledged ? 0.6 : 1,
                }}
                role="article"
                aria-label={`${alert.level} alert: ${alert.title}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }} aria-hidden="true">{icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{alert.title}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          padding: '2px 8px', borderRadius: 12,
                          background: `${color}20`, color,
                        }} aria-label={`Alert level: ${alert.level}`}>
                          {alert.level}
                        </span>
                        {alert.acknowledged && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>
                            ✅ Acknowledged
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{alert.message}</p>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>📍 {alert.location}</span>
                        <span>🕐 {timeAgo(alert.created_at)}</span>
                        <span>🗓️ {formatDate(alert.created_at)}</span>
                        <span style={{ textTransform: 'capitalize' }}>Type: {alert.alert_type}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexShrink: 0 }}>
                    <Link
                      to="/messaging"
                      className="btn btn-sm"
                      style={{ background: '#F9731620', color: '#F97316', border: '1px solid #F9731640', whiteSpace: 'nowrap' }}
                      aria-label={`Broadcast alert: ${alert.title}`}
                    >
                      📢 Broadcast
                    </Link>
                    {!alert.acknowledged && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleAck(alert.id)}
                        aria-label={`Acknowledge alert: ${alert.title}`}
                      >
                        ✓ Acknowledge
                      </button>
                    )}
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Alert Generation Policy:</strong>
        Alerts are automatically generated when the ML model predicts HIGH or CRITICAL risk for a zone,
        or when new incidents are reported. Only active system conditions generate alerts —
        false alerts are not fabricated. Acknowledging an alert records the action but does not resolve the underlying condition.
      </div>
    </div>
  )
}
