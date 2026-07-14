"""
api.py - FastAPI prediction service for the Smart Ministry Platform
Ministry of Digital Transition and Administration Reform - Morocco

This service loads the artifacts produced by train_model.py (risk_model.joblib,
preprocessor.joblib, label_encoder.joblib, feature_names.json) through the
RiskExplainer class in shap_explainer.py, and exposes them over HTTP.

IMPORTANT: this API deliberately does NOT use preprocess.py's DataPreprocessor.
train_model.py has its own independent preprocessing (build_xy + ColumnTransformer,
saved as preprocessor.joblib) -- that is what risk_model.joblib was actually trained
on. RiskExplainer.preprocess_input() replicates that exact pipeline. Routing
predictions through DataPreprocessor's separately-fit LabelEncoders/StandardScaler
instead would silently feed the model a feature representation it has never seen,
producing plausible-looking but meaningless predictions with no error raised.

USAGE:
    uvicorn api:app --reload --port 8000

ENDPOINTS:
    GET  /health            - liveness check + which artifacts are loaded
    POST /predict            - risk_level prediction + full SHAP explanation
    POST /predict/batch       - same, for a list of projects
    GET  /model-info          - feature count, risk classes, expected accuracy band
"""

import logging
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from explainability.shap_explainer import RiskExplainer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).resolve().parent / "models"

app = FastAPI(
    title="Smart Ministry Platform - Risk Prediction API",
    description="Digital transformation project risk classification with SHAP explanations",
    version="1.0.0",
)

# Dev-friendly CORS. Tighten allow_origins to your actual frontend origin(s) before
# deploying (e.g. ["https://your-dashboard.gov.ma"]) rather than leaving it wide open.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Loaded once at startup, reused across requests (this is why RiskExplainer's
# prediction cache is bounded rather than a plain dict -- see shap_explainer.py).
explainer: Optional[RiskExplainer] = None


@app.on_event("startup")
def load_model():
    global explainer
    try:
        explainer = RiskExplainer(model_dir=str(MODEL_DIR), cache_size=256)
        logger.info("✅ RiskExplainer loaded and ready")
    except FileNotFoundError as e:
        # Don't crash the whole process on startup if the model hasn't been trained
        # yet -- surface a clear 503 on /predict instead, and let /health report it.
        logger.error(f"❌ Model artifacts not found: {e}")
        explainer = None


def _require_explainer() -> RiskExplainer:
    if explainer is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Model not loaded. Run train_model.py to produce the model artifacts "
                f"in {MODEL_DIR}, then restart the API."
            ),
        )
    return explainer


# ===============================
# REQUEST / RESPONSE SCHEMAS
# ===============================

class ProjectInput(BaseModel):
    """Matches the raw project fields the training pipeline expects (see
    create_sample_project() in shap_explainer.py and generate_synthetic_data.py).
    Field defaults mirror reasonable dataset-wide medians so a partially-filled
    project can still be scored; for a real assessment, fill in as many fields as
    are known."""

    project_type: str = Field(..., examples=["e-Government Portal"])
    digital_service: str = Field(default="eGovernment")
    region: str = Field(..., examples=["Casablanca-Settat"])
    province: str = Field(..., examples=["Casablanca"])
    project_priority: str = Field(default="Medium", description="Low | Medium | High | Critical")
    strategic_importance: str = Field(default="Medium", description="Low | Medium | High | Critical")

    planned_budget_mad: float = Field(..., gt=0)
    budget_sufficiency: float = Field(default=1.0, ge=0)
    funding_source: str = Field(default="National Budget")

    planned_duration_days: int = Field(..., gt=0)
    procurement_delay_days: int = Field(default=0, ge=0)
    approval_delay_days: int = Field(default=0, ge=0)

    software_complexity: str = Field(default="Medium", description="Low | Medium | High | Very High")
    integration_complexity: str = Field(default="Medium", description="Low | Medium | High | Very High")
    frontend_framework: str = Field(default="React")
    backend_framework: str = Field(default="Node.js")
    database: str = Field(default="PostgreSQL")
    cloud_provider: str = Field(default="On-Premise")
    microservices: str = Field(default="No", description="Yes | No")
    api_count: int = Field(default=10, ge=0)
    legacy_systems: int = Field(default=0, ge=0)
    interoperability_score: float = Field(default=70.0, ge=0, le=100)

    ai_component: str = Field(default="No", description="Yes | No")
    ai_type: str = Field(default="None")
    ai_maturity: float = Field(default=0.0, ge=0, le=1)

    cybersecurity_level: str = Field(default="Medium", description="Low | Medium | High | Critical")
    encryption_level: str = Field(default="Basic")
    gdpr_compliance: str = Field(default="No", description="Yes | No")
    iso27001: str = Field(default="No", description="Yes | No")
    penetration_testing: str = Field(default="No", description="Yes | No")
    vulnerabilities_found: int = Field(default=0, ge=0)
    security_audit_score: float = Field(default=70.0, ge=0, le=100)

    team_size: int = Field(..., gt=0)
    senior_developers: int = Field(..., ge=0)
    vendor_experience: float = Field(default=3.0, ge=0, le=5)
    digital_skill_score: float = Field(default=60.0, ge=0, le=100)
    staff_turnover: float = Field(default=10.0, ge=0, le=100)
    scrum_maturity: str = Field(default="Medium", description="Low | Medium | High")

    testing_coverage: float = Field(default=70.0, ge=0, le=100)
    compliance_score: float = Field(default=80.0, ge=0, le=100)
    audit_findings: int = Field(default=0, ge=0)

    citizen_users: int = Field(default=10000, ge=0)
    expected_transactions: int = Field(default=1000, ge=0)
    digital_adoption_rate: float = Field(default=0.5, ge=0, le=1)
    citizen_complaints: int = Field(default=0, ge=0)
    system_availability_target: float = Field(default=99.5, ge=90, le=100)

    user_training: float = Field(default=60.0, ge=0, le=100)
    change_requests: int = Field(default=0, ge=0)
    digital_maturity: float = Field(default=0.6, ge=0, le=1)
    chatbot_usage: str = Field(default="Low", description="Low | Medium | High")


class FeatureContributionOut(BaseModel):
    feature: str
    feature_label: str
    feature_value: str
    shap_value: float
    impact: str
    icon: str


class PredictionResponse(BaseModel):
    prediction: str
    risk_score: float
    success_probability: float
    confidence: float
    risk_probabilities: dict
    top_features: List[dict]
    risk_breakdown: List[dict]
    recommendations: List[dict]
    digital_insights: dict


class BatchPredictionRequest(BaseModel):
    projects: List[ProjectInput]


# ===============================
# ROUTES
# ===============================

@app.get("/health")
def health():
    return {
        "status": "ok" if explainer is not None else "model_not_loaded",
        "model_dir": str(MODEL_DIR),
        "model_loaded": explainer is not None,
    }


@app.get("/model-info")
def model_info():
    exp = _require_explainer()
    return {
        "risk_levels": exp.risk_levels,
        "n_features": len(exp.feature_names) if exp.feature_names else None,
        "model_type": type(exp.model).__name__,
        "expected_accuracy_band": "85-90% (values above ~95% indicate a leakage bug, not a genuine result)",
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(project: ProjectInput):
    exp = _require_explainer()
    try:
        result = exp.explain_prediction(project.model_dump())
        return result
    except Exception as e:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=400, detail=f"Prediction failed: {e}")


@app.post("/predict/batch")
def predict_batch(request: BatchPredictionRequest):
    exp = _require_explainer()
    inputs = [p.model_dump() for p in request.projects]
    try:
        results = exp.explain_batch(inputs)
        return {"predictions": results, "count": len(results)}
    except Exception as e:
        logger.exception("Batch prediction failed")
        raise HTTPException(status_code=400, detail=f"Batch prediction failed: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)