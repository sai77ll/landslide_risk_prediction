"""
Emergency response prioritization service.
Computes a priority score (0-100) for each incident.
"""
from typing import Dict, Optional


def compute_priority_score(
    severity: str,
    verification_confidence: float,
    risk_score: Optional[float],
    people_affected: int,
    road_blocked: bool,
    hospitals_nearby: int,
    schools_nearby: int,
    response_status: str,
    hours_since_incident: float,
) -> Dict:
    """
    Compute a transparent, rule-based priority score.
    Returns: { score, level, factors, recommendation }
    """
    score = 0.0
    factors = []

    # 1. Severity (max 30 pts)
    severity_scores = {"critical": 30, "severe": 22, "moderate": 12, "minor": 5}
    sev_pts = severity_scores.get(severity.lower(), 5)
    score += sev_pts
    if sev_pts >= 22:
        factors.append(f"{'Critical' if sev_pts == 30 else 'Severe'} incident severity")

    # 2. Verification confidence (max 20 pts)
    conf_pts = min(verification_confidence / 5, 20)
    score += conf_pts
    if verification_confidence >= 80:
        factors.append("High verification confidence")
    elif verification_confidence >= 60:
        factors.append("Corroborated incident")

    # 3. Model risk score alignment (max 15 pts)
    if risk_score is not None:
        risk_pts = risk_score / 100 * 15
        score += risk_pts
        if risk_score >= 75:
            factors.append("Critical predicted risk zone")
        elif risk_score >= 50:
            factors.append("High predicted risk zone")

    # 4. People affected (max 15 pts)
    if people_affected > 500:
        pop_pts = 15
        factors.append(f"Large population affected ({people_affected}+)")
    elif people_affected > 100:
        pop_pts = 10
        factors.append(f"Significant population affected ({people_affected})")
    elif people_affected > 20:
        pop_pts = 6
        factors.append(f"Population affected ({people_affected})")
    else:
        pop_pts = max(0, people_affected / 20 * 5)
    score += pop_pts

    # 5. Road blockage (max 8 pts)
    if road_blocked:
        score += 8
        factors.append("Main road blocked")

    # 6. Critical infrastructure (max 7 pts)
    if hospitals_nearby > 0:
        score += min(hospitals_nearby * 3, 5)
        factors.append(f"Hospital(s) at risk nearby")
    if schools_nearby > 0:
        score += min(schools_nearby * 2, 4)
        factors.append(f"School(s) at risk nearby")

    # 7. Response urgency — longer wait = higher priority bump (max 5 pts)
    if response_status == "pending":
        urgency_pts = min(hours_since_incident * 0.5, 5)
        score += urgency_pts
        if hours_since_incident > 3:
            factors.append("Extended response delay")

    score = min(round(score, 1), 100.0)

    # Determine level
    if score >= 80:
        level = "CRITICAL"
        recommendation = "Immediate dispatch required. Activate emergency protocol."
    elif score >= 60:
        level = "HIGH"
        recommendation = "Dispatch field team within 30 minutes. Notify district authority."
    elif score >= 40:
        level = "MEDIUM"
        recommendation = "Schedule inspection within 2 hours. Monitor for updates."
    else:
        level = "LOW"
        recommendation = "Log for routine monitoring. Collect additional reports."

    return {
        "priority_score": score,
        "priority_level": level,
        "factors": factors,
        "recommendation": recommendation,
    }


def get_response_actions(priority_level: str, incident_type: str, road_blocked: bool) -> Dict:
    """Return recommended immediate and follow-up actions."""
    immediate = []
    followup = []

    if priority_level in ("CRITICAL", "HIGH"):
        immediate.append("Dispatch field verification team immediately")
        immediate.append("Alert District Disaster Management Authority")
        if road_blocked:
            immediate.append("Initiate road closure and traffic diversion")
        immediate.append("Alert nearby communities via SMS/broadcast")
        if priority_level == "CRITICAL":
            immediate.append("Activate emergency medical response standby")

    elif priority_level == "MEDIUM":
        immediate.append("Assign field verification team")
        immediate.append("Monitor situation closely")
        if road_blocked:
            immediate.append("Restrict heavy vehicle access to road")

    else:
        immediate.append("Log incident for routine follow-up")
        immediate.append("Request additional citizen reports from area")

    followup.append("Increase sensor monitoring frequency in affected zone")
    followup.append("Collect additional field photographs and evidence")
    followup.append("Assess potential secondary movement risk")
    followup.append("Document infrastructure damage for assessment")

    if incident_type in ("landslide", "mudslide"):
        followup.append("Evaluate slope stability for future movement")

    return {
        "immediate_actions": immediate,
        "followup_actions": followup,
        "disclaimer": "These are decision-support recommendations only. Final emergency decisions rest with authorized personnel.",
    }
