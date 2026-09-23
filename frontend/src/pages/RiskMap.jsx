import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, ZoomControl, useMap } from 'react-leaflet'
import { getZones, getIncidents } from '../utils/api'
import { getRiskColor, getRiskInfo, getStatusMeta } from '../utils/riskColors'
import { RiskBadge, StatusBadge } from '../components/Badges'
import { formatNum, timeAgo, incidentTypeLabel } from '../utils/formatters'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'

const { BaseLayer, Overlay } = LayersControl

// Uttarakhand center
const MAP_CENTER = [30.3, 79.0]
const MAP_ZOOM = 8

function getRiskRadius(score) {
  return 8 + (score / 100) * 20
}

// ── Offline SVG tile layer — dark grid, works 100% without internet ────────────
const offlineSvg = encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>
    <rect width='256' height='256' fill='#1a2035'/>
    <path d='M 0 0 L 256 0 M 0 64 L 256 64 M 0 128 L 256 128 M 0 192 L 256 192
             M 0 0 L 0 256 M 64 0 L 64 256 M 128 0 L 128 256 M 192 0 L 192 256'
      stroke='#2a3a55' stroke-width='0.5'/>
  </svg>
`)

function OfflineTileLayer() {
  return (
    <TileLayer
      url={`data:image/svg+xml,${offlineSvg}`}
      attribution='⚠️ Offline Mode'
      tileSize={256}
      maxZoom={19}
    />
  )
}

// ── Online/Offline status badge shown on the map ──────────────────────────────
function NetworkBadge({ isOnline }) {
  return (
    <div style={{
      position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
      display: 'flex', alignItems: 'center', gap: 6,
      background: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
      border: `1px solid ${isOnline ? '#10B981' : '#EF4444'}`,
      borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
      color: isOnline ? '#10B981' : '#EF4444',
      backdropFilter: 'blur(8px)',
      transition: 'all 0.4s ease',
      boxShadow: `0 2px 12px ${isOnline ? '#10B98140' : '#EF444440'}`,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: isOnline ? '#10B981' : '#EF4444',
        display: 'inline-block',
        boxShadow: isOnline ? '0 0 6px #10B981' : '0 0 6px #EF4444',
        animation: 'pulse 2s infinite',
      }} />
      {isOnline ? '🌐 Online — Rich Map Active' : '📡 Offline — Local Map Active'}
    </div>
  )
}

export default function RiskMap() {
  const [zones, setZones] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState(null)
  const [filter, setFilter] = useState('all')
  // Auto-detect internet connectivity
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Listen for browser online/offline events — updates instantly when network changes
  useEffect(() => {
    const goOnline  = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    Promise.all([getZones(), getIncidents({ limit: 100 })])
      .then(([z, i]) => { setZones(z); setIncidents(i) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredZones = zones.filter((z) => {
    if (filter === 'all') return true
    return z.risk_level === filter.toUpperCase()
  })

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Geospatial Risk Map</h1>
        <p>Interactive map of predicted risk zones and confirmed incidents · Indian Himalayas Region</p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'critical', 'high', 'moderate', 'low'].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
            >
              {f === 'all' ? 'All Zones' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Showing {filteredZones.length} zones · {incidents.length} incidents
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Map */}
        <div className="map-container" style={{ height: 600, position: 'relative' }}>
          {/* Network status badge — bottom-left corner of map */}
          <NetworkBadge isOnline={isOnline} />
          <MapContainer
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            aria-label="Landslide risk map"
          >
            <ZoomControl position="bottomright" />

            {/* Auto-switching base map: online = CartoDB rich map, offline = local SVG grid */}
            <LayersControl position="topright">
              {isOnline ? (
                // ── ONLINE: beautiful rich map tiles ──
                <>
                  <BaseLayer checked name="🌐 Dark (CartoDB)">
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                      maxZoom={19}
                    />
                  </BaseLayer>
                  <BaseLayer name="🌐 OpenStreetMap">
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://openstreetmap.org/">OpenStreetMap</a>'
                    />
                  </BaseLayer>
                  <BaseLayer name="🌐 Satellite (ESRI)">
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution='&copy; <a href="https://esri.com/">Esri</a>'
                    />
                  </BaseLayer>
                  <BaseLayer name="📡 Offline (Dark Grid)">
                    <OfflineTileLayer />
                  </BaseLayer>
                </>
              ) : (
                // ── OFFLINE: local SVG grid, zero network requests ──
                <>
                  <BaseLayer checked name="📡 Offline (Dark Grid)">
                    <OfflineTileLayer />
                  </BaseLayer>
                </>
              )}

              {/* Risk Zones Overlay */}
              <Overlay checked name="Predicted Risk Zones">
                <>
                  {filteredZones.map((z) => {
                    const color = getRiskColor(z.risk_level)
                    const radius = getRiskRadius(z.risk_score)
                    return (
                      <CircleMarker
                        key={`zone-${z.id}`}
                        center={[z.latitude, z.longitude]}
                        radius={radius}
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: 0.25,
                          weight: 2,
                          opacity: 0.9,
                        }}
                        eventHandlers={{ click: () => setSelectedZone(z) }}
                      >
                        <Popup>
                          <div style={{ minWidth: 220, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
                            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{z.name}</div>
                            <div style={{ marginBottom: 8 }}>
                              <span style={{ background: `${color}20`, color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                                {getRiskInfo(z.risk_level).icon} {z.risk_level} RISK
                              </span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <tbody>
                                {[
                                  ['Risk Score', `${Math.round(z.risk_score)}/100`],
                                  ['Confidence', `${Math.round(z.prediction_confidence)}%`],
                                  ['Rainfall', `${z.rainfall_mm?.toFixed(1) ?? 'N/A'} mm/day`],
                                  ['Soil Moisture', `${((z.soil_moisture || 0) * 100).toFixed(0)}%`],
                                  ['Slope', `${z.slope_degrees?.toFixed(0) ?? 'N/A'}°`],
                                  ['Population at Risk', formatNum(z.population_at_risk)],
                                ].map(([k, v]) => (
                                  <tr key={k}>
                                    <td style={{ color: '#64748B', paddingRight: 8, paddingBottom: 3 }}>{k}</td>
                                    <td style={{ fontWeight: 600 }}>{v}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {z.risk_explanation && (
                              <p style={{ marginTop: 8, fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                                {z.risk_explanation.slice(0, 120)}…
                              </p>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    )
                  })}
                </>
              </Overlay>

              {/* Incidents Overlay */}
              <Overlay checked name="Reported Incidents">
                <>
                  {incidents.map((inc) => {
                    const sev = inc.severity || 'minor'
                    const COLOR = { critical: '#EF4444', severe: '#F97316', moderate: '#F59E0B', minor: '#94A3B8' }
                    const color = COLOR[sev] || '#94A3B8'
                    const sm = getStatusMeta(inc.status)
                    return (
                      <CircleMarker
                        key={`inc-${inc.id}`}
                        center={[inc.latitude, inc.longitude]}
                        radius={10}
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: 0.8,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div style={{ minWidth: 220, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{inc.title}</div>
                            <div style={{ marginBottom: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ background: `${color}20`, color, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                                {sev.toUpperCase()}
                              </span>
                              <span style={{ background: `${sm.color}20`, color: sm.color, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                                {sm.icon} {sm.label}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                              {incidentTypeLabel(inc.incident_type)} · {inc.location_description || 'Unknown location'}
                            </div>
                            <div style={{ fontSize: 11, color: '#94A3B8' }}>
                              {timeAgo(inc.created_at)} · {inc.report_count} report(s)
                            </div>
                            <a
                              href={`/incidents/${inc.incident_id || inc.id}`}
                              style={{ display: 'block', marginTop: 8, color: '#6366F1', fontSize: 12, fontWeight: 600 }}
                            >
                              View Details →
                            </a>
                          </div>
                        </Popup>
                      </CircleMarker>
                    )
                  })}
                </>
              </Overlay>
            </LayersControl>
          </MapContainer>
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Legend */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Map Legend</h3>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Predicted Risk Zones
            </div>
            <div className="map-legend" style={{ border: 'none', padding: 0 }}>
              {[
                ['🔴', 'Critical Risk (76–100)', '#EF4444'],
                ['🟠', 'High Risk (51–75)', '#F97316'],
                ['🟡', 'Moderate Risk (26–50)', '#F59E0B'],
                ['🟢', 'Low Risk (0–25)', '#10B981'],
              ].map(([icon, label, color]) => (
                <div key={label} className="map-legend-item" aria-label={label}>
                  <div className="map-legend-dot" style={{ background: color }} />
                  <span aria-hidden="true">{icon}</span> {label}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', margin: '12px 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Incident Markers (Solid)
            </div>
            <div className="map-legend" style={{ border: 'none', padding: 0 }}>
              {[
                ['🔴', 'Critical Severity', '#EF4444'],
                ['🟠', 'Severe', '#F97316'],
                ['🟡', 'Moderate', '#F59E0B'],
                ['⚫', 'Minor', '#94A3B8'],
              ].map(([icon, label, color]) => (
                <div key={label} className="map-legend-item">
                  <div className="map-legend-dot" style={{ background: color }} />
                  <span aria-hidden="true">{icon}</span> {label}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              ℹ️ <strong>Prediction vs Incident:</strong> Large translucent circles = AI-predicted risk zones. Small solid circles = actual reported incidents.
            </div>
          </div>

          {/* Zone detail panel */}
          {selectedZone && (
            <div className="card fade-in">
              <div className="card-header">
                <h3 className="card-title">Zone Detail</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedZone(null)}>✕</button>
              </div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{selectedZone.name}</div>
              <RiskBadge level={selectedZone.risk_level} />
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['Risk Score', `${Math.round(selectedZone.risk_score)}/100`],
                  ['Confidence', `${Math.round(selectedZone.prediction_confidence)}%`],
                  ['Rainfall', `${selectedZone.rainfall_mm?.toFixed(1)} mm/day`],
                  ['Soil Moisture', `${((selectedZone.soil_moisture || 0) * 100).toFixed(0)}%`],
                  ['Slope', `${selectedZone.slope_degrees?.toFixed(0)}°`],
                  ['Elevation', `${selectedZone.elevation_m?.toFixed(0)}m`],
                  ['Population at Risk', formatNum(selectedZone.population_at_risk)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--divider)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
              {selectedZone.risk_explanation && (
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{selectedZone.risk_explanation.slice(0, 200)}…"
                </p>
              )}
              <Link
                to={`/predict?zone_id=${selectedZone.id}`}
                className="btn btn-primary w-full"
                style={{ marginTop: 12, display: 'block', textAlign: 'center' }}
              >
                🧠 Run New Prediction
              </Link>
            </div>
          )}

          {/* Quick stats */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Zone Summary</h3>
            {['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map((level) => {
              const count = zones.filter((z) => z.risk_level === level).length
              const color = getRiskColor(level)
              return (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{level}</span>
                  <div style={{ flex: 3, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${zones.length ? (count / zones.length) * 100 : 0}%`, height: '100%', background: color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
