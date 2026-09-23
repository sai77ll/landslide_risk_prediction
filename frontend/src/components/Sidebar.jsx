import { useState, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'

const NAV_ITEMS = [
  { section: 'Overview' },
  { path: '/', label: 'Dashboard', icon: '📊', badge: null },
  { path: '/map', label: 'Risk Map', icon: '🗺️', badge: null },

  { section: 'Prediction' },
  { path: '/predict', label: 'Predict Risk', icon: '🧠', badge: null },
  { path: '/analytics', label: 'Analytics', icon: '📈', badge: null },

  { section: 'Incidents' },
  { path: '/incidents', label: 'All Incidents', icon: '⚡', badge: null },
  { path: '/incidents/queue', label: 'Priority Queue', icon: '🚨', badge: 'active' },
  { path: '/report', label: 'Report Incident', icon: '📝', badge: null },

  { section: 'System' },
  { path: '/alerts', label: 'Active Alerts', icon: '🔔', badge: 'alerts' },
  { path: '/messaging', label: 'Messaging', icon: '📢', badge: null },
]

export default function Sidebar({ isOpen, onClose, alertCount, incidentCount, theme, onThemeToggle }) {
  const location = useLocation()

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 190, display: 'none'
          }}
          className="mobile-overlay"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Main navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">🏔️</div>
          <div className="sidebar-logo-text">
            <h1>LandGuard</h1>
            <span>Risk Intelligence</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, i) => {
            if (item.section) {
              return (
                <div key={i} className="sidebar-section-label">{item.section}</div>
              )
            }
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)

            const badge = item.badge === 'active'
              ? incidentCount
              : item.badge === 'alerts'
              ? alertCount
              : null

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
                {badge > 0 && (
                  <span className="nav-badge" role="status" aria-label={`${badge} active`}>
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle at bottom */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div className="theme-toggle" role="group" aria-label="Color theme">
            <button
              className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeToggle('dark')}
              aria-pressed={theme === 'dark'}
            >
              🌙 Dark
            </button>
            <button
              className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => onThemeToggle('light')}
              aria-pressed={theme === 'light'}
            >
              ☀️ Light
            </button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
            Decision-Support System v1.0
          </p>
        </div>
      </aside>
    </>
  )
}
