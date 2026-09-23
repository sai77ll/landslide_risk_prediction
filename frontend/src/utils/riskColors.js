export const RISK_LEVELS = {
  LOW: {
    label: 'LOW', color: '#10B981', bg: 'rgba(16,185,129,0.12)',
    icon: '🟢', border: 'rgba(16,185,129,0.25)',
    text: 'Low Risk', description: 'Conditions do not indicate significant landslide risk.'
  },
  MODERATE: {
    label: 'MODERATE', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',
    icon: '🟡', border: 'rgba(245,158,11,0.25)',
    text: 'Moderate Risk', description: 'Some elevated conditions — monitor closely.'
  },
  HIGH: {
    label: 'HIGH', color: '#F97316', bg: 'rgba(249,115,22,0.12)',
    icon: '🟠', border: 'rgba(249,115,22,0.25)',
    text: 'High Risk', description: 'Significant risk factors present — vigilance required.'
  },
  CRITICAL: {
    label: 'CRITICAL', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',
    icon: '🔴', border: 'rgba(239,68,68,0.25)',
    text: 'Critical Risk', description: 'Immediate monitoring and potential evacuation required.'
  },
}

export const getRiskInfo = (level) => RISK_LEVELS[level] || RISK_LEVELS.LOW

export const getRiskColor = (level) => RISK_LEVELS[level]?.color || '#94A3B8'

export const PRIORITY_LEVELS = {
  CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'CRITICAL' },
  HIGH:     { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'HIGH' },
  MEDIUM:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'MEDIUM' },
  LOW:      { color: '#94A3B8', bg: 'rgba(107,114,128,0.12)', label: 'LOW' },
}

export const ALERT_LEVEL_COLORS = {
  emergency:     '#EF4444',
  warning:       '#F97316',
  advisory:      '#F59E0B',
  informational: '#3B82F6',
}

export const ALERT_LEVEL_ICONS = {
  emergency:     '🚨',
  warning:       '⚠️',
  advisory:      '🔶',
  informational: 'ℹ️',
}

export const STATUS_META = {
  reported:     { label: 'Reported', icon: '🟡', color: '#F59E0B' },
  under_review: { label: 'Under Review', icon: '🔵', color: '#3B82F6' },
  corroborated: { label: 'Corroborated', icon: '🟠', color: '#F97316' },
  verified:     { label: 'Verified', icon: '🟢', color: '#10B981' },
  rejected:     { label: 'Rejected', icon: '⚫', color: '#6B7280' },
}

export const getStatusMeta = (status) => STATUS_META[status] || STATUS_META.reported
