"""
Integration Tests for FastAPI Backend Endpoints
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["dataset_files_present"] is True
    assert data["models_trained"] is True

def test_dataset_overview_endpoint():
    res = client.get("/api/dataset/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["total_samples"] == 1373798
    assert len(data["class_distribution"]) == 5

def test_models_comparison_endpoint():
    res = client.get("/api/models/comparison")
    assert res.status_code == 200
    data = res.json()
    assert "models" in data
    assert "decision_tree" in data["models"]
    assert "random_forest" in data["models"]
    assert "svm" in data["models"]
    # Verify measured metrics exist and are non-zero
    for m in ["decision_tree", "random_forest", "svm"]:
        m_info = data["models"][m]
        assert m_info["accuracy"] > 0.80
        assert m_info["macro_f1"] > 0.85
        assert m_info["model_size_kb"] > 0
        assert m_info["inference_latency_ms"] > 0
        assert len(m_info["confusion_matrix"]) == 5

def test_predictions_history_endpoint():
    # Submit a prediction first to test persistence
    payload = {
        "readings": {
            "vdc1": 291.54,
            "vdc2": 291.92,
            "idc1": 7.01,
            "idc2": 7.06,
            "irr": 831.92,
            "pvt": 22.10
        },
        "model_name": "random_forest",
        "is_demo": True
    }
    client.post("/api/predict", json=payload)
    res = client.get("/api/predictions/history?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "history" in data
    assert isinstance(data["history"], list)
    assert len(data["history"]) > 0
    item = data["history"][0]
    assert "recommended_action" in item
    assert "severity_level" in item

def test_feature_importance_endpoint():
    res = client.get("/api/models/feature-importance?model=random_forest")
    assert res.status_code == 200
    data = res.json()
    assert data["supports_feature_importance"] is True
    assert len(data["feature_importances"]) > 0

def test_demo_samples_endpoint():
    res = client.get("/api/samples/demo")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 5
    assert len(data["samples"]) >= 5

def test_predict_endpoint_valid_demo():
    payload = {
        "readings": {
            "vdc1": 291.54,
            "vdc2": 291.92,
            "idc1": 7.01,
            "idc2": 7.06,
            "irr": 831.92,
            "pvt": 22.10
        },
        "model_name": "random_forest",
        "is_demo": True
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["prediction"]["class_id"] == 0
    assert data["prediction"]["label"] == "Normal Operation"
    assert data["prediction"]["is_demo"] is True
    assert data["prediction"]["source"] == "Pre-Configured Scenario"
    assert data["prediction"]["confidence"] > 0.80

def test_predict_endpoint_low_irradiance_warning():
    payload = {
        "readings": {
            "vdc1": 15.0,
            "vdc2": 15.0,
            "idc1": 0.05,
            "idc2": 0.04,
            "irr": 15.0,  # Below 50 W/m²
            "pvt": 5.0
        },
        "model_name": "decision_tree",
        "is_demo": False
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["prediction"]["is_low_confidence"] is True
    assert len(data["prediction"]["warnings"]) > 0

def test_predict_endpoint_invalid_values():
    payload = {
        "readings": {
            "vdc1": -50.0,  # Invalid
            "vdc2": 290.0,
            "idc1": 7.0,
            "idc2": 7.0,
            "irr": 800.0,
            "pvt": 25.0
        },
        "model_name": "random_forest",
        "is_demo": False
    }
    res = client.post("/api/predict", json=payload)
    # Pydantic validation error
    assert res.status_code == 422

def test_latest_prediction_endpoint():
    # Run a prediction first
    payload = {
        "readings": {
            "vdc1": 291.54,
            "vdc2": 291.92,
            "idc1": 7.01,
            "idc2": 7.06,
            "irr": 831.92,
            "pvt": 22.10
        },
        "model_name": "random_forest",
        "is_demo": True
    }
    client.post("/api/predict", json=payload)
    res = client.get("/api/predictions/latest")
    assert res.status_code == 200
    data = res.json()
    assert data["has_prediction"] is True
    assert data["prediction"]["label"] == "Normal Operation"

def test_training_status_endpoint():
    res = client.get("/api/models/training-status")
    assert res.status_code == 200
    data = res.json()
    assert "is_training" in data
    assert "progress_percent" in data
    assert "current_step" in data

def test_system_status_endpoint():
    res = client.get("/api/system/status")
    assert res.status_code == 200
    data = res.json()
    assert data["api_status"] == "online"
    assert data["model_loaded"] == "Random Forest"
    assert data["database_online"] is True

def test_predictions_summary_endpoint():
    res = client.get("/api/predictions/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_predictions" in data
    assert "fault_counts" in data
    assert "has_predictions" in data

def test_download_template_csv_endpoint():
    res = client.get("/api/samples/download-template-csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    text = res.text
    assert "vdc1,vdc2,idc1,idc2,irr,pvt" in text

def test_batch_csv_upload_endpoint():
    csv_data = (
        "vdc1,vdc2,idc1,idc2,irr,pvt\n"
        "291.54,291.92,7.01,7.06,831.92,22.10\n"
        "263.31,205.91,9.32,8.98,989.82,43.05\n"
    )
    files = {"file": ("test_batch.csv", csv_data, "text/csv")}
    res = client.post("/api/predict/batch-csv", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total_processed"] == 2
    assert data["processed_records"] == 2
    assert data["normal_operations"] == 1
    assert data["fault_count"] == 1
    assert data["faults_detected"] == 1
    assert data["normal_operations"] + data["fault_count"] == data["total_processed"]
    assert "fault_summary" in data


