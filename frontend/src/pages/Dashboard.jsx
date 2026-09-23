import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAnalyticsSummary, getAlerts, getPriorityQueue, getZones } from '../utils/api'
import { timeAgo, formatNum } from '../utils/formatters'
import { RiskBadge, StatusBadge, PriorityBadge } from '../components/Badges'
import AlertBanners from '../components/AlertBanners'
import { getRiskColor } from '../utils/riskColors'

const KPI_CONFIG = [
  { key: 'critical_zones', label: 'Critical Zones', icon: '🔴', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', desc: 'Zones at CRITICAL predicted risk' },
  { key: 'high_risk_zones', label: 'High-Risk Zones', icon: '🟠', color: '#F97316', bg: 'rgba(249,115,22,0.12)', desc: 'Zones at HIGH or CRITICAL risk' },
  { key: 'active_incidents', label: 'Active Incidents', icon: '⚡', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', desc: 'Open incidents under monitoring' },
  { key: 'verified_incidents', label: 'Verified Incidents', icon: '✅', color: '#10B981', bg: 'rgba(16,185,129,0.12)', desc: 'Field-confirmed incidents' },
  { key: 'pending_reports', label: 'Pending Reports', icon: '📝', color: '#6366F1', bg: 'rgba(99,102,241,0.12)', desc: 'Citizen reports awaiting review' },
  { key: 'people_affected', label: 'People at Risk', icon: '👥', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', desc: 'Estimated population in high-risk zones', format: formatNum },
  { key: 'roads_blocked', label: 'Roads Blocked', icon: '🚧', color: '#F97316', bg: 'rgba(249,115,22,0.12)', desc: 'Roads reported as blocked' },
  { key: 'active_alerts', label: 'Active Alerts', icon: '🔔', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', desc: 'Unacknowledged system alerts' },
]

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [queue, setQueue] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const [s, a, q, z] = await Promise.all([
        getAnalyticsSummary(),
        getAlerts({ active_only: true, limit: 10 }),
        getPriorityQueue(),
        getZones(),
      ])
      setSummary(s)
      setAlerts(a)
      setQueue(q.slice(0, 8))
      setZones(z)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" role="status" aria-label="Loading dashboard" />
      <p>Loading situation dashboard…</p>
    </div>
  )

  if (error) return (
    <div className="error-message" role="alert">
      ⚠️ Could not load dashboard: {error}. Ensure the backend is running.
    </div>
  )

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Situation Dashboard</h1>
        <p>
          Real-time AI-predicted risk overview · Incident monitoring · Emergency response status
          <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--risk-moderate)', fontWeight: 600 }}>
            ⚠️ All predictions are model estimates. Field verification required before emergency action.
          </span>
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section aria-labelledby="alerts-heading" style={{ marginBottom: 20 }}>
          <h2 id="alerts-heading" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🔔 Active Alerts ({alerts.length})
          </h2>
          <AlertBanners alerts={alerts} onDismiss={(id) => setAlerts((a) => a.filter((x) => x.id !== id))} />
        </section>
      )}

      {/* KPI Cards */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
        <div className="kpi-grid">
          {KPI_CONFIG.map(({ key, label, icon, color, bg, desc, format }) => (
            <div
              key={key}
              className="kpi-card"
              style={{ '--kpi-color': color, '--kpi-bg': bg }}
              title={desc}
            >
              <div className="kpi-icon" aria-hidden="true">{icon}</div>
              <div className="kpi-value" aria-label={`${label}: ${format ? format(summary?.[key] ?? 0) : summary?.[key] ?? 0}`}>
                {format ? format(summary?.[key] ?? 0) : (summary?.[key] ?? 0)}
              </div>
              <div className="kpi-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Main grid */}
      <div className="section-grid section-grid-aside" style={{ gap: 20 }}>
        {/* Left: Priority Queue + Zone Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Priority Response Queue */}
          <section className="card" aria-labelledby="queue-heading">
            <div className="card-header">
              <div>
                <h2 id="queue-heading" className="card-title">🚨 Emergency Response Priority Queue</h2>
                <p className="card-subtitle">Incidents ordered by computed priority score — highest first</p>
              </div>
              <Link to="/incidents/queue" className="btn btn-secondary btn-sm">View All</Link>
            </div>

            {queue.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <h3>No Active Incidents</h3>
                <p>No incidents requiring emergency response at this time.</p>
              </div>
            ) : (
              <div role="list" aria-label="Priority queue">
                {queue.map((inc, idx) => (
                  <Link
                    key={inc.id}
                    to={`/incidents/${inc.incident_id || inc.id}`}
                    className="priority-queue-item"
                    role="listitem"
                    aria-label={`Priority ${idx + 1}: ${inc.title}, score ${Math.round(inc.priority_score)}`}
                  >
                    <div className={`priority-rank ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other'}`}>
                      {idx + 1}
                    </div>
                    <div className="priority-info">
                      <div className="priority-title">{inc.title}</div>
                      <div className="priority-meta">
                        <StatusBadge status={inc.status} />
                        <span style={{ marginLeft: 8 }}>📍 {inc.district || inc.location_description || 'Unknown location'}</span>
                        <span style={{ marginLeft: 8 }}>⏱ {timeAgo(inc.created_at)}</span>
                      </div>
                    </div>
                    <div className="priority-scores">
                      <div className="priority-score-val" style={{ color: inc.priority_level?.toUpperCase() === 'CRITICAL' ? '#EF4444' : inc.priority_level?.toUpperCase() === 'HIGH' ? '#F97316' : 'var(--text-primary)' }}>
                        {Math.round(inc.priority_score)}
                      </div>
                      <PriorityBadge level={inc.priority_level?.toUpperCase()} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Prediction vs Incident clarity */}
          <section className="card" aria-labelledby="distinction-heading">
            <div className="card-header">
              <h2 id="distinction-heading" className="card-title">📌 System Status Overview</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                {
                  label: 'PREDICTED RISK',
                  desc: 'Areas where the AI model estimates elevated landslide probability based on environmental data.',
                  value: summary?.high_risk_zones ?? 0,
                  unit: 'high-risk zones',
                  color: '#F97316',
                  icon: '🧠',
                },
                {
                  label: 'CONFIRMED INCIDENTS',
                  desc: 'Locations where actual landslide events have been reported and/or verified.',
                  value: summary?.verified_incidents ?? 0,
                  unit: 'verified',
                  color: '#EF4444',
                  icon: '⚡',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    border: `1px solid ${item.color}30`,
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }} aria-hidden="true">{item.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: item.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.unit}</div>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.4 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Zone Risk Table */}
        <section className="card" aria-labelledby="zones-heading">
          <div className="card-header">
            <div>
              <h2 id="zones-heading" className="card-title">📍 Risk Zone Status</h2>
              <p className="card-subtitle">Predicted risk by zone</p>
            </div>
            <Link to="/map" className="btn btn-secondary btn-sm">Map View</Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" aria-label="Risk zone status table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Risk Level</th>
                  <th>Score</th>
                  <th>Population</th>
                </tr>
              </thead>
              <tbody>
                {zones.sort((a, b) => b.risk_score - a.risk_score).map((z) => (
                  <tr key={z.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{z.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{z.district}</div>
                    </td>
                    <td><RiskBadge level={z.risk_level} /></td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: getRiskColor(z.risk_level) }}>
                        {Math.round(z.risk_score)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {formatNum(z.population_at_risk)}
                    </td>
                  </tr>
                ))}
                {zones.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No zones available</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[['🟢', 'LOW', 'var(--risk-low)'], ['🟡', 'MODERATE', 'var(--risk-moderate)'], ['🟠', 'HIGH', 'var(--risk-high)'], ['🔴', 'CRITICAL', 'var(--risk-critical)']].map(([icon, lbl, clr]) => (
              <span key={lbl} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span aria-hidden="true">{icon}</span> <span style={{ color: `var(${clr.includes('var') ? clr.replace('var(', '').replace(')', '') : clr})` }}>{lbl}</span>
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* Quick Actions */}
      <section className="card" style={{ marginTop: 20 }} aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="card-title" style={{ marginBottom: 16 }}>⚡ Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/report" className="btn btn-primary">📝 Report an Incident</Link>
          <Link to="/predict" className="btn btn-secondary">🧠 Run Risk Prediction</Link>
          <Link to="/incidents/queue" className="btn btn-secondary">🚨 View Priority Queue</Link>
          <Link to="/map" className="btn btn-secondary">🗺️ Open Risk Map</Link>
          <Link to="/analytics" className="btn btn-secondary">📈 View Analytics</Link>
        </div>
      </section>
    </div>
  )
}
