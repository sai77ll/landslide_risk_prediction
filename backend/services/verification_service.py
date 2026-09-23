"""
Incident verification service — scores verification confidence
based on number of reports, evidence, and model prediction alignment.
"""
from typing import List, Dict, Optional


def compute_verification_confidence(
    report_count: int,
    has_photo: bool,
    has_field_report: bool,
    model_risk_score: Optional[float],
    road_blocked_reports: int,
    casualties_reported: bool,
) -> float:
    """
    Calculate an incident verification confidence score (0-100).
    This is a transparent, rule-based score — NOT a trained classifier.
    """
    score = 0.0

    # Base score from number of independent reports
    if report_count == 1:
        score += 20
    elif report_count == 2:
        score += 35
    elif report_count == 3:
        score += 50
    elif report_count >= 4:
        score += 60

    # Photo evidence
    if has_photo:
        score += 15

    # Field officer report (more credible than citizen)
    if has_field_report:
        score += 15

    # Model prediction alignment
    if model_risk_score is not None:
        if model_risk_score >= 75:
            score += 10
        elif model_risk_score >= 50:
            score += 5

    # Road blockage (physical evidence)
    if road_blocked_reports >= 2:
        score += 5

    # Casualties (serious indicator)
    if casualties_reported:
        score += 5

    return min(score, 100.0)


def determine_verification_status(confidence: float, manual_override: Optional[str] = None) -> str:
    """
    Map confidence score to verification status string.
    Manual override by an operator always takes precedence.
    """
    if manual_override:
        return manual_override

    if confidence >= 85:
        return "verified"
    elif confidence >= 60:
        return "corroborated"
    elif confidence >= 30:
        return "under_review"
    else:
        return "reported"


def get_status_label(status: str) -> Dict:
    """Return display metadata for a verification status."""
    STATUS_META = {
        "reported": {
            "label": "Reported",
            "color": "#F59E0B",
            "icon": "🟡",
            "description": "Initial report received, awaiting review",
        },
        "under_review": {
            "label": "Under Review",
            "color": "#3B82F6",
            "icon": "🔵",
            "description": "Report is being assessed by operators",
        },
        "corroborated": {
            "label": "Corroborated",
            "color": "#F97316",
            "icon": "🟠",
            "description": "Multiple reports or evidence support this incident",
        },
        "verified": {
            "label": "Verified",
            "color": "#10B981",
            "icon": "🟢",
            "description": "Incident confirmed by field team or authority",
        },
        "rejected": {
            "label": "Rejected",
            "color": "#EF4444",
            "icon": "🔴",
            "description": "Report determined to be inaccurate or false",
        },
    }
    return STATUS_META.get(status, STATUS_META["reported"])
