import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getIncidents, getIncident, updateIncidentStatus, getPriorityQueue } from '../utils/api'
import { RiskBadge, StatusBadge, PriorityBadge, SeverityBadge } from '../components/Badges'
import FeatureImportanceBars from '../components/FeatureImportanceBars'
import { timeAgo, formatDate, formatNum, incidentTypeLabel } from '../utils/formatters'

/* =================== INCIDENT LIST =================== */
export function IncidentList() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', severity: '' })

  useEffect(() => {
    getIncidents({ ...filter, limit: 100 })
      .then(setIncidents)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter])

  if (loading) return <div className="loading-center"><div className="spinner" /><p>Loading incidents…</p></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Incident Management</h1>
        <p>All reported, verified, and tracked landslide incidents · Click any row for full details</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>FILTER:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['', 'reported', 'under_review', 'corroborated', 'verified', 'rejected'].map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${filter.status === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter((f) => ({ ...f, status: s }))}
              >
                {s ? s.replace('_', ' ') : 'All Status'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['', 'critical', 'severe', 'moderate', 'minor'].map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${filter.severity === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter((f) => ({ ...f, severity: s }))}
              >
                {s || 'All Severity'}
              </button>
            ))}
          </div>
          <Link to="/report" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
            + Report New Incident
          </Link>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" aria-label="Incidents table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Confidence</th>
                <th>Reports</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id} onClick={() => window.location.href = `/incidents/${inc.incident_id || inc.id}`} style={{ cursor: 'pointer' }}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--brand-primary)' }}>{inc.incident_id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inc.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📍 {inc.district || inc.location_description || 'Unknown'}</div>
                  </td>
                  <td>{incidentTypeLabel(inc.incident_type)}</td>
                  <td><SeverityBadge severity={inc.severity} /></td>
                  <td><StatusBadge status={inc.status} /></td>
                  <td><PriorityBadge level={inc.priority_level?.toUpperCase()} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 40, height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${inc.verification_confidence || 0}%`, height: '100%', borderRadius: 2,
                          background: inc.verification_confidence >= 80 ? 'var(--risk-low)' : inc.verification_confidence >= 50 ? 'var(--risk-moderate)' : 'var(--risk-high)'
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(inc.verification_confidence || 0)}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{inc.report_count}</td>
                  <td style={{ fontSize: 12 }}>{timeAgo(inc.created_at)}</td>
                </tr>
              ))}
              {incidents.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No incidents found for selected filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* =================== INCIDENT DETAIL =================== */
export function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [statusForm, setStatusForm] = useState({ status: '', comment: '', performed_by: 'operator' })
  const [showStatusForm, setShowStatusForm] = useState(false)

  const load = () => {
    setLoading(true)
    getIncident(id)
      .then(setIncident)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleStatusUpdate = async () => {
    if (!statusForm.status) return
    setUpdating(true)
    try {
      await updateIncidentStatus(incident.id, statusForm)
      load()
      setShowStatusForm(false)
    } catch (e) {
      alert('Update failed: ' + e.message)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><p>Loading incident details…</p></div>
  if (!incident) return <div className="error-message">Incident not found</div>

  const actions = incident.response_actions || {}

  return (
    <div className="fade-in">
      {/* Back */}
      <button className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--brand-primary)', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                {incident.incident_id}
              </span>
              <StatusBadge status={incident.status} />
              <SeverityBadge severity={incident.severity} />
              <PriorityBadge level={incident.priority_level?.toUpperCase()} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>{incident.title}</h1>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              📍 {incident.location_description || `${incident.latitude?.toFixed(4)}, ${incident.longitude?.toFixed(4)}`}
              <span style={{ margin: '0 8px' }}>·</span>
              🕐 {timeAgo(incident.created_at)} · {formatDate(incident.incident_time || incident.created_at)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowStatusForm(!showStatusForm)}
            >
              ✏️ Update Status
            </button>
          </div>
        </div>

        {/* Status Update Form */}
        {showStatusForm && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Update Verification Status</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="new-status">New Status</label>
                <select id="new-status" className="form-control" value={statusForm.status} onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="">Select status…</option>
                  {['reported', 'under_review', 'corroborated', 'verified', 'rejected'].map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="operator-name">Your Name</label>
                <input id="operator-name" className="form-control" value={statusForm.performed_by} onChange={(e) => setStatusForm((f) => ({ ...f, performed_by: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="status-comment">Comment (optional)</label>
              <input id="status-comment" className="form-control" placeholder="Reason for status change…" value={statusForm.comment} onChange={(e) => setStatusForm((f) => ({ ...f, comment: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleStatusUpdate} disabled={updating}>
                {updating ? 'Updating…' : '✅ Confirm Update'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowStatusForm(false)}>Cancel</button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Status changes are audit-logged with timestamp and operator name.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Details */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 14 }}>📋 Incident Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['Incident Type', incidentTypeLabel(incident.incident_type)],
                ['Severity', incident.severity],
                ['Road Blocked', incident.road_blocked ? `Yes — ${incident.road_name || 'Unknown road'}` : 'No'],
                ['People Affected', formatNum(incident.people_affected)],
                ['Houses Damaged', incident.houses_damaged || 0],
                ['Predicted Risk', incident.predicted_risk_score ? `${Math.round(incident.predicted_risk_score)}/100` : 'N/A'],
                ['Verification Confidence', `${Math.round(incident.verification_confidence || 0)}%`],
                ['Response Team', incident.response_team_assigned || 'Not yet assigned'],
                ['Response Status', incident.response_status || 'pending'],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{String(v)}</div>
                </div>
              ))}
            </div>
            {incident.description && (
              <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {incident.description}
              </div>
            )}
          </div>

          {/* Corroboration evidence */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 14 }}>🔍 Incident Confidence & Evidence</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                <svg width={80} height={80} viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={40} cy={40} r={32} fill="none" stroke="var(--bg-input)" strokeWidth={8} />
                  <circle
                    cx={40} cy={40} r={32} fill="none"
                    stroke={incident.verification_confidence >= 80 ? 'var(--risk-low)' : incident.verification_confidence >= 50 ? 'var(--risk-moderate)' : 'var(--risk-high)'}
                    strokeWidth={8} strokeLinecap="round"
                    strokeDasharray={201}
                    strokeDashoffset={201 - (incident.verification_confidence / 100) * 201}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(incident.verification_confidence || 0)}%</span>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Verification Confidence</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Based on number of independent reports, photo evidence, field officer confirmation, and model prediction alignment.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { icon: '📝', label: `${incident.report_count} Report(s)`, active: incident.report_count > 0 },
                { icon: '🧠', label: 'Model Aligned', active: incident.predicted_risk_score >= 50 },
                { icon: '🦺', label: 'Field Report', active: incident.reports?.some((r) => r.reporter_type === 'field_officer') },
                { icon: '📷', label: 'Photo Evidence', active: false },
                { icon: '🚧', label: 'Road Blocked', active: incident.road_blocked },
              ].map(({ icon, label, active }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                  borderRadius: 20, fontSize: 12,
                  background: active ? 'rgba(16,185,129,0.1)' : 'var(--bg-input)',
                  color: active ? 'var(--risk-low)' : 'var(--text-muted)',
                  border: `1px solid ${active ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                }}>
                  <span>{icon}</span> {label} {active ? '✓' : '—'}
                </div>
              ))}
            </div>
          </div>

          {/* Reports */}
          {incident.reports?.length > 0 && (
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: 14 }}>📨 Linked Reports ({incident.reports.length})</h2>
              {incident.reports.map((r, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {r.reporter_type === 'field_officer' ? '🦺 Field Officer' : '👤 Citizen'} Report
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(r.reported_at)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Severity: <strong>{r.severity}</strong>
                    {r.road_blocked && <span style={{ marginLeft: 8, color: 'var(--risk-high)' }}>🚧 Road blocked</span>}
                    {r.photo_count > 0 && <span style={{ marginLeft: 8 }}>📷 {r.photo_count} photo(s)</span>}
                  </div>
                  {r.description && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{r.description.slice(0, 120)}{r.description.length > 120 ? '…' : ''}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Priority */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 14 }}>🚨 Response Priority</h2>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, color: incident.priority_level === 'critical' ? '#EF4444' : incident.priority_level === 'high' ? '#F97316' : 'var(--text-primary)' }}>
                {Math.round(incident.priority_score || 0)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Priority Score / 100</div>
              <div style={{ marginTop: 8 }}>
                <PriorityBadge level={incident.priority_level?.toUpperCase()} />
              </div>
            </div>
          </div>

          {/* Recommended Actions */}
          {actions.immediate_actions?.length > 0 && (
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: 12 }}>⚡ Immediate Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {actions.immediate_actions.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0' }}>
                    <span style={{ color: 'var(--risk-critical)', fontWeight: 700, flexShrink: 0 }}>•</span>
                    {a}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Follow-up Actions</h3>
                {actions.followup_actions?.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-muted)', padding: '3px 0' }}>
                    <span>◦</span>{a}
                  </div>
                ))}
              </div>
              {actions.disclaimer && (
                <div style={{ marginTop: 12, padding: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, fontSize: 11, color: '#F59E0B', lineHeight: 1.4 }}>
                  ⚠️ {actions.disclaimer}
                </div>
              )}
            </div>
          )}

          {/* Audit Trail */}
          {incident.audit_trail?.length > 0 && (
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: 14 }}>📋 Incident Timeline</h2>
              <div className="timeline">
                {incident.audit_trail.map((a, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-dot" style={{ background: a.new_status === 'verified' ? 'var(--risk-low)' : a.new_status === 'rejected' ? 'var(--risk-critical)' : 'var(--brand-primary)' }} />
                    <div className="timeline-time">{formatDate(a.timestamp, 'MMM d, HH:mm')}</div>
                    <div className="timeline-content">
                      {a.previous_status && <span style={{ color: 'var(--text-muted)' }}>{a.previous_status} → </span>}
                      <strong>{a.new_status || a.action}</strong>
                      {a.performed_by && <span style={{ color: 'var(--text-muted)' }}> · {a.performed_by}</span>}
                      {a.comment && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.comment}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* =================== PRIORITY QUEUE PAGE =================== */
export function PriorityQueuePage() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPriorityQueue().then(setQueue).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-center"><div className="spinner" /><p>Loading priority queue…</p></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>🚨 Emergency Response Priority Queue</h1>
        <p>Incidents ranked by computed priority score based on severity, verification confidence, population impact, and infrastructure risk</p>
      </div>

      <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)' }}>
        ⚠️ Priority scores are <strong>decision-support estimates</strong>, not autonomous emergency commands.
        Final response decisions rest with authorized emergency management personnel.
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" aria-label="Emergency response priority queue">
            <thead>
              <tr>
                <th>#</th>
                <th>Incident</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Priority Score</th>
                <th>Priority Level</th>
                <th>People Affected</th>
                <th>Road</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((inc, idx) => (
                <tr key={inc.id}>
                  <td>
                    <div className={`priority-rank ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other'}`} style={{ display: 'inline-flex' }}>
                      {idx + 1}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inc.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inc.incident_id} · {timeAgo(inc.created_at)}</div>
                  </td>
                  <td><SeverityBadge severity={inc.severity} /></td>
                  <td><StatusBadge status={inc.status} /></td>
                  <td>
                    <span style={{
                      fontSize: 20, fontWeight: 800, fontFamily: 'monospace',
                      color: inc.priority_score >= 80 ? '#EF4444' : inc.priority_score >= 60 ? '#F97316' : 'var(--text-primary)'
                    }}>
                      {Math.round(inc.priority_score)}
                    </span>
                  </td>
                  <td><PriorityBadge level={inc.priority_level?.toUpperCase()} /></td>
                  <td>{formatNum(inc.people_affected)}</td>
                  <td>{inc.road_blocked ? <span style={{ color: 'var(--risk-high)', fontWeight: 600 }}>🚧 Blocked</span> : '—'}</td>
                  <td>
                    <Link to={`/incidents/${inc.incident_id || inc.id}`} className="btn btn-primary btn-sm">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No active incidents in queue</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
