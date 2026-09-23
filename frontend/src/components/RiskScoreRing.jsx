import { getRiskColor } from '../utils/riskColors'

export default function RiskScoreRing({ score, level, confidence, size = 140 }) {
  const color = getRiskColor(level)
  const radius = size / 2 - 12
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference - (score / 100) * circumference

  return (
    <div className="risk-score-container">
      <div
        className="risk-score-ring"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Risk score: ${Math.round(score)} out of 100. Risk level: ${level}`}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--bg-input)"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${color}60)` }}
          />
        </svg>
        <div className="risk-score-ring-value">
          <span className="risk-score-number" style={{ color }}>{Math.round(score)}</span>
          <span className="risk-score-label">/ 100</span>
        </div>
      </div>

      {confidence != null && (
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Prediction confidence: <strong style={{ color: 'var(--text-secondary)' }}>{Math.round(confidence)}%</strong>
          </span>
        </div>
      )}
    </div>
  )
}
