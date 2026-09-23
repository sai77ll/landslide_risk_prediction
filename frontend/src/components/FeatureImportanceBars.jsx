export default function FeatureImportanceBars({ contributions = [] }) {
  const top = contributions.slice(0, 8)

  return (
    <div className="feature-bar-container" role="list" aria-label="Feature importance analysis">
      {top.map((c) => (
        <div
          key={c.feature}
          className="feature-bar-item"
          role="listitem"
          aria-label={`${c.label}: ${c.importance_pct.toFixed(1)}% importance, ${c.impact} impact`}
        >
          <div className="feature-bar-label">
            <span className="feature-bar-icon" aria-hidden="true">{c.icon}</span>
            <span className="truncate">{c.label}</span>
          </div>
          <div className="feature-bar-track" title={`${c.importance_pct.toFixed(1)}%`}>
            <div
              className="feature-bar-fill"
              style={{
                width: `${c.importance_pct}%`,
                background: c.direction === 'decreasing_risk'
                  ? 'linear-gradient(90deg, #10B981, #059669)'
                  : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
              }}
            />
          </div>
          <span className="feature-bar-pct">{c.importance_pct.toFixed(1)}%</span>
          <span className={`feature-impact-badge ${c.impact.toLowerCase().replace(' ', '-')}`}>
            {c.impact}
          </span>
        </div>
      ))}
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        * Percentages represent SHAP-based feature contribution to this prediction.
        Purple bars increase risk; green bars decrease risk.
      </p>
    </div>
  )
}
