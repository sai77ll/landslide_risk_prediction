import { useState, useEffect, useCallback } from 'react'
import { getZones, broadcastAlert, previewBroadcast, getMessageLogs, getResidents, registerResident, deleteResident, getLanguages } from '../utils/api'

const ALERT_LEVEL_META = {
  informational: { color: '#38BDF8', bg: '#38BDF820', icon: 'ℹ️', label: 'Informational' },
  advisory:      { color: '#FBBF24', bg: '#FBBF2420', icon: '⚡', label: 'Advisory'      },
  warning:       { color: '#F97316', bg: '#F9731620', icon: '⚠️', label: 'Warning'       },
  emergency:     { color: '#EF4444', bg: '#EF444420', icon: '🚨', label: 'Emergency'     },
}

const STATUS_META = {
  sent:      { color: '#22C55E', icon: '✅' },
  simulated: { color: '#22C55E', icon: '✅' },
  failed:    { color: '#EF4444', icon: '❌' },
  pending:   { color: '#94A3B8', icon: '⏳' },
}

const MESSAGE_TEMPLATES = {
  informational: '📢 LandGuard Notice: Elevated monitoring is active for your area. Stay informed and avoid unstable slopes. For updates call 112.',
  advisory:      '⚡ LandGuard Advisory: Landslide risk is elevated in your zone due to heavy rainfall. Avoid hill roads and riverbanks. Emergency: 112.',
  warning:       '⚠️ LandGuard WARNING: HIGH landslide risk detected near you. Please move to safer ground and stay indoors. Call 112 for emergencies.',
  emergency:     '🚨 EMERGENCY ALERT from LandGuard: CRITICAL landslide risk! EVACUATE immediately to designated safe zones. Call 112 NOW!',
}

// Hardcoded bilingual preview for selected language + level (mirrors backend language_service.py)
const TRANSLATED_TEMPLATES = {
  en: {
    informational: '📢 LandGuard Notice: Elevated monitoring is active for your area. Stay informed and avoid unstable slopes. For updates call 112.',
    advisory:      '⚡ LandGuard Advisory: Landslide risk is elevated in your zone due to heavy rainfall. Avoid hill roads and riverbanks. Emergency: 112.',
    warning:       '⚠️ LandGuard WARNING: HIGH landslide risk detected near you. Please move to safer ground and stay indoors. Call 112 for emergencies.',
    emergency:     '🚨 EMERGENCY ALERT from LandGuard: CRITICAL landslide risk! EVACUATE immediately to designated safe zones. Call 112 NOW!',
  },
  hi: {
    informational: '📢 LandGuard सूचना: आपके क्षेत्र में निगरानी बढ़ा दी गई है। अस्थिर ढलानों से दूर रहें और सतर्क रहें। अधिक जानकारी के लिए 112 पर कॉल करें।',
    advisory:      '⚡ LandGuard चेतावनी: भारी बारिश के कारण आपके क्षेत्र में भूस्खलन का खतरा बढ़ गया है। पहाड़ी सड़कों और नदी किनारों से दूर रहें। आपात स्थिति: 112।',
    warning:       '⚠️ LandGuard गंभीर चेतावनी: आपके पास उच्च भूस्खलन खतरा पाया गया है। कृपया सुरक्षित स्थान पर जाएं और घर के अंदर रहें। आपात स्थिति में 112 पर कॉल करें।',
    emergency:     '🚨 आपातकालीन अलर्ट — LandGuard: अत्यंत गंभीर भूस्खलन खतरा! तुरंत निर्धारित सुरक्षित क्षेत्र में जाएं। अभी 112 पर कॉल करें!',
  },
  mr: {
    informational: '📢 LandGuard सूचना: तुमच्या परिसरात देखरेख वाढवण्यात आली आहे। अस्थिर उतारांपासून दूर राहा आणि सावध राहा। अधिक माहितीसाठी 112 वर कॉल करा।',
    advisory:      '⚡ LandGuard सावधगिरी: मुसळधार पावसामुळे तुमच्या क्षेत्रात भूस्खलनाचा धोका वाढला आहे। डोंगरी रस्ते आणि नदीकिनारे टाळा। आणीबाणी: 112।',
    warning:       '⚠️ LandGuard इशारा: तुमच्या जवळ उच्च भूस्खलन धोका आढळला आहे। कृपया सुरक्षित ठिकाणी जा आणि घरातच राहा। आणीबाणीसाठी 112 वर कॉल करा।',
    emergency:     '🚨 आणीबाणी अलर्ट — LandGuard: अत्यंत गंभीर भूस्खलन धोका! तात्काळ निर्धारित सुरक्षित ठिकाणी जा. आत्ताच 112 वर कॉल करा!',
  },
  bn: {
    informational: '📢 LandGuard বিজ্ঞপ্তি: আপনার এলাকায় নজরদারি বাড়ানো হয়েছে। অস্থির ঢাল থেকে দূরে থাকুন এবং সতর্ক থাকুন। আরও তথ্যের জন্য 112-তে কল করুন।',
    advisory:      '⚡ LandGuard সতর্কতা: ভারী বৃষ্টির কারণে আপনার এলাকায় ভূমিধসের ঝুঁকি বেড়েছে। পাহাড়ি রাস্তা ও নদীর তীর এড়িয়ে চলুন। জরুরি: 112।',
    warning:       '⚠️ LandGuard সতর্কতা: আপনার কাছে উচ্চ ভূমিধসের ঝুঁকি সনাক্ত হয়েছে। দয়া করে নিরাপদ স্থানে যান এবং ঘরের ভেতরে থাকুন। জরুরি পরিস্থিতিতে 112-তে কল করুন।',
    emergency:     '🚨 জরুরি সতর্কতা — LandGuard: অত্যন্ত গুরুতর ভূমিধসের বিপদ! এখনই নির্ধারিত নিরাপদ স্থানে সরে যান। এখনই 112-তে কল করুন!',
  },
  ur: {
    informational: '📢 LandGuard اطلاع: آپ کے علاقے میں نگرانی بڑھا دی گئی ہے۔ غیر مستحکم ڈھلوانوں سے دور رہیں اور چوکس رہیں۔ مزید معلومات کے لیے 112 پر کال کریں۔',
    advisory:      '⚡ LandGuard مشورہ: بھاری بارش کی وجہ سے آپ کے علاقے میں لینڈ سلائیڈ کا خطرہ بڑھ گیا ہے۔ پہاڑی سڑکوں اور ندی کنارے سے گریز کریں۔ ایمرجنسی: 112۔',
    warning:       '⚠️ LandGuard انتباہ: آپ کے قریب زیادہ لینڈ سلائیڈ خطرہ پایا گیا ہے۔ براہ کرم محفوظ جگہ جائیں اور گھر کے اندر رہیں۔ ایمرجنسی کے لیے 112 پر کال کریں۔',
    emergency:     '🚨 ایمرجنسی الرٹ — LandGuard: انتہائی سنگین لینڈ سلائیڈ خطرہ! فوری طور پر مقررہ محفوظ علاقے میں جائیں۔ ابھی 112 پر کال کریں!',
  },
  auto: null, // per-resident preference
}

function maskPhone(phone) {
  if (!phone) return '****'
  return phone.slice(0, 3) + '****' + phone.slice(-3)
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ data, onConfirm, onCancel }) {
  const meta = ALERT_LEVEL_META[data.alert_level] || ALERT_LEVEL_META.warning
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', border: `2px solid ${meta.color}` }}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>{meta.icon}</div>
        <h3 style={{ textAlign: 'center', marginBottom: 4 }}>Confirm Broadcast</h3>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          This will mark {data.recipientCount} resident{data.recipientCount !== 1 ? 's' : ''} as notified.
        </p>

        <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Zone</span>
            <strong>{data.zoneName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Radius</span>
            <strong>{data.radius_km} km</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Alert Level</span>
            <span style={{ color: meta.color, fontWeight: 700, textTransform: 'capitalize' }}>{meta.icon} {meta.label}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Recipients</span>
            <strong style={{ color: meta.color }}>{data.recipientCount} residents</strong>
          </div>
        </div>

        <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          "{data.message}"
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, background: meta.color, borderColor: meta.color }}
            onClick={onConfirm}
          >
            📢 Send Alert to {data.recipientCount} Residents
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Register Resident Modal ───────────────────────────────────────────────────
function RegisterModal({ zones, languages, onSuccess, onClose }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', latitude: '', longitude: '', address: '', district: '', zone_id: '', preferred_language: 'en' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.latitude || !form.longitude) {
      setError('Name, phone, latitude and longitude are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await registerResident({
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        zone_id: form.zone_id ? parseInt(form.zone_id) : null,
      })
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>👤 Register Resident</h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>✕</button>
        </div>

        {error && <div style={{ background: '#EF444420', border: '1px solid #EF4444', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="form-label">Full Name *</label><input className="input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ramesh Negi" /></div>
            <div><label className="form-label">Phone *</label><input className="input" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+919876543210" /></div>
          </div>
          <div><label className="form-label">Email</label><input className="input" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="optional" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="form-label">Latitude *</label><input className="input" type="number" step="any" value={form.latitude} onChange={e => update('latitude', e.target.value)} placeholder="30.744" /></div>
            <div><label className="form-label">Longitude *</label><input className="input" type="number" step="any" value={form.longitude} onChange={e => update('longitude', e.target.value)} placeholder="79.493" /></div>
          </div>
          <div><label className="form-label">Address</label><input className="input" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Village / Colony" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="form-label">District</label><input className="input" value={form.district} onChange={e => update('district', e.target.value)} placeholder="Chamoli" /></div>
            <div>
              <label className="form-label">Near Zone</label>
              <select className="input" value={form.zone_id} onChange={e => update('zone_id', e.target.value)}>
                <option value="">— None —</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">🌐 Preferred Alert Language</label>
            <select className="input" value={form.preferred_language} onChange={e => update('preferred_language', e.target.value)}>
              {(languages.length ? languages : [{code:'en',flag:'🇬🇧',native:'English'}]).map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.native} ({l.name})</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Resident will receive alerts in this language when using Auto mode.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>{saving ? 'Saving…' : '✅ Register Resident'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MessagingPage({ prefillAlertLevel, prefillMessage, prefillZoneId }) {
  const [zones, setZones] = useState([])
  const [languages, setLanguages] = useState([])
  const [selectedZone, setSelectedZone] = useState(prefillZoneId || '')
  const [radiusKm, setRadiusKm] = useState(10)
  const [alertLevel, setAlertLevel] = useState(prefillAlertLevel || 'warning')
  const [language, setLanguage] = useState('en')
  const [message, setMessage] = useState(prefillMessage || MESSAGE_TEMPLATES.warning)
  const [sentBy, setSentBy] = useState('Operator')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [residents, setResidents] = useState([])
  const [residentsLoading, setResidentsLoading] = useState(true)
  const [confirmData, setConfirmData] = useState(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [showRegister, setShowRegister] = useState(false)
  const [tab, setTab] = useState('broadcast') // broadcast | logs | residents

  // Load zones + supported languages
  useEffect(() => {
    getZones().then(setZones).catch(console.error)
    getLanguages().then(setLanguages).catch(() => setLanguages([
      { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
      { code: 'hi', name: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
      { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
      { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
      { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇮🇳' },
    ]))
  }, [])

  // Auto-set message template when alert level changes
  useEffect(() => {
    if (!prefillMessage) setMessage(MESSAGE_TEMPLATES[alertLevel] || MESSAGE_TEMPLATES.warning)
  }, [alertLevel])

  // Live preview — debounced
  useEffect(() => {
    if (!selectedZone) { setPreview(null); return }
    setPreviewLoading(true)
    const timer = setTimeout(() => {
      previewBroadcast({ zone_id: selectedZone, radius_km: radiusKm })
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [selectedZone, radiusKm])

  const loadLogs = useCallback(() => {
    setLogsLoading(true)
    getMessageLogs({ limit: 100 })
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLogsLoading(false))
  }, [])

  const loadResidents = useCallback(() => {
    setResidentsLoading(true)
    getResidents()
      .then(setResidents)
      .catch(console.error)
      .finally(() => setResidentsLoading(false))
  }, [])

  useEffect(() => { loadLogs(); loadResidents() }, [loadLogs, loadResidents])

  const handleSendClick = () => {
    if (!selectedZone) return
    const zone = zones.find(z => z.id === parseInt(selectedZone))
    setConfirmData({
      zone_id: parseInt(selectedZone),
      zoneName: zone?.name || 'Selected Zone',
      radius_km: radiusKm,
      alert_level: alertLevel,
      language,
      message,
      sent_by: sentBy,
      recipientCount: preview?.count || 0,
    })
    setSendResult(null)
  }

  const handleConfirm = async () => {
    setSending(true)
    try {
      const result = await broadcastAlert({
        zone_id: confirmData.zone_id,
        radius_km: confirmData.radius_km,
        message: confirmData.message,
        alert_level: confirmData.alert_level,
        language: confirmData.language,
        sent_by: confirmData.sent_by,
      })
      setSendResult({ success: true, notified: result.notified })
      loadLogs()
    } catch (err) {
      setSendResult({ success: false, error: err.message })
    } finally {
      setSending(false)
      setConfirmData(null)
    }
  }

  const handleDeleteResident = async (id) => {
    if (!window.confirm('Remove this resident from alerts?')) return
    await deleteResident(id)
    loadResidents()
  }

  const meta = ALERT_LEVEL_META[alertLevel] || ALERT_LEVEL_META.warning

  return (
    <div className="fade-in">
      {/* Confirm Modal */}
      {confirmData && (
        <ConfirmModal
          data={confirmData}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmData(null)}
        />
      )}

      {/* Register Modal */}
      {showRegister && (
        <RegisterModal
          zones={zones}
          languages={languages}
          onSuccess={() => { setShowRegister(false); loadResidents() }}
          onClose={() => setShowRegister(false)}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>📢 Message Alert System</h1>
          <p>Broadcast emergency alerts to residents in landslide risk zones</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowRegister(true)}>
          + Register Resident
        </button>
      </div>

      {/* Send Result Banner */}
      {sendResult && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16,
          background: sendResult.success ? '#22C55E20' : '#EF444420',
          border: `1px solid ${sendResult.success ? '#22C55E' : '#EF4444'}`,
          color: sendResult.success ? '#22C55E' : '#EF4444',
          fontWeight: 600, fontSize: 14,
        }}>
          {sendResult.success
            ? `✅ Alert sent! ${sendResult.notified} resident${sendResult.notified !== 1 ? 's' : ''} notified successfully.`
            : `❌ Send failed: ${sendResult.error}`}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {[
          { key: 'broadcast', label: '📢 Broadcast Alert' },
          { key: 'logs',      label: `📋 Delivery Logs (${logs.length})` },
          { key: 'residents', label: `👥 Residents (${residents.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'transparent', borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              marginBottom: -2, transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Broadcast ─────────────────────────────────── */}
      {tab === 'broadcast' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left — Compose */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ marginBottom: 14, fontSize: 15 }}>🎯 Target Zone</h3>

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Select Risk Zone *</label>
                <select
                  className="input"
                  value={selectedZone}
                  onChange={e => setSelectedZone(e.target.value)}
                  id="msg-zone-select"
                >
                  <option value="">— Choose a zone —</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.risk_level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Alert Radius: <strong>{radiusKm} km</strong></label>
                <input
                  type="range" min={1} max={50} step={1}
                  value={radiusKm}
                  onChange={e => setRadiusKm(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                  id="msg-radius-slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>1 km</span><span>50 km</span>
                </div>
              </div>

              {/* Preview chip */}
              {selectedZone && (
                <div style={{
                  marginTop: 12, padding: '10px 14px',
                  background: previewLoading ? 'var(--bg-input)' : (preview?.count > 0 ? '#22C55E18' : '#F9731618'),
                  border: `1px solid ${previewLoading ? 'var(--border)' : (preview?.count > 0 ? '#22C55E' : '#F97316')}`,
                  borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  {previewLoading
                    ? <><div className="spinner" style={{ width: 16, height: 16 }} /><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Calculating residents…</span></>
                    : <>
                        <span style={{ fontSize: 22 }}>{preview?.count > 0 ? '👥' : '⚠️'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: preview?.count > 0 ? '#22C55E' : '#F97316' }}>
                            {preview?.count ?? 0} resident{preview?.count !== 1 ? 's' : ''} will be notified
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>within {radiusKm} km radius</div>
                        </div>
                      </>
                  }
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 14, fontSize: 15 }}>⚙️ Settings</h3>
              <div style={{ marginBottom: 10 }}>
                <label className="form-label">Sent By (Operator Name)</label>
                <input className="input" value={sentBy} onChange={e => setSentBy(e.target.value)} placeholder="Operator" id="msg-sent-by" />
              </div>
              <div>
                <label className="form-label">🌐 Alert Language</label>
                <select
                  className="input"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  id="msg-language-select"
                >
                  <option value="auto">🔄 Auto (each resident's own language)</option>
                  {languages.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.native} — {l.name}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>
                  {language === 'auto'
                    ? '🔄 Each resident will receive their message in their own registered language.'
                    : language === 'en'
                    ? 'Sending in English — your custom message text will be used as-is.'
                    : `Sending bilingual: English + ${languages.find(l => l.code === language)?.native || language}.`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Right — Message */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ marginBottom: 14, fontSize: 15 }}>✉️ Compose Message</h3>

              {/* Alert Level */}
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Alert Level</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(ALERT_LEVEL_META).map(([key, m]) => (
                    <button
                      key={key}
                      onClick={() => setAlertLevel(key)}
                      style={{
                        padding: '8px 12px', border: `2px solid ${alertLevel === key ? m.color : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)', background: alertLevel === key ? m.bg : 'var(--bg-input)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 700, color: alertLevel === key ? m.color : 'var(--text-muted)',
                        transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                      }}
                      id={`msg-level-${key}`}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message text */}
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">
                  Message Text
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>({message.length} chars)</span>
                </label>
                <textarea
                  className="input"
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                  id="msg-text-area"
                />
              </div>

              {/* Preview card */}
              <div style={{
                padding: 12, borderRadius: 'var(--radius-sm)',
                background: meta.bg, border: `1px solid ${meta.color}`,
                fontSize: 13, lineHeight: 1.5, marginBottom: 16,
                color: 'var(--text-secondary)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {meta.icon} SMS Preview
                  {language !== 'en' && language !== 'auto' && (
                    <span style={{ marginLeft: 8, background: '#6366F120', color: '#818CF8', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: 'none' }}>
                      🌐 {languages.find(l => l.code === language)?.flag} Bilingual
                    </span>
                  )}
                  {language === 'auto' && (
                    <span style={{ marginLeft: 8, background: '#10B98120', color: '#10B981', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: 'none' }}>
                      🔄 Auto per resident
                    </span>
                  )}
                </div>
                {language === 'auto' ? (
                  <div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{message}</div>
                    <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--bg-input)', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      ℹ️ Each resident sees this in their own registered language automatically.
                    </div>
                  </div>
                ) : language !== 'en' && TRANSLATED_TEMPLATES[language] ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    <div>{message}</div>
                    <div style={{ margin: '8px 0', borderTop: '1px dashed var(--border)', paddingTop: 8, color: 'var(--text-muted)', fontSize: 11 }}>{'─'.repeat(30)}</div>
                    <div style={{ direction: ['ur'].includes(language) ? 'rtl' : 'ltr' }}>
                      [{languages.find(l => l.code === language)?.native}] {TRANSLATED_TEMPLATES[language]?.[alertLevel] || ''}
                    </div>
                  </div>
                ) : (
                  message || <em style={{ color: 'var(--text-muted)' }}>No message entered</em>
                )}
              </div>

              {/* Send button */}
              <button
                className="btn btn-primary"
                style={{
                  width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700,
                  background: meta.color, borderColor: meta.color,
                  opacity: (!selectedZone || !message.trim() || sending) ? 0.5 : 1,
                }}
                disabled={!selectedZone || !message.trim() || sending}
                onClick={handleSendClick}
                id="msg-send-btn"
              >
                {sending ? '⏳ Sending…' : `📢 Send Alert to ${preview?.count ?? '?'} Residents`}
              </button>

              {!selectedZone && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                  ← Select a zone on the left to enable sending
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Delivery Logs ────────────────────────────── */}
      {tab === 'logs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {logsLoading ? (
            <div className="loading-center"><div className="spinner" /><p>Loading logs…</p></div>
          ) : logs.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">📭</div>
              <h3>No Messages Sent Yet</h3>
              <p>Broadcast an alert from the "Broadcast Alert" tab to see delivery logs here.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Recipient', 'Phone', 'Language', 'Alert Level', 'Status', 'Sent By', 'Time', 'Message'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    const sm = STATUS_META[log.status] || STATUS_META.pending
                    const lm = ALERT_LEVEL_META[log.alert_level] || ALERT_LEVEL_META.warning
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{logs.length - i}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{log.recipient_name}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.recipient_phone}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {(() => {
                            const langMeta = languages.find(l => l.code === (log.language || 'en'))
                            return (
                              <span style={{ padding: '2px 8px', borderRadius: 12, background: '#6366F115', color: '#818CF8', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {langMeta ? `${langMeta.flag} ${langMeta.native}` : '🇬🇧 English'}
                              </span>
                            )
                          })()}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, background: lm.bg, color: lm.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                            {lm.icon} {log.alert_level}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ color: sm.color, fontWeight: 700 }}>{sm.icon} {log.status}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{log.sent_by}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 11 }}>
                          {log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={log.message}>
                          {log.message}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Residents ────────────────────────────────── */}
      {tab === 'residents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{residents.length} registered residents</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowRegister(true)}>+ Add Resident</button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {residentsLoading ? (
              <div className="loading-center"><div className="spinner" /><p>Loading residents…</p></div>
            ) : residents.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">👥</div>
                <h3>No Residents Registered</h3>
                <p>Add residents who should receive landslide alerts.</p>
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowRegister(true)}>Register First Resident</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Phone', 'Language', 'District', 'Address', 'Coordinates', 'Registered', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {residents.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>👤 {r.name}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{maskPhone(r.phone)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {(() => {
                            const lm = languages.find(l => l.code === (r.preferred_language || 'en'))
                            return (
                              <span style={{ padding: '2px 8px', borderRadius: 12, background: '#6366F115', color: '#818CF8', fontSize: 11, fontWeight: 600 }}>
                                {lm ? `${lm.flag} ${lm.native}` : '🇬🇧 English'}
                              </span>
                            )
                          })()}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{r.district || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.address}>{r.address || '—'}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                          {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {r.registered_at ? new Date(r.registered_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444440', fontSize: 11 }}
                            onClick={() => handleDeleteResident(r.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Alert Delivery:</strong>{' '}
        Messages are delivered via simulated SMS — every broadcast is logged with recipient name, masked phone, alert level, language, and timestamp.
        Supported languages: 🇬🇧 English, 🇮🇳 Hindi, 🇮🇳 Marathi, 🇮🇳 Bengali, 🇮🇳 Urdu.
        Use <strong>Auto mode</strong> to send each resident's alert in their own registered language automatically.
        Phone numbers are masked in the UI for privacy.
      </div>
    </div>
  )
}
