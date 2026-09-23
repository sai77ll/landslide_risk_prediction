import { useState, useRef } from 'react'
import { submitReport } from '../utils/api'

const INCIDENT_TYPES = [
  { value: 'landslide', label: '🏔️ Landslide' },
  { value: 'rockfall', label: '🪨 Rockfall' },
  { value: 'mudslide', label: '💧 Mudslide' },
  { value: 'ground_cracks', label: '🔓 Ground Cracks' },
  { value: 'soil_movement', label: '🌍 Soil Movement' },
  { value: 'road_blockage', label: '🚧 Road Blockage' },
  { value: 'other', label: '❓ Other' },
]

const SEVERITY_OPTIONS = [
  { value: 'minor', label: '🟡 Minor', desc: 'Small movement, no immediate danger' },
  { value: 'moderate', label: '🟠 Moderate', desc: 'Significant movement, some danger' },
  { value: 'severe', label: '🔴 Severe', desc: 'Major event, immediate danger' },
  { value: 'critical', label: '🆘 Critical', desc: 'Life-threatening, mass evacuation needed' },
]

export default function ReportForm() {
  const [form, setForm] = useState({
    latitude: '',
    longitude: '',
    location_description: '',
    reporter_name: '',
    reporter_phone: '',
    reporter_type: 'citizen',
    incident_type: '',
    severity: '',
    description: '',
    road_blocked: false,
    cracks_visible: false,
    rockfall: false,
    soil_movement: false,
    water_flow_change: false,
    casualties_reported: false,
    houses_damaged: 0,
  })
  const [photos, setPhotos] = useState([])
  const [previews, setPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef()

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }))

  const getGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('latitude', pos.coords.latitude.toFixed(6))
        set('longitude', pos.coords.longitude.toFixed(6))
        setGpsLoading(false)
      },
      () => {
        setError('Could not get GPS location. Please enter coordinates manually.')
        setGpsLoading(false)
      }
    )
  }

  const handlePhotoAdd = (files) => {
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setPhotos((p) => [...p, ...newFiles])
    newFiles.forEach((f) => {
      const url = URL.createObjectURL(f)
      setPreviews((p) => [...p, url])
    })
  }

  const removePhoto = (idx) => {
    setPhotos((p) => p.filter((_, i) => i !== idx))
    setPreviews((p) => p.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.incident_type || !form.severity) {
      setError('Please select incident type and severity.')
      return
    }
    if (!form.latitude || !form.longitude) {
      setError('Location is required. Use GPS or enter coordinates.')
      return
    }

    setSubmitting(true)
    setError(null)

    const data = new FormData()
    Object.entries(form).forEach(([k, v]) => data.append(k, v))
    photos.forEach((p) => data.append('photos', p))

    try {
      const res = await submitReport(data)
      setSuccess(res)
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Report Submitted Successfully</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{success.message}</p>
          <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Report ID</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>#{success.report_id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Linked Incident</span>
              <span style={{ fontWeight: 700 }}>
                {success.incident_id ? `Incident #${success.incident_id}` : 'New incident created'}
              </span>
            </div>
            {success.photos_saved?.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Photos Uploaded</span>
                <span style={{ fontWeight: 700 }}>{success.photos_saved.length}</span>
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
            Thank you for your report. Your information will be reviewed by emergency operators. 
            Multiple reports help corroborate incidents and improve verification confidence.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setSuccess(null); setForm({ ...form, description: '', reporter_name: '', reporter_phone: '' }); setPhotos([]); setPreviews([]) }}>
              Submit Another Report
            </button>
            <a href="/incidents" className="btn btn-secondary">View All Incidents</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <h1>📝 Report an Incident</h1>
        <p>Submit a citizen or field officer report of a suspected landslide event. Your report will be reviewed and may be corroborated with other evidence.</p>
      </div>

      <div className="card" style={{ padding: '10px 14px', marginBottom: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)' }}>
        <p style={{ fontSize: 12, color: '#F59E0B', fontWeight: 500 }}>
          ⚠️ In an immediate life-threatening emergency, call <strong>112</strong> (Emergency) or <strong>1077</strong> (Disaster Helpline) first.
          This form is for incident reporting — not emergency dispatch.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Location */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 16 }}>📍 Incident Location</h2>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={getGPS}
              disabled={gpsLoading}
              aria-busy={gpsLoading}
            >
              {gpsLoading ? '⏳ Getting GPS…' : '📡 Use GPS Location'}
            </button>
            {form.latitude && form.longitude && (
              <span style={{ fontSize: 12, color: 'var(--risk-low)', alignSelf: 'center' }}>
                ✅ {parseFloat(form.latitude).toFixed(5)}, {parseFloat(form.longitude).toFixed(5)}
              </span>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="latitude">Latitude *</label>
              <input id="latitude" className="form-control" type="number" step="0.000001" placeholder="e.g. 30.7440" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="longitude">Longitude *</label>
              <input id="longitude" className="form-control" type="number" step="0.000001" placeholder="e.g. 79.4930" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="location_description">Location Description</label>
            <input id="location_description" className="form-control" placeholder="e.g. NH-58 near Pipalkoti, 2km before Chamoli" value={form.location_description} onChange={(e) => set('location_description', e.target.value)} />
            <span className="form-hint">Landmark, road name, or area description</span>
          </div>
        </div>

        {/* Incident Details */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 16 }}>⚡ Incident Details</h2>

          <div className="form-group">
            <label className="form-label">Incident Type *</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {INCIDENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`btn btn-sm ${form.incident_type === t.value ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => set('incident_type', t.value)}
                  aria-pressed={form.incident_type === t.value}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Severity *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {SEVERITY_OPTIONS.map((s) => (
                <div
                  key={s.value}
                  onClick={() => set('severity', s.value)}
                  role="radio"
                  aria-checked={form.severity === s.value}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && set('severity', s.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${form.severity === s.value ? 'var(--brand-primary)' : 'var(--border)'}`,
                    background: form.severity === s.value ? 'rgba(99,102,241,0.1)' : 'var(--bg-input)',
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              className="form-control"
              rows={4}
              placeholder="Describe what you observed: size of movement, debris, affected structures, road conditions, sounds, smells, any changes in water flow…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
        </div>

        {/* Observations */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 16 }}>👁️ What Did You Observe?</h2>
          <div className="checkbox-group">
            {[
              ['road_blocked', '🚧 Road Blocked'],
              ['cracks_visible', '🔓 Visible Cracks'],
              ['rockfall', '🪨 Rockfall'],
              ['soil_movement', '🌍 Soil Movement'],
              ['water_flow_change', '💧 Water Flow Change'],
              ['casualties_reported', '🆘 Casualties Reported'],
            ].map(([key, label]) => (
              <label key={key} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => set(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label" htmlFor="houses_damaged">Estimated Houses Damaged</label>
            <input id="houses_damaged" type="number" min={0} className="form-control" style={{ width: 120 }} value={form.houses_damaged} onChange={(e) => set('houses_damaged', parseInt(e.target.value) || 0)} />
          </div>
        </div>

        {/* Photos */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 12 }}>📷 Photo Evidence</h2>
          <div
            className={`photo-upload-zone ${dragOver ? 'drag-over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handlePhotoAdd(e.dataTransfer.files) }}
            role="button"
            tabIndex={0}
            aria-label="Upload photos — click or drag and drop"
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <div className="upload-icon" aria-hidden="true">📷</div>
            <p>Click to upload or drag photos here</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>JPEG, PNG, WebP · Multiple files supported</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handlePhotoAdd(e.target.files)}
            aria-hidden="true"
          />
          {previews.length > 0 && (
            <div className="photo-preview-grid" aria-label={`${previews.length} photos selected`}>
              {previews.map((url, idx) => (
                <div key={idx} className="photo-preview-item">
                  <img src={url} alt={`Photo ${idx + 1}`} />
                  <button
                    type="button"
                    className="photo-preview-remove"
                    onClick={() => removePhoto(idx)}
                    aria-label={`Remove photo ${idx + 1}`}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reporter Info */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 4 }}>👤 Reporter Information</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Personal information is kept confidential and not shared publicly.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reporter_name">Name (optional)</label>
              <input id="reporter_name" className="form-control" placeholder="Anonymous" value={form.reporter_name} onChange={(e) => set('reporter_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reporter_phone">Phone (optional)</label>
              <input id="reporter_phone" className="form-control" type="tel" placeholder="+91 XXXXXXXXXX" value={form.reporter_phone} onChange={(e) => set('reporter_phone', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reporter Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['citizen', '👤 Citizen'], ['field_officer', '🦺 Field Officer'], ['authority', '🏛️ Authority']].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  className={`btn btn-sm ${form.reporter_type === v ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => set('reporter_type', v)}
                  aria-pressed={form.reporter_type === v}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert" style={{ marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ width: '100%', padding: '14px', fontSize: 14 }}
          aria-busy={submitting}
        >
          {submitting ? '⏳ Submitting Report…' : '📤 Submit Incident Report'}
        </button>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
          By submitting, you confirm this report is accurate to the best of your knowledge.
          False reports hinder emergency response.
        </p>
      </form>
    </div>
  )
}
