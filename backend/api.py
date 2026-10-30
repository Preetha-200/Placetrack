"""
FastAPI Prediction Service for PlaceTrack AI Placement Readiness.
Serves:
- POST /predict: Predicts student readiness score, category, strongest/weakest skills, recommendations
- GET /model-metrics: Evaluated comparison metrics across Logistic Regression, Decision Tree, Random Forest
- GET /health: Healthcheck
"""

import os
import json
import joblib
import numpy as np
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Security, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader

try:
    from .recommendations import analyze_skills, generate_recommendations
except ImportError:
    from recommendations import analyze_skills, generate_recommendations

# Support local .env file when python-dotenv is present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Minimal fallback .env parser if python-dotenv is not installed
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_file):
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startsWith('#') if hasattr(line, 'startsWith') else (line and not line.startswith('#')):
                        if '=' in line:
                            k, v = line.split('=', 1)
                            k, v = k.strip(), v.strip().strip("'\"")
                            if k not in os.environ:
                                os.environ[k] = v
        except Exception:
            pass

app = FastAPI(
    title="PlaceTrack AI Readiness Prediction Service",
    description="Machine Learning service for predicting campus recruitment preparation readiness and generating personalized skill recommendations.",
    version="1.0.0"
)

# Secure internal service-to-server connection
INTERNAL_SERVICE_SECRET = os.environ.get("ML_SERVICE_SECRET")
api_key_header = APIKeyHeader(name="X-Internal-Service-Key", auto_error=False)

def verify_internal_service_key(api_key: str = Security(api_key_header)):
    if not INTERNAL_SERVICE_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Server security configuration error: ML_SERVICE_SECRET must be configured in environment."
        )
    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized: Missing X-Internal-Service-Key header")
    if api_key != INTERNAL_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid internal service key")
    return True

# Dynamic CORS configuration for local dev and production Vercel frontend
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    for raw_url in [u.strip() for u in frontend_url.split(",") if u.strip()]:
        if raw_url not in allowed_origins:
            allowed_origins.append(raw_url)
        clean_url = raw_url.rstrip("/")
        if clean_url not in allowed_origins:
            allowed_origins.append(clean_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'best_model.joblib')
METRICS_PATH = os.path.join(BASE_DIR, 'models', 'evaluation_metrics.json')

# Global model state
model_bundle = None
evaluation_metrics = {}

@app.on_event("startup")
def load_model():
    global model_bundle, evaluation_metrics
    if os.path.exists(MODEL_PATH):
        try:
            model_bundle = joblib.load(MODEL_PATH)
            print(f"[STARTUP] Successfully loaded model bundle from {MODEL_PATH}")
        except Exception as e:
            print(f"[STARTUP ERROR] Failed to load model: {e}")
    else:
        print(f"[STARTUP WARNING] Model file not found at {MODEL_PATH}")

    if os.path.exists(METRICS_PATH):
        try:
            with open(METRICS_PATH, 'r', encoding='utf-8') as f:
                evaluation_metrics = json.load(f)
            print(f"[STARTUP] Successfully loaded evaluation metrics.")
        except Exception as e:
            print(f"[STARTUP ERROR] Failed to load metrics: {e}")

class StudentFeaturesInput(BaseModel):
    aptitude_score: float = Field(..., ge=0, le=100, description="Quantitative Aptitude Score (0-100)")
    verbal_score: float = Field(..., ge=0, le=100, description="Verbal Ability Score (0-100)")
    logical_score: float = Field(..., ge=0, le=100, description="Logical Reasoning Score (0-100)")
    technical_score: float = Field(..., ge=0, le=100, description="Technical Skills Score (0-100)")
    completion_rate: Optional[float] = Field(default=80.0, ge=0, le=100, description="Assessment Completion Rate (0-100)")
    mock_interview_score: Optional[float] = Field(default=None, ge=0, le=100, description="Mock Interview Score (0-100)")
    historical_performance: Optional[float] = Field(default=None, ge=0, le=100, description="Historical Average Score (0-100)")
    student_id: Optional[str] = None
    student_name: Optional[str] = None

class PredictionOutput(BaseModel):
    readiness_score: float
    readiness_category: str
    confidence_score: float
    strongest_skills: List[Dict[str, Any]]
    weakest_skills: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    suggested_assessments: List[Dict[str, Any]]
    input_features: Dict[str, float]
    model_version: str
    model_algorithm: str
    disclaimer: str

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "PlaceTrack AI Readiness Prediction Engine",
        "model_loaded": model_bundle is not None,
        "model_version": model_bundle.get("version", "unknown") if model_bundle else "none"
    }

@app.get("/model-metrics")
def get_metrics():
    if not evaluation_metrics:
        raise HTTPException(status_code=404, detail="Model evaluation metrics not yet computed.")
    return evaluation_metrics

@app.post("/predict", response_model=PredictionOutput, dependencies=[Depends(verify_internal_service_key)])
def predict_readiness(data: StudentFeaturesInput):
    # Impute missing optional features intelligently
    apt = float(data.aptitude_score)
    vrb = float(data.verbal_score)
    log = float(data.logical_score)
    tech = float(data.technical_score)
    comp = float(data.completion_rate if data.completion_rate is not None else 80.0)

    # Mock interview fallback: weighted verbal + technical
    if data.mock_interview_score is not None:
        mock = float(data.mock_interview_score)
    else:
        mock = round(0.4 * vrb + 0.6 * tech, 1)

    # Historical performance fallback: average of 4 core domains
    if data.historical_performance is not None:
        hist = float(data.historical_performance)
    else:
        hist = round((apt + vrb + log + tech) / 4.0, 1)

    features_dict = {
        'aptitude_score': apt,
        'verbal_score': vrb,
        'logical_score': log,
        'technical_score': tech,
        'completion_rate': comp,
        'mock_interview_score': mock,
        'historical_performance': hist
    }

    feature_cols = [
        'aptitude_score',
        'verbal_score',
        'logical_score',
        'technical_score',
        'completion_rate',
        'mock_interview_score',
        'historical_performance'
    ]

    import pandas as pd
    features_df = pd.DataFrame([features_dict], columns=feature_cols)

    # Execute ML Inference
    if model_bundle:
        clf = model_bundle['classifier']
        reg = model_bundle.get('regressor')
        scaler = model_bundle.get('scaler')

        # Compatibility check for scikit-learn cross-version unpickling
        if not hasattr(clf, 'multi_class'):
            setattr(clf, 'multi_class', 'auto')

        try:
            # If classifier requires scaling (like Logistic Regression)
            if hasattr(clf, 'coef_') and scaler is not None:
                scaled_vec = scaler.transform(features_df)
                cat_pred = clf.predict(scaled_vec)[0]
                try:
                    if hasattr(clf, 'predict_proba'):
                        probs = clf.predict_proba(scaled_vec)[0]
                        conf = float(np.max(probs) * 100)
                    else:
                        conf = 88.0
                except Exception:
                    conf = 88.0
            else:
                cat_pred = clf.predict(features_df)[0]
                try:
                    if hasattr(clf, 'predict_proba'):
                        probs = clf.predict_proba(features_df)[0]
                        conf = float(np.max(probs) * 100)
                    else:
                        conf = 88.0
                except Exception:
                    conf = 88.0
        except Exception as pred_err:
            print(f"[ML WARNING] Classifier prediction fallback: {pred_err}")
            cat_pred = 'High' if (0.28 * tech + 0.20 * apt + 0.16 * log + 0.16 * vrb + 0.10 * mock + 0.10 * comp) >= 75 else 'Moderate'
            conf = 85.0

        # Continuous score prediction
        if reg:
            try:
                score_pred = float(reg.predict(features_df)[0])
            except Exception as reg_err:
                print(f"[ML WARNING] Regressor prediction fallback: {reg_err}")
                score_pred = float(0.28 * tech + 0.20 * apt + 0.16 * log + 0.16 * vrb + 0.10 * mock + 0.10 * comp)
        else:
            score_pred = float(0.28 * tech + 0.20 * apt + 0.16 * log + 0.16 * vrb + 0.10 * mock + 0.10 * comp)

        algo_name = evaluation_metrics.get('best_algorithm', 'Machine Learning Ensemble')
        version = model_bundle.get('version', 'placetrack-rf-v1.0')
    else:
        # Transparent statistical heuristic fallback if model bundle is reloading
        score_pred = float(0.28 * tech + 0.20 * apt + 0.16 * log + 0.16 * vrb + 0.10 * mock + 0.10 * comp)
        if score_pred >= 75.0:
            cat_pred = 'High'
        elif score_pred >= 60.0:
            cat_pred = 'Moderate'
        else:
            cat_pred = 'Needs Improvement'
        conf = 85.0
        algo_name = 'Statistical Regression Baseline'
        version = 'placetrack-v1.0-fallback'

    score_pred = round(float(np.clip(score_pred, 0, 100)), 1)
    conf = round(float(conf), 1)

    # Analyze strongest and weakest skills
    skills_analysis = analyze_skills(features_dict)
    recs = generate_recommendations(features_dict, cat_pred)

    return PredictionOutput(
        readiness_score=score_pred,
        readiness_category=cat_pred,
        confidence_score=conf,
        strongest_skills=skills_analysis['strongest_skills'],
        weakest_skills=skills_analysis['weakest_skills'],
        recommendations=recs['recommendations'],
        suggested_assessments=recs['suggested_assessments'],
        input_features=features_dict,
        model_version=version,
        model_algorithm=algo_name,
        disclaimer="AI Placement Preparation Readiness Estimate — An algorithmic estimation based on performance data; does not guarantee campus placement."
    )

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
