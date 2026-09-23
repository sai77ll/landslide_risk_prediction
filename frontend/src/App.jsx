import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import RiskMap from './pages/RiskMap'
import PredictionPage from './pages/PredictionPage'
import { IncidentList, IncidentDetail, PriorityQueuePage } from './pages/Incidents'
import ReportForm from './pages/ReportForm'
import Analytics from './pages/Analytics'
import AlertsPage from './pages/AlertsPage'
import MessagingPage from './pages/MessagingPage'
import { getAnalyticsSummary, getAlerts, getHealth } from './utils/api'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const [incidentCount, setIncidentCount] = useState(0)
  const [systemStatus, setSystemStatus] = useState('checking')

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Poll summary and alerts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [s, a, h] = await Promise.all([
          getAnalyticsSummary(),
          getAlerts({ active_only: true, limit: 1 }),
          getHealth(),
        ])
        setIncidentCount(s.active_incidents || 0)
        setAlertCount(s.active_alerts || 0)
        setSystemStatus(h.status || 'ok')
      } catch {
        setSystemStatus('error')
      }
    }
    fetchCounts()
    const interval = setInterval(fetchCounts, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <BrowserRouter>
      <div className="app-layout" data-theme={theme}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          alertCount={alertCount}
          incidentCount={incidentCount}
          theme={theme}
          onThemeToggle={setTheme}
        />
        <div className="main-content">
          <Header
            onMenuToggle={() => setSidebarOpen((o) => !o)}
            systemStatus={systemStatus}
          />
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/map" element={<RiskMap />} />
              <Route path="/predict" element={<PredictionPage />} />
              <Route path="/incidents" element={<IncidentList />} />
              <Route path="/incidents/queue" element={<PriorityQueuePage />} />
              <Route path="/incidents/:id" element={<IncidentDetail />} />
              <Route path="/report" element={<ReportForm />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/messaging" element={<MessagingPage />} />
              <Route path="*" element={
                <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <h2>Page Not Found</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>The requested page does not exist.</p>
                  <a href="/" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-block' }}>Return to Dashboard</a>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
