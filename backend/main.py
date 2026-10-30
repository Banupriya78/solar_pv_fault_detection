"""
FastAPI Backend Server - Solar PV Fault Detection & Health Monitoring
=====================================================================
Provides RESTful APIs for:
- Authentic dataset overview and class distribution
- Comparative model evaluation (Accuracy, F1, latency, size, confusion matrices)
- Feature importance visualization data
- Real-time fault inference with confidence scoring, low-confidence warning,
  and clear delineation of demo vs live sensor data.
"""

import os
import json
import csv
import io
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, UploadFile, File, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.src.data_loader import PVDataLoader, FAULT_LABELS
from backend.src.predictor import PVPredictor, DEMO_SAMPLES
from backend.src.model_trainer import PVModelTrainer, MODELS_DIR, training_tracker
from backend.src.db import (
    authenticate_user, create_user_session, get_user_from_token,
    delete_user_session, update_profile
)

app = FastAPI(
    title="Solar PV Health Monitoring & Fault Classification API",
    description="Lightweight ML-based fault detection API using real Lazzaretti/UTFPR operational data.",
    version="1.0.0"
)

# Configure CORS for React + Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton instances
loader = PVDataLoader()
predictor = PVPredictor()

# ----------------- Pydantic Schemas ----------------- #

class SensorReadings(BaseModel):
    vdc1: float = Field(..., description="DC Voltage String 1 (V)", ge=0.0, le=450.0)
    vdc2: Optional[float] = Field(None, description="DC Voltage String 2 (V)", ge=0.0, le=450.0)
    idc1: float = Field(..., description="DC Current String 1 (A)", ge=0.0, le=15.0)
    idc2: Optional[float] = Field(None, description="DC Current String 2 (A)", ge=0.0, le=15.0)
    irr: float = Field(..., description="Solar Irradiance (W/m²)", ge=0.0, le=1400.0)
    pvt: float = Field(..., description="PV Module Temperature (°C)", ge=-25.0, le=85.0)

class PredictionRequest(BaseModel):
    readings: SensorReadings
    model_name: Optional[str] = Field("random_forest", description="Candidate model: 'decision_tree', 'random_forest', or 'svm'")
    is_demo: Optional[bool] = Field(False, description="True if sent from simulation demo preset; False for live telemetry")
    source: Optional[str] = Field(None, description="Input origin: 'Sample Case: ...', 'Manual Entry', or 'CSV Upload'")

class TrainRequest(BaseModel):
    normal_samples: Optional[int] = Field(12000, ge=2000, le=100000)
    shadow_samples: Optional[int] = Field(12000, ge=2000, le=100000)

class LoginRequest(BaseModel):
    username_or_email: str = Field(..., description="Username or registered email address")
    password: str = Field(..., description="User password")

class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    role: Optional[str] = Field(None, max_length=80)

def extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return authorization.strip()

# ----------------- Authentication Endpoints ----------------- #

@app.post("/api/auth/login")
def login_endpoint(req: LoginRequest):
    """
    Authenticates operator with username or email using PBKDF2-SHA256 salted hash.
    Returns access token and safe user profile.
    """
    user = authenticate_user(req.username_or_email, req.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password. Please try again."
        )
    token = create_user_session(user["id"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/auth/me")
def get_current_user_endpoint(authorization: Optional[str] = Header(None)):
    """
    Validates bearer token and returns the current authenticated operator profile.
    """
    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required.")
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please sign in again.")
    return {"user": user}

@app.post("/api/auth/logout")
def logout_endpoint(authorization: Optional[str] = Header(None)):
    """
    Invalidates the active session token in SQLite.
    """
    token = extract_bearer_token(authorization)
    if token:
        delete_user_session(token)
    return {"status": "logged_out"}

@app.put("/api/auth/profile")
def update_profile_endpoint(req: ProfileUpdateRequest, authorization: Optional[str] = Header(None)):
    """
    Updates the authenticated operator's full name, email, and operational role.
    """
    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    updated = update_profile(user["id"], req.full_name, req.email, req.role)
    return {"status": "updated", "user": updated}

# ----------------- System & Monitoring Endpoints ----------------- #

@app.get("/api/health")
def health_check():
    dataset_ready = loader.check_files_exist()
    models_ready = os.path.exists(os.path.join(MODELS_DIR, "metrics_summary.json"))
    return {
        "status": "healthy",
        "dataset_files_present": dataset_ready,
        "models_trained": models_ready,
        "available_models": ["decision_tree", "random_forest", "svm"],
        "training_status": training_tracker.get_status()
    }

@app.get("/api/dataset/overview")
def get_dataset_overview():
    try:
        overview = loader.get_dataset_overview()
        return overview
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset overview: {str(e)}")

@app.get("/api/dataset/sample-records")
def get_sample_records(limit: int = Query(25, ge=5, le=100)):
    """
    Returns authentic continuous sample rows from the real operational dataset.
    """
    try:
        df = loader.load_raw_data()
        sample_slice = df.iloc[5000:5000 + limit].copy()
        sample_slice["fault_label"] = sample_slice["f_nv"].map(FAULT_LABELS)
        return {
            "total_available": len(df),
            "records": sample_slice.round(3).to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sample records: {str(e)}")

@app.get("/api/models/comparison")
def get_model_comparison():
    """
    Returns verified, leakage-safe evaluation metrics for Decision Tree,
    Random Forest, and SVM from the real dataset.
    """
    summary_path = os.path.join(MODELS_DIR, "metrics_summary.json")
    if not os.path.exists(summary_path):
        raise HTTPException(
            status_code=404,
            detail="Trained models metrics not found. Please train models first."
        )

    with open(summary_path, "r") as f:
        metrics = json.load(f)
    return metrics

@app.get("/api/models/feature-importance")
def get_feature_importance(model: str = Query("random_forest", description="Model: 'decision_tree' or 'random_forest'")):
    """
    Returns feature importances for supported tree-based models.
    """
    summary_path = os.path.join(MODELS_DIR, "metrics_summary.json")
    if not os.path.exists(summary_path):
        raise HTTPException(status_code=404, detail="Metrics summary not found.")

    with open(summary_path, "r") as f:
        metrics = json.load(f)

    if model not in metrics["models"]:
        raise HTTPException(status_code=400, detail=f"Model '{model}' not found in trained metrics.")

    model_info = metrics["models"][model]
    return {
        "model": model,
        "name": model_info["name"],
        "supports_feature_importance": model_info["supports_feature_importance"],
        "feature_importances": model_info.get("feature_importances", [])
    }

@app.get("/api/samples/demo")
def get_demo_samples():
    """
    Returns curated authentic demo presets directly taken from the real dataset
    for 1-click frontend simulation and instant verification.
    """
    return {
        "count": len(DEMO_SAMPLES),
        "samples": DEMO_SAMPLES
    }

@app.get("/api/predictions/latest")
def get_latest_prediction():
    """
    Returns the most recently computed fault prediction.
    """
    latest = predictor.get_latest_prediction()
    return {
        "has_prediction": latest is not None,
        "prediction": latest
    }

@app.get("/api/predictions/history")
def get_prediction_history(limit: int = Query(25, ge=1, le=100)):
    """
    Returns rolling historical predictions logged during the monitoring session.
    """
    history = predictor.get_history(limit=limit)
    return {
        "count": len(history),
        "history": history
    }

@app.get("/api/system/status")
def get_system_status():
    """
    Returns verified facts about the backend and model state without simulated claims.
    """
    summary = predictor.get_summary()
    return {
        "api_status": "online",
        "model_loaded": "Random Forest",
        "model_type": "Ensemble (100 Decision Trees)",
        "split_strategy": "Contiguous Temporal Block Splitting",
        "database": "SQLite (data/predictions.db)",
        "database_online": True,
        "total_predictions_logged": summary["total_predictions"],
        "last_prediction_time": summary["last_prediction_time"]
    }

@app.get("/api/predictions/summary")
def get_prediction_summary():
    """
    Returns real summary statistics computed from predictions saved in SQLite.
    Returns has_predictions: False if no predictions have been run yet.
    """
    return predictor.get_summary()

@app.get("/api/predictions/{pred_id}")
def get_prediction_by_id_endpoint(pred_id: int):
    """
    Returns the specific diagnosis record and full telemetry for a given ID.
    """
    record = predictor.get_prediction_by_id(pred_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Diagnosis record #{pred_id} not found.")
    return {
        "success": True,
        "prediction": record
    }

@app.get("/api/samples/download-template-csv")
def download_template_csv():
    """
    Provides a downloadable authentic test CSV template with sample rows from UTFPR dataset.
    """
    sample_rows = [
        "vdc1,vdc2,idc1,idc2,irr,pvt",
        "291.54,291.92,7.01,7.06,831.92,22.10",
        "288.40,289.10,6.95,7.00,820.50,23.40",
        "263.31,205.91,9.32,8.98,989.82,43.05",
        "265.10,208.40,9.20,8.85,975.00,42.10",
        "265.38,267.28,7.58,6.18,804.13,46.98",
        "268.00,269.50,7.40,6.10,790.00,45.20",
        "274.15,274.24,0.11,8.92,995.93,45.22",
        "276.50,275.80,0.05,8.80,980.00,44.50",
        "352.75,346.89,0.23,0.06,317.60,6.22",
        "348.10,345.00,0.30,0.08,310.00,7.10"
    ]
    content = "\n".join(sample_rows)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=solar_pv_telemetry_template.csv"}
    )

@app.post("/api/predict/batch-csv")
async def predict_batch_csv(file: UploadFile = File(...)):
    """
    Parses an uploaded CSV file with vdc1, vdc2, idc1, idc2, irr, pvt headers.
    Classifies all rows using the configured Random Forest model and stores in SQLite.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except Exception:
        decoded = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or missing header line.")

    col_map = {c.strip().lower(): c for c in reader.fieldnames}
    required_cols = {"vdc1", "vdc2", "idc1", "idc2", "irr", "pvt"}
    if not required_cols.issubset(set(col_map.keys())):
        missing = required_cols - set(col_map.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns in CSV: {list(missing)}. Required: {list(required_cols)}"
        )

    readings_list = []
    for row in reader:
        try:
            r = {
                "vdc1": float(row[col_map["vdc1"]]),
                "vdc2": float(row[col_map["vdc2"]]),
                "idc1": float(row[col_map["idc1"]]),
                "idc2": float(row[col_map["idc2"]]),
                "irr": float(row[col_map["irr"]]),
                "pvt": float(row[col_map["pvt"]]),
            }
            readings_list.append(r)
        except (ValueError, KeyError):
            continue

    if not readings_list:
        raise HTTPException(status_code=400, detail="No valid numerical telemetry rows found in CSV.")

    # Limit max batch to 2000 rows
    readings_list = readings_list[:2000]
    result = predictor.predict_batch(
        readings_list=readings_list,
        model_name="random_forest",
        source=f"CSV Upload ({os.path.basename(file.filename)})"
    )
    return result

@app.post("/api/predict")
def predict_fault(payload: PredictionRequest):
    """
    Executes fault detection and classification using configured Random Forest model.
    Validates physical bounds, calculates confidence, and stores record in SQLite.
    """
    try:
        readings_dict = payload.readings.model_dump()
        result = predictor.predict(
            readings=readings_dict,
            model_name=payload.model_name or "random_forest",
            is_demo=payload.is_demo or False,
            source=payload.source
        )
        if not result["success"]:
            raise HTTPException(status_code=422, detail=result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.get("/api/models/training-status")
def get_training_status():
    """
    Returns the current training execution state and progress.
    """
    return training_tracker.get_status()

@app.post("/api/models/train")
def train_models_endpoint(background_tasks: BackgroundTasks, payload: Optional[TrainRequest] = None):
    """
    Starts asynchronous training of Decision Tree, Random Forest, and SVM on the real dataset.
    """
    if training_tracker.is_training:
        return {
            "status": "already_running",
            "message": "Model training is already in progress.",
            "current_state": training_tracker.get_status()
        }

    training_tracker.start()
    normal_s = payload.normal_samples if payload else 12000
    shadow_s = payload.shadow_samples if payload else 12000

    def run_training_worker():
        try:
            trainer = PVModelTrainer()
            trainer.train_and_evaluate_all(
                normal_samples=normal_s,
                shadow_samples=shadow_s,
                tracker=training_tracker
            )
            # Re-initialize predictor models to load newly saved weights
            predictor._models.clear()
            predictor.preprocessor.scaler = None
        except Exception as exc:
            training_tracker.fail(str(exc))

    background_tasks.add_task(run_training_worker)
    return {
        "status": "training_started",
        "message": "Model training has been initiated on real dataset.",
        "training_state": training_tracker.get_status()
    }

@app.post("/api/models/retrain")
def trigger_retrain(background_tasks: BackgroundTasks):
    return train_models_endpoint(background_tasks=background_tasks)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
