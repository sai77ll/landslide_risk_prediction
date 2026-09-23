import { formatDistanceToNow, format } from 'date-fns'

export const timeAgo = (dateStr) => {
  if (!dateStr) return 'Unknown'
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

export const formatDate = (dateStr, fmt = 'MMM d, yyyy HH:mm') => {
  if (!dateStr) return 'N/A'
  try {
    return format(new Date(dateStr), fmt)
  } catch {
    return 'N/A'
  }
}

export const formatScore = (score) =>
  score != null ? `${Math.round(score)}/100` : 'N/A'

export const formatPct = (val) =>
  val != null ? `${Math.round(val)}%` : 'N/A'

export const formatNum = (val) =>
  val != null ? Number(val).toLocaleString() : 'N/A'

export const incidentTypeLabel = (type) => {
  const LABELS = {
    landslide: 'Landslide',
    rockfall: 'Rockfall',
    mudslide: 'Mudslide',
    ground_cracks: 'Ground Cracks',
    soil_movement: 'Soil Movement',
    road_blockage: 'Road Blockage',
    other: 'Other',
  }
  return LABELS[type] || type
}

export const severityLabel = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown'
