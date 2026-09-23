import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

export const predictRisk = (data) => api.post('/predict', data)
export const getZones = (params) => api.get('/zones', { params })
export const getZone = (id) => api.get(`/zones/${id}`)
export const getZoneHistory = (id, limit = 48) => api.get(`/zones/${id}/history`, { params: { limit } })

export const getIncidents = (params) => api.get('/incidents', { params })
export const getIncident = (id) => api.get(`/incidents/${id}`)
export const getPriorityQueue = () => api.get('/incidents/priority-queue')
export const updateIncidentStatus = (id, data) => api.patch(`/incidents/${id}/status`, data)

export const getReports = (params) => api.get('/reports', { params })
export const submitReport = (formData) =>
  axios.post(`${API_BASE}/reports`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)

export const getAlerts = (params) => api.get('/alerts', { params })
export const acknowledgeAlert = (id) => api.patch(`/alerts/${id}/acknowledge`)

export const getAnalyticsSummary = () => api.get('/analytics/summary')
export const getRiskTrend = (params) => api.get('/analytics/risk-trend', { params })
export const getIncidentFrequency = (params) => api.get('/analytics/incident-frequency', { params })
export const getSeverityBreakdown = () => api.get('/analytics/severity-breakdown')
export const getZoneRiskDistribution = () => api.get('/analytics/zone-risk-distribution')

export const getHealth = () => api.get('/health')

// ── Messaging ────────────────────────────────────────────────────────────────
export const broadcastAlert = (data) => api.post('/messaging/broadcast', data)
export const previewBroadcast = (params) => api.get('/messaging/preview', { params })
export const getMessageLogs = (params) => api.get('/messaging/logs', { params })
export const getResidents = (params) => api.get('/messaging/residents', { params })
export const registerResident = (data) => api.post('/messaging/residents', data)
export const deleteResident = (id) => api.delete(`/messaging/residents/${id}`)
export const getLanguages = () => api.get('/messaging/languages')

export default api
