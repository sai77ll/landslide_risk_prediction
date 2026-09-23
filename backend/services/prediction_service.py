"""
ML inference service — loads the trained RandomForest model and
provides prediction + SHAP-based explainability.
"""
import os
import json
import numpy as np
import joblib
import shap
from typing import Dict, List, Optional

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")

FEATURES = [
    "rainfall_mm",
    "rainfall_intensity",
    "cumulative_rainfall",
    "soil_moisture",
    "slope_degrees",
    "elevation_m",
    "vegetation_index",
    "geology_risk",
    "drainage_score",
]

FEATURE_LABELS = {
    "rainfall_mm": "Rainfall (mm/day)",
    "rainfall_intensity": "Rainfall Intensity (mm/hr)",
    "cumulative_rainfall": "Cumulative Rainfall 72h",
    "soil_moisture": "Soil Moisture",
    "slope_degrees": "Slope Angle",
    "elevation_m": "Elevation",
    "vegetation_index": "Vegetation Cover",
    "geology_risk": "Geological Risk",
    "drainage_score": "Drainage Capacity",
}

FEATURE_ICONS = {
    "rainfall_mm": "🌧️",
    "rainfall_intensity": "⛈️",
    "cumulative_rainfall": "🌊",
    "soil_moisture": "💧",
    "slope_degrees": "⛰️",
    "elevation_m": "🏔️",
    "vegetation_index": "🌱",
    "geology_risk": "🪨",
    "drainage_score": "🌀",
}

LABELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"]
RISK_SCORE_MAP = {"LOW": (0, 25), "MODERATE": (26, 50), "HIGH": (51, 75), "CRITICAL": (76, 100)}


class PredictionService:
    """Singleton service that loads the ML model once and serves predictions."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def load(self):
        """Load the model, scaler, and SHAP explainer from disk."""
        model_path = os.path.join(MODEL_DIR, "landslide_model.pkl")
        scaler_path = os.path.join(MODEL_DIR, "scaler.pkl")
        meta_path = os.path.join(MODEL_DIR, "model_meta.json")

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model not found at {model_path}. Run: python -m models.train_model"
            )

        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)

        with open(meta_path) as f:
            self.meta = json.load(f)

        # Create a SHAP TreeExplainer (fast for RandomForest)
        self.explainer = shap.TreeExplainer(self.model)
        self._loaded = True
        print("[OK] ML model loaded successfully")

    def ensure_loaded(self):
        if not self._loaded:
            self.load()

    def predict(self, inputs: Dict) -> Dict:
        """
        Run a single prediction given a dictionary of feature values.

        Returns:
            dict with risk_score, risk_level, confidence, feature_contributions,
            shap_values, explanation_text
        """
        self.ensure_loaded()

        # Build feature vector
        x = np.array([[inputs.get(f, 0.0) for f in FEATURES]])
        x_scaled = self.scaler.transform(x)

        # Predict class probabilities
        probas = self.model.predict_proba(x_scaled)[0]  # shape (4,)
        predicted_class = int(np.argmax(probas))
        risk_level = LABELS[predicted_class]

        # Convert class probabilities to a 0-100 risk score
        # Weighted sum: LOW=0, MOD=33, HIGH=66, CRIT=100
        weights = np.array([0, 33, 66, 100])
        risk_score = float(np.dot(probas, weights))

        # Confidence = max probability
        confidence = float(np.max(probas)) * 100

        # SHAP values for the predicted class
        shap_values = self.explainer.shap_values(x_scaled)
        if isinstance(shap_values, np.ndarray):
            if shap_values.ndim == 3:
                # Shape: (n_samples, n_features, n_classes)
                shap_for_class = shap_values[0, :, predicted_class]
            elif shap_values.ndim == 2:
                shap_for_class = shap_values[0, :]
            else:
                shap_for_class = shap_values.flatten()[:len(FEATURES)]
        elif isinstance(shap_values, list):
            if len(shap_values) > predicted_class:
                shap_for_class = shap_values[predicted_class][0]
            else:
                shap_for_class = shap_values[0][0]
        else:
            shap_for_class = np.zeros(len(FEATURES))

        # Normalize SHAP values to percentages
        shap_abs = np.abs(shap_for_class)
        shap_sum = shap_abs.sum()
        if shap_sum > 0:
            shap_pct = (shap_abs / shap_sum * 100).tolist()
        else:
            shap_pct = [0.0] * len(FEATURES)

        # Build feature contributions sorted by importance
        contributions = []
        for i, f in enumerate(FEATURES):
            raw_val = inputs.get(f, 0.0)
            shap_val = float(shap_for_class[i])
            importance_pct = shap_pct[i]

            # Determine impact level
            if importance_pct >= 25:
                impact = "Very High"
            elif importance_pct >= 15:
                impact = "High"
            elif importance_pct >= 8:
                impact = "Moderate"
            else:
                impact = "Low"

            contributions.append({
                "feature": f,
                "label": FEATURE_LABELS[f],
                "icon": FEATURE_ICONS[f],
                "value": raw_val,
                "shap_value": shap_val,
                "importance_pct": round(importance_pct, 1),
                "impact": impact,
                "direction": "increasing_risk" if shap_val > 0 else "decreasing_risk",
            })

        contributions.sort(key=lambda x: x["importance_pct"], reverse=True)

        # Generate plain-language explanation
        top_factors = [c for c in contributions if c["importance_pct"] >= 10]
        explanation = _build_explanation(risk_level, top_factors, inputs)

        return {
            "risk_score": round(risk_score, 1),
            "risk_level": risk_level,
            "confidence": round(confidence, 1),
            "class_probabilities": {
                LABELS[i]: round(float(p) * 100, 1) for i, p in enumerate(probas)
            },
            "feature_contributions": contributions,
            "explanation": explanation,
            "model_version": "1.0-rf",
            "features_used": FEATURES,
        }

    def batch_predict(self, inputs_list: List[Dict]) -> List[Dict]:
        """Predict for multiple zones at once."""
        return [self.predict(inp) for inp in inputs_list]


def _build_explanation(risk_level: str, top_factors: List[Dict], inputs: Dict) -> str:
    """Generate a plain-English explanation of the prediction."""
    factor_names = [f["label"] for f in top_factors[:3]]

    level_desc = {
        "LOW": "low landslide risk",
        "MODERATE": "moderate landslide risk with some concerning conditions",
        "HIGH": "elevated landslide risk requiring close monitoring",
        "CRITICAL": "critical landslide risk requiring immediate attention",
    }

    if not factor_names:
        return f"The area shows {level_desc.get(risk_level, 'an uncertain risk level')} based on current environmental conditions."

    factor_str = ", ".join(factor_names[:-1])
    if len(factor_names) > 1:
        factor_str += f" and {factor_names[-1]}"
    else:
        factor_str = factor_names[0]

    rainfall = inputs.get("rainfall_mm", 0)
    slope = inputs.get("slope_degrees", 0)
    soil_moisture = inputs.get("soil_moisture", 0)

    context_parts = []
    if rainfall > 80:
        context_parts.append("heavy recent rainfall")
    elif rainfall > 40:
        context_parts.append("moderate recent rainfall")
    if slope > 45:
        context_parts.append("very steep terrain")
    elif slope > 25:
        context_parts.append("moderately steep terrain")
    if soil_moisture > 0.75:
        context_parts.append("saturated soil conditions")
    elif soil_moisture > 0.5:
        context_parts.append("elevated soil moisture")

    context = " combined with ".join(context_parts) if context_parts else "current environmental conditions"

    return (
        f"The area is currently showing {level_desc.get(risk_level, 'uncertain risk')}. "
        f"The primary risk drivers are {factor_str}. "
        f"This prediction is based on {context}. "
        f"All predictions are estimates — field verification is required before emergency action."
    )


# Module-level singleton
prediction_service = PredictionService()
