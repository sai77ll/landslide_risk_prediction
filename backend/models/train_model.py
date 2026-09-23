"""
ML model training script.
Trains a RandomForestClassifier on synthetic Himalayan terrain data
and saves the model and scaler for inference.
Run once: python -m models.train_model
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
import json

FEATURES = [
    "rainfall_mm",          # mm/day
    "rainfall_intensity",   # mm/hr
    "cumulative_rainfall",  # mm over 72h
    "soil_moisture",        # % saturation
    "slope_degrees",        # terrain slope angle
    "elevation_m",          # elevation in meters
    "vegetation_index",     # NDVI-like 0-1
    "geology_risk",         # categorical encoded 0-1
    "drainage_score",       # drainage capacity 0-1 (lower = worse)
]

LABELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"]
LABEL_MAP = {0: "LOW", 1: "MODERATE", 2: "HIGH", 3: "CRITICAL"}
LABEL_INT = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "CRITICAL": 3}


def generate_synthetic_data(n=5000, seed=42):
    """
    Generate realistic synthetic training data based on known landslide
    triggering conditions in the Indian Himalayas.
    """
    rng = np.random.default_rng(seed)

    rainfall_mm = rng.exponential(scale=25, size=n).clip(0, 300)
    rainfall_intensity = (rainfall_mm / 24 + rng.normal(0, 2, n)).clip(0, 50)
    cumulative_rainfall = (rainfall_mm * rng.uniform(1.5, 4.5, n)).clip(0, 800)
    soil_moisture = (
        0.3 * rainfall_mm / 300 + 0.5 * rng.beta(2, 3, n) + rng.normal(0, 0.05, n)
    ).clip(0.05, 1.0)
    slope_degrees = rng.uniform(0, 80, n)
    elevation_m = rng.uniform(200, 4500, n)
    vegetation_index = rng.beta(3, 2, n).clip(0, 1)
    geology_risk = rng.beta(2, 4, n).clip(0, 1)
    drainage_score = rng.beta(4, 2, n).clip(0.01, 1.0)

    # Compute a physics-inspired hazard index
    hazard = (
        0.28 * (rainfall_mm / 300)
        + 0.18 * (cumulative_rainfall / 800)
        + 0.20 * (slope_degrees / 80)
        + 0.15 * soil_moisture
        + 0.08 * geology_risk
        + 0.07 * (1 - vegetation_index)   # low vegetation → higher risk
        + 0.04 * (1 - drainage_score)      # poor drainage → higher risk
    )
    # Add noise
    hazard += rng.normal(0, 0.04, n)
    hazard = hazard.clip(0, 1)

    # Discretize into 4 classes
    labels = np.digitize(hazard, bins=[0.25, 0.50, 0.75]) # 0,1,2,3

    # Augment with synthetic extreme-condition samples to ensure CRITICAL class is present
    n_extreme = 800
    extreme = {
        "rainfall_mm": rng.uniform(180, 300, n_extreme),
        "rainfall_intensity": rng.uniform(15, 50, n_extreme),
        "cumulative_rainfall": rng.uniform(400, 800, n_extreme),
        "soil_moisture": rng.uniform(0.80, 1.0, n_extreme),
        "slope_degrees": rng.uniform(50, 80, n_extreme),
        "elevation_m": rng.uniform(800, 4000, n_extreme),
        "vegetation_index": rng.uniform(0.0, 0.25, n_extreme),
        "geology_risk": rng.uniform(0.70, 1.0, n_extreme),
        "drainage_score": rng.uniform(0.0, 0.20, n_extreme),
        "label": np.full(n_extreme, 3),  # CRITICAL
    }
    df_extreme = pd.DataFrame(extreme)

    df = pd.DataFrame({
        "rainfall_mm": rainfall_mm,
        "rainfall_intensity": rainfall_intensity,
        "cumulative_rainfall": cumulative_rainfall,
        "soil_moisture": soil_moisture,
        "slope_degrees": slope_degrees,
        "elevation_m": elevation_m,
        "vegetation_index": vegetation_index,
        "geology_risk": geology_risk,
        "drainage_score": drainage_score,
        "label": labels,
    })
    df = pd.concat([df, df_extreme], ignore_index=True)
    return df


def train_and_save():
    print("Generating synthetic training data...")
    df = generate_synthetic_data(n=8000)

    X = df[FEATURES]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print("Training RandomForest model...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    print(f"Test accuracy: {acc:.4f}")
    present_labels = sorted(set(y_test) | set(y_pred))
    present_names = [LABELS[i] for i in present_labels]
    print(classification_report(y_test, y_pred, labels=present_labels, target_names=present_names))

    # Feature importance from the model
    importances = model.feature_importances_
    feature_imp = {f: float(imp) for f, imp in zip(FEATURES, importances)}
    print("Feature importances:", json.dumps(feature_imp, indent=2))

    # Save model and scaler
    model_dir = os.path.dirname(os.path.abspath(__file__))
    joblib.dump(model, os.path.join(model_dir, "landslide_model.pkl"))
    joblib.dump(scaler, os.path.join(model_dir, "scaler.pkl"))

    meta = {
        "features": FEATURES,
        "labels": LABELS,
        "accuracy": acc,
        "feature_importances": feature_imp,
        "n_estimators": 200,
        "model_type": "RandomForestClassifier",
    }
    with open(os.path.join(model_dir, "model_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print("Model saved to models/landslide_model.pkl")
    return model, scaler, meta


if __name__ == "__main__":
    train_and_save()
