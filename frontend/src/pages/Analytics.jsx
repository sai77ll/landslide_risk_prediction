import { useState, useEffect } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { getAnalyticsSummary, getRiskTrend, getIncidentFrequency, getSeverityBreakdown, getZoneRiskDistribution } from '../utils/api'
import { formatDate } from '../utils/formatters'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

const CHART_DEFAULTS = {
  responsive: true,
  plugins: {
    legend: { labels: { color: '#94A3B8', font: { family: 'Inter', size: 11 } } },
    tooltip: { backgroundColor: '#1A2035', titleColor: '#F1F5F9', bodyColor: '#94A3B8', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
  },
  scales: {
    x: { ticks: { color: '#64748B', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    y: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
  },
}

export default function Analytics() {
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [frequency, setFrequency] = useState([])
  const [severityBreak, setSeverityBreak] = useState([])
  const [riskDist, setRiskDist] = useState([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  const load = async () => {
    setLoading(true)
    try {
      const [s, t, f, sb, rd] = await Promise.all([
        getAnalyticsSummary(),
        getRiskTrend({ days }),
        getIncidentFrequency({ days: 30 }),
        getSeverityBreakdown(),
        getZoneRiskDistribution(),
      ])
      setSummary(s)
      setTrend(t)
      setFrequency(f)
      setSeverityBreak(sb)
      setRiskDist(rd)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [days])

  if (loading) return <div className="loading-center"><div className="spinner" /><p>Loading analytics…</p></div>

  const trendChart = {
    labels: trend.map((t) => formatDate(t.predicted_at, 'MMM d HH:mm')),
    datasets: [{
      label: 'Risk Score',
      data: trend.map((t) => t.risk_score),
      borderColor: '#6366F1',
      backgroundColor: 'rgba(99,102,241,0.12)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#6366F1',
    }, {
      label: 'Rainfall mm',
      data: trend.map((t) => t.rainfall_mm),
      borderColor: '#06B6D4',
      backgroundColor: 'rgba(6,182,212,0.05)',
      fill: false,
      tension: 0.4,
      yAxisID: 'y1',
      pointRadius: 2,
    }],
  }

  const frequencyChart = {
    labels: frequency.slice(-30).map((f) => f.date.slice(5)),
    datasets: [{
      label: 'Incidents Reported',
      data: frequency.slice(-30).map((f) => f.count),
      backgroundColor: 'rgba(249,115,22,0.7)',
      borderColor: '#F97316',
      borderWidth: 1,
      borderRadius: 3,
    }],
  }

  const SEVERITY_COLORS = { critical: '#EF4444', severe: '#F97316', moderate: '#F59E0B', minor: '#94A3B8' }
  const severityChart = {
    labels: severityBreak.map((s) => s.severity || 'Unknown'),
    datasets: [{
      data: severityBreak.map((s) => s.count),
      backgroundColor: severityBreak.map((s) => `${SEVERITY_COLORS[s.severity] || '#94A3B8'}CC`),
      borderColor: severityBreak.map((s) => SEVERITY_COLORS[s.severity] || '#94A3B8'),
      borderWidth: 2,
    }],
  }

  const RISK_COLORS = { CRITICAL: '#EF4444', HIGH: '#F97316', MODERATE: '#F59E0B', LOW: '#10B981' }
  const riskDistChart = {
    labels: riskDist.map((r) => r.risk_level),
    datasets: [{
      data: riskDist.map((r) => r.count),
      backgroundColor: riskDist.map((r) => `${RISK_COLORS[r.risk_level] || '#94A3B8'}CC`),
      borderColor: riskDist.map((r) => RISK_COLORS[r.risk_level] || '#94A3B8'),
      borderWidth: 2,
    }],
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Historical Analytics</h1>
        <p>Risk trends, incident patterns, and system performance over time</p>
      </div>

      {/* Summary row */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Zones Monitored', value: summary.total_zones, icon: '📍' },
            { label: 'Total Active Incidents', value: summary.active_incidents, icon: '⚡' },
            { label: 'Verified Incidents', value: summary.verified_incidents, icon: '✅' },
            { label: 'People Potentially Affected', value: summary.people_affected?.toLocaleString(), icon: '👥' },
          ].map((kpi) => (
            <div key={kpi.label} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{kpi.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Risk Trend */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2 className="card-title">📈 Risk Score & Rainfall Trend</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {[3, 7, 14, 30].map((d) => (
              <button
                key={d}
                className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {trend.length > 0 ? (
          <div style={{ height: 260 }}>
            <Line
              data={trendChart}
              options={{
                ...CHART_DEFAULTS,
                scales: {
                  ...CHART_DEFAULTS.scales,
                  y: { ...CHART_DEFAULTS.scales.y, min: 0, max: 100, title: { display: true, text: 'Risk Score', color: '#6366F1', font: { size: 10 } } },
                  y1: { position: 'right', ticks: { color: '#06B6D4' }, grid: { display: false }, title: { display: true, text: 'Rainfall mm', color: '#06B6D4', font: { size: 10 } } },
                },
              }}
            />
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">📈</div>
            <p>No trend data yet. Run predictions to populate history.</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Incident Frequency */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 16 }}>📊 Daily Incident Reports (30 days)</h2>
          <div style={{ height: 200 }}>
            <Bar data={frequencyChart} options={CHART_DEFAULTS} />
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 16 }}>🎯 Incidents by Severity</h2>
          {severityBreak.length > 0 ? (
            <div style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
              <Doughnut
                data={severityChart}
                options={{
                  responsive: true,
                  plugins: { legend: { labels: { color: '#94A3B8', font: { size: 11 } } }, tooltip: { backgroundColor: '#1A2035', titleColor: '#F1F5F9' } },
                }}
              />
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>No incident data yet.</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Zone Risk Distribution */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 16 }}>🗺️ Risk Zone Distribution</h2>
          {riskDist.length > 0 ? (
            <div style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
              <Doughnut
                data={riskDistChart}
                options={{
                  responsive: true,
                  plugins: { legend: { labels: { color: '#94A3B8', font: { size: 11 } } }, tooltip: { backgroundColor: '#1A2035' } },
                }}
              />
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>No zone data yet.</p>
            </div>
          )}
        </div>

        {/* Key Insights */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 16 }}>💡 System Insights</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                icon: '🧠',
                title: 'ML Model',
                desc: 'RandomForestClassifier with 200 trees. Trained on synthetic Himalayan terrain data. Uses SHAP for explainability.',
                color: '#6366F1',
              },
              {
                icon: '📊',
                title: 'Prediction Approach',
                desc: 'Risk scored 0–100 using weighted class probabilities. CRITICAL = 76-100, HIGH = 51-75, MODERATE = 26-50.',
                color: '#F97316',
              },
              {
                icon: '🔍',
                title: 'Verification Logic',
                desc: 'Confidence from: report count, photo evidence, field officer reports, model alignment, road blockage.',
                color: '#10B981',
              },
              {
                icon: '🚨',
                title: 'Priority Scoring',
                desc: 'Factors: severity (30pts), verification confidence (20pts), risk alignment (15pts), population (15pts), infrastructure (15pts).',
                color: '#EF4444',
              },
            ].map((item) => (
              <div key={item.title} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
