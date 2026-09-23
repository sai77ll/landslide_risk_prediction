import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { predictRisk, getZones, getZoneHistory } from '../utils/api'
import RiskScoreRing from '../components/RiskScoreRing'
import FeatureImportanceBars from '../components/FeatureImportanceBars'
import { RiskBadge } from '../components/Badges'
import { formatDate } from '../utils/formatters'
import {
  Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale,
  Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

const DEFAULT_INPUTS = {
  zone_name: 'Custom Analysis',
  latitude: 30.744,
  longitude: 79.493,
  rainfall_mm: 80,
  rainfall_intensity: 5.0,
  cumulative_rainfall: 180,
  soil_moisture: 0.60,
  slope_degrees: 35,
  elevation_m: 1500,
  vegetation_index: 0.45,
  geology_risk: 0.55,
  drainage_score: 0.40,
}

const INPUT_META = {
  rainfall_mm: { label: '🌧️ Rainfall (mm/day)', min: 0, max: 500, step: 1, hint: 'Current day rainfall in millimetres' },
  rainfall_intensity: { label: '⛈️ Rainfall Intensity (mm/hr)', min: 0, max: 50, step: 0.1, hint: 'Peak hourly intensity' },
  cumulative_rainfall: { label: '🌊 Cumulative Rainfall 72h (mm)', min: 0, max: 1000, step: 1, hint: 'Total rainfall over past 72 hours' },
  soil_moisture: { label: '💧 Soil Moisture (0–1)', min: 0, max: 1, step: 0.01, hint: 'Fraction of soil saturation (0 = dry, 1 = saturated)' },
  slope_degrees: { label: '⛰️ Slope Angle (°)', min: 0, max: 90, step: 0.5, hint: 'Terrain slope in degrees' },
  elevation_m: { label: '🏔️ Elevation (m)', min: 0, max: 8000, step: 10, hint: 'Elevation above sea level' },
  vegetation_index: { label: '🌱 Vegetation Index (0–1)', min: 0, max: 1, step: 0.01, hint: 'NDVI-equivalent: 1 = dense, 0 = bare' },
  geology_risk: { label: '🪨 Geology Risk (0–1)', min: 0, max: 1, step: 0.01, hint: 'Geological instability index' },
  drainage_score: { label: '🌀 Drainage Capacity (0–1)', min: 0, max: 1, step: 0.01, hint: '1 = excellent drainage, 0 = very poor' },
}

export default function PredictionPage() {
  const [searchParams] = useSearchParams()
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [zones, setZones] = useState([])
  const [history, setHistory] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState('')

  useEffect(() => {
    getZones().then(setZones).catch(console.error)
    const zid = searchParams.get('zone_id')
    if (zid) setSelectedZoneId(zid)
  }, [])

  useEffect(() => {
    if (!selectedZoneId) return
    const zone = zones.find((z) => z.id === parseInt(selectedZoneId))
    if (zone) {
      setInputs((prev) => ({
        ...prev,
        zone_name: zone.name,
        zone_id: zone.id,
        latitude: zone.latitude,
        longitude: zone.longitude,
        rainfall_mm: zone.rainfall_mm ?? prev.rainfall_mm,
        rainfall_intensity: zone.rainfall_intensity ?? prev.rainfall_intensity,
        cumulative_rainfall: zone.cumulative_rainfall ?? prev.cumulative_rainfall,
        soil_moisture: zone.soil_moisture ?? prev.soil_moisture,
        slope_degrees: zone.slope_degrees ?? prev.slope_degrees,
        elevation_m: zone.elevation_m ?? prev.elevation_m,
        vegetation_index: zone.vegetation_index ?? prev.vegetation_index,
        geology_risk: zone.geology_risk ?? prev.geology_risk,
        drainage_score: zone.drainage_score ?? prev.drainage_score,
      }))
      getZoneHistory(zone.id).then(setHistory).catch(console.error)
    }
  }, [selectedZoneId, zones])

  const handleChange = (key, val) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(val) || 0 }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await predictRisk(inputs)
      setResult(res)
      window.scrollTo({ top: document.getElementById('result-section')?.offsetTop - 80, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const historyChartData = {
    labels: history.map((h) => formatDate(h.predicted_at, 'MMM d HH:mm')),
    datasets: [
      {
        label: 'Risk Score',
        data: history.map((h) => h.risk_score),
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#6366F1',
      },
      {
        label: 'Rainfall mm',
        data: history.map((h) => h.rainfall_mm),
        borderColor: '#06B6D4',
        backgroundColor: 'rgba(6,182,212,0.1)',
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: 3,
      },
    ],
  }

  const historyChartOptions = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#94A3B8', font: { family: 'Inter', size: 11 } } },
      tooltip: { backgroundColor: '#1A2035', titleColor: '#F1F5F9', bodyColor: '#94A3B8' },
    },
    scales: {
      x: { ticks: { color: '#64748B', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.04)' }, min: 0, max: 100, title: { display: true, text: 'Risk Score', color: '#64748B' } },
      y1: { position: 'right', ticks: { color: '#06B6D4' }, grid: { display: false }, title: { display: true, text: 'Rainfall mm', color: '#06B6D4' } },
    },
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>AI Risk Prediction</h1>
        <p>Run the RandomForest ML model with SHAP explainability · All predictions are estimates requiring field verification</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>
        {/* Input Form */}
        <div>
          <form onSubmit={handleSubmit} className="card" aria-labelledby="form-heading">
            <h2 id="form-heading" className="card-title" style={{ marginBottom: 16 }}>🧠 Prediction Inputs</h2>

            {/* Zone selector */}
            <div className="form-group">
              <label className="form-label" htmlFor="zone-select">Select Existing Zone (optional)</label>
              <select
                id="zone-select"
                className="form-control"
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
              >
                <option value="">Custom / Ad-hoc Analysis</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name} ({z.district})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="zone-name">Zone / Location Name</label>
              <input
                id="zone-name"
                className="form-control"
                value={inputs.zone_name}
                onChange={(e) => setInputs((p) => ({ ...p, zone_name: e.target.value }))}
                placeholder="e.g. Chamoli — Badrinath Highway"
              />
            </div>

            {/* Environmental inputs */}
            {Object.entries(INPUT_META).map(([key, meta]) => (
              <div className="form-group" key={key}>
                <label className="form-label" htmlFor={key}>{meta.label}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    id={key}
                    type="range"
                    min={meta.min}
                    max={meta.max}
                    step={meta.step}
                    value={inputs[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    style={{ flex: 1, accentColor: 'var(--brand-primary)' }}
                    aria-label={`${meta.label}: ${inputs[key]}`}
                  />
                  <input
                    type="number"
                    min={meta.min}
                    max={meta.max}
                    step={meta.step}
                    value={inputs[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="form-control"
                    style={{ width: 72, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}
                    aria-label={`${meta.label} value`}
                  />
                </div>
                <span className="form-hint">{meta.hint}</span>
              </div>
            ))}

            {error && (
              <div className="error-message" role="alert">⚠️ {error}</div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              style={{ marginTop: 8 }}
              aria-busy={loading}
            >
              {loading ? '⏳ Running Prediction…' : '🧠 Run Prediction'}
            </button>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center', lineHeight: 1.4 }}>
              Prediction uses a RandomForest model trained on synthetic Himalayan terrain data.
              Results are estimates — field verification required before any emergency action.
            </p>
          </form>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!result && !loading && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <div className="empty-state">
                <div className="empty-state-icon">🧠</div>
                <h3>Ready for Prediction</h3>
                <p>Set environmental parameters and click "Run Prediction" to see the AI-powered risk assessment with SHAP explanations.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="card loading-center">
              <div className="spinner" aria-label="Running prediction" />
              <p>Running RandomForest model with SHAP analysis…</p>
            </div>
          )}

          {result && (
            <div id="result-section" className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Risk Score */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">📊 Prediction Result</h2>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatDate(result.predicted_at)} IST
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
                  <RiskScoreRing
                    score={result.risk_score}
                    level={result.risk_level}
                    confidence={result.confidence}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 12 }}>
                      <RiskBadge level={result.risk_level} size="lg" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(result.class_probabilities || {}).map(([lvl, pct]) => (
                        <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <span style={{ minWidth: 80, color: 'var(--text-muted)' }}>{lvl}</span>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`, height: '100%', borderRadius: 3,
                              background: lvl === 'CRITICAL' ? '#EF4444' : lvl === 'HIGH' ? '#F97316' : lvl === 'MODERATE' ? '#F59E0B' : '#10B981',
                              transition: 'width 0.8s ease'
                            }} />
                          </div>
                          <span style={{ minWidth: 36, fontWeight: 600, fontFamily: 'monospace' }}>{pct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      Class probabilities from RandomForest model · Confidence: {result.confidence?.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="card">
                <h2 className="card-title" style={{ marginBottom: 12 }}>❓ Why Is This Area At Risk?</h2>
                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic', borderLeft: '3px solid var(--brand-primary)' }}>
                  "{result.explanation}"
                </div>
              </div>

              {/* Feature Importance */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">🔬 SHAP Feature Importance</h2>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Model: RandomForestClassifier v1.0</span>
                </div>
                <FeatureImportanceBars contributions={result.feature_contributions || []} />
              </div>
            </div>
          )}

          {/* History Chart */}
          {history.length > 1 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📈 Prediction History — {inputs.zone_name}</h2>
              </div>
              <div style={{ height: 240 }}>
                <Line data={historyChartData} options={historyChartOptions} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Risk score trend over time · Rising score indicates worsening conditions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
