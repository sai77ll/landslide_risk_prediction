import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/': { title: 'Situation Dashboard', subtitle: 'Real-time risk overview and emergency status' },
  '/map': { title: 'Risk Map', subtitle: 'Geographic risk zones and incident locations' },
  '/predict': { title: 'Risk Prediction', subtitle: 'AI-powered landslide risk assessment with SHAP explainability' },
  '/incidents': { title: 'Incident Management', subtitle: 'Report tracking, verification workflow, and response' },
  '/incidents/queue': { title: 'Priority Queue', subtitle: 'Emergency response prioritization' },
  '/report': { title: 'Report an Incident', subtitle: 'Submit a citizen or field officer landslide report' },
  '/alerts': { title: 'Active Alerts', subtitle: 'System warnings and emergency notifications' },
  '/analytics': { title: 'Historical Analytics', subtitle: 'Trends, patterns, and performance metrics' },
}

export default function Header({ onMenuToggle, systemStatus }) {
  const location = useLocation()

  const pathKey = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((k) => k === '/' ? location.pathname === '/' : location.pathname.startsWith(k))

  const pageInfo = PAGE_TITLES[pathKey] || { title: 'LandGuard', subtitle: '' }

  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  })

  return (
    <header className="header" role="banner">
      <div className="header-left">
        {/* Mobile menu button */}
        <button
          className="btn btn-secondary btn-sm"
          style={{ display: 'none', padding: '6px 10px' }}
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
          id="menu-toggle"
        >
          ☰
        </button>
        <div>
          <div className="header-title">{pageInfo.title}</div>
          <div className="header-subtitle">{pageInfo.subtitle}</div>
        </div>
      </div>

      <div className="header-right">
        {/* System status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            className="header-status-dot"
            style={{ background: systemStatus === 'ok' ? 'var(--risk-low)' : 'var(--risk-critical)' }}
            role="status"
            aria-label={systemStatus === 'ok' ? 'System operational' : 'System issue detected'}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {systemStatus === 'ok' ? 'System Operational' : 'System Issue'}
          </span>
        </div>

        <div
          style={{
            height: 20, width: 1, background: 'var(--border)'
          }}
          aria-hidden="true"
        />

        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          IST {now}
        </span>

        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 700,
            color: '#EF4444',
          }}
          role="status"
          aria-label="Decision support system — not for autonomous emergency commands"
        >
          ⚠️ DECISION SUPPORT ONLY
        </div>
      </div>
    </header>
  )
}
