"""
PV Fault Classification and Inference Engine
============================================
Performs real-time fault detection and health monitoring on incoming telemetry.
Calculates class probabilities, assigns confidence, warns on low-confidence regimes,
and provides physical engineering diagnostic explanations.
"""

import os
import time
from typing import Dict, Any, List, Optional
import numpy as np
import joblib

from backend.src.data_loader import (
    FAULT_LABELS, FAULT_SEVERITY, FAULT_DESCRIPTIONS, FAULT_DESCRIPTIONS_SINGLE,
    FAULT_ACTIONS, FAULT_ACTIONS_SINGLE, FAULT_SEVERITY_LEVEL
)
from backend.src.data_validator import DataValidator, LOW_IRRADIANCE_THRESHOLD
from backend.src.preprocessor import PVPreprocessor
from backend.src.db import (
    init_db, insert_prediction, insert_batch,
    get_history as db_get_history,
    get_summary as db_get_summary,
    get_prediction_by_id as db_get_prediction_by_id
)

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
CONFIDENCE_THRESHOLD = 0.70

# Real operational presets curated directly from UTFPR field testbed
SCENARIO_PRESETS = [
    {
        "id": "scenario-normal",
        "title": "Healthy Operating Baseline",
        "expected_class": 0,
        "expected_label": "Normal Operation",
        "description": "Balanced string voltages (~291V) and symmetric currents (~7.0A) under clear 831 W/m² irradiance.",
        "readings": {
            "vdc1": 291.54,
            "vdc2": 291.92,
            "idc1": 7.01,
            "idc2": 7.06,
            "irr": 831.92,
            "pvt": 22.10
        }
    },
    {
        "id": "scenario-short-circuit",
        "title": "String 2 Inter-Module Short-Circuit",
        "expected_class": 1,
        "expected_label": "Short-Circuit",
        "description": "String 2 exhibits ~205V vs String 1 ~263V (~58V drop corresponding to 2 bypassed modules).",
        "readings": {
            "vdc1": 263.31,
            "vdc2": 205.91,
            "idc1": 9.32,
            "idc2": 8.98,
            "irr": 989.82,
            "pvt": 43.05
        }
    },
    {
        "id": "scenario-degradation",
        "title": "Series Resistance Degradation",
        "expected_class": 2,
        "expected_label": "Degradation",
        "description": "Resistive degradation causes String 2 current to lag String 1 (6.18A vs 7.58A) at 804 W/m².",
        "readings": {
            "vdc1": 265.38,
            "vdc2": 267.28,
            "idc1": 7.58,
            "idc2": 6.18,
            "irr": 804.13,
            "pvt": 46.98
        }
    },
    {
        "id": "scenario-open-circuit",
        "title": "String 1 Open Circuit Disconnection",
        "expected_class": 3,
        "expected_label": "Open-Circuit",
        "description": "String 1 main circuit breaker open: current collapses to 0.11A while String 2 supplies 8.92A.",
        "readings": {
            "vdc1": 1.65,
            "vdc2": 274.24,
            "idc1": 0.11,
            "idc2": 8.92,
            "irr": 995.93,
            "pvt": 45.22
        }
    },
    {
        "id": "scenario-shadowing",
        "title": "Partial Array Shading",
        "expected_class": 4,
        "expected_label": "Shadowing",
        "description": "Partial shade cast by adjacent building causes high string voltages near Voc with suppressed current.",
        "readings": {
            "vdc1": 352.75,
            "vdc2": 346.89,
            "idc1": 0.23,
            "idc2": 0.06,
            "irr": 317.60,
            "pvt": 6.22
        }
    },
    {
        "id": "scenario-low-irradiance",
        "title": "Standby Dawn / Low Irradiance",
        "expected_class": 0,
        "expected_label": "Normal Operation (Standby)",
        "description": "Early morning low sunlight (15 W/m²); illustrates automatic low-irradiance caution state.",
        "readings": {
            "vdc1": 12.4,
            "vdc2": 11.8,
            "idc1": 0.05,
            "idc2": 0.03,
            "irr": 15.0,
            "pvt": 5.2
        }
    }
]

DEMO_SAMPLES = SCENARIO_PRESETS

class PVPredictor:
    def __init__(self, models_dir: str = MODELS_DIR):
        self.models_dir = models_dir
        self.preprocessor = PVPreprocessor(models_dir=self.models_dir)
        self._models = {}
        self.latest_prediction = None
        init_db()

    def get_latest_prediction(self) -> Optional[Dict[str, Any]]:
        if self.latest_prediction is not None:
            return self.latest_prediction
        summary = db_get_summary()
        return summary.get("latest_prediction")

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        return db_get_history(limit=limit)

    def get_prediction_by_id(self, pred_id: int) -> Optional[Dict[str, Any]]:
        return db_get_prediction_by_id(pred_id=pred_id)

    def get_summary(self) -> Dict[str, Any]:
        return db_get_summary()

    def get_model(self, model_key: str):
        if model_key not in self._models:
            valid_keys = ["decision_tree", "random_forest", "svm"]
            if model_key not in valid_keys:
                raise ValueError(f"Unknown model '{model_key}'. Allowed: {valid_keys}")

            model_path = os.path.join(self.models_dir, f"{model_key}.joblib")
            if not os.path.exists(model_path):
                raise FileNotFoundError(
                    f"Trained model '{model_key}' not found at {model_path}. "
                    "Run 'python -m backend.src.model_trainer' first."
                )
            self._models[model_key] = joblib.load(model_path)

        return self._models[model_key]

    def predict(
        self,
        readings: Dict[str, float],
        model_name: str = "random_forest",
        is_demo: bool = False,
        source: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes real-time fault inference.
        Returns detailed classification, confidence, warnings, and source tag.
        Persists record into SQLite for verified auditability.
        """
        t_start = time.perf_counter()

        # 1. Handle Single Line Mode (Auto-synthesize ideal reference for Line 2 if omitted)
        irr_val = float(readings.get("irr", 800.0) or 800.0)
        pvt_val = float(readings.get("pvt", 25.0) or 25.0)
        is_single_line = False

        if "vdc2" not in readings or readings["vdc2"] is None or str(readings["vdc2"]).strip() == "":
            readings["vdc2"] = round(max(20.0, 290.0 - 0.38 * (pvt_val - 25.0)), 2)
            is_single_line = True
        if "idc2" not in readings or readings["idc2"] is None or str(readings["idc2"]).strip() == "":
            readings["idc2"] = round(max(0.05, 8.5 * (irr_val / 1000.0) * (1.0 + 0.0005 * (pvt_val - 25.0))), 2)
            is_single_line = True

        if source and ("Single" in str(source) or "single" in str(source)):
            is_single_line = True

        raw_vdc1 = float(readings.get("vdc1", 300.0) or 300.0)
        if raw_vdc1 <= 60.0:
            is_single_line = True
            readings["vdc1"] = round(raw_vdc1 * 10.0, 2)

        # 2. Validation
        is_valid, validation_errors, validation_warnings = DataValidator.validate_reading(readings)
        if not is_valid:
            return {
                "success": False,
                "error": "Validation failed on sensor telemetry inputs.",
                "details": validation_errors,
                "is_demo": is_demo
            }

        # 3. Preprocessing & Scaling
        feat_vector = self.preprocessor.transform_single(readings)

        # 3. Model Inference (measuring pure estimator latency on CPU)
        model = self.get_model(model_name)
        t_infer_start = time.perf_counter()
        pred_class = int(model.predict(feat_vector)[0])

        # 4. Probabilities & Confidence
        probabilities = {}
        confidence = 1.0
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(feat_vector)[0]
            for c_id, p in enumerate(probs):
                probabilities[FAULT_LABELS.get(c_id, f"Class {c_id}")] = round(float(p), 4)
            confidence = round(float(probs[pred_class]), 4)
        else:
            probabilities[FAULT_LABELS[pred_class]] = 1.0
        model_inference_ms = round((time.perf_counter() - t_infer_start) * 1000.0, 3)

        # 5. Low confidence and physical warnings
        warnings = list(validation_warnings)
        is_low_confidence = False

        if confidence < CONFIDENCE_THRESHOLD:
            is_low_confidence = True
            warnings.append(
                f"Prediction confidence ({confidence * 100:.1f}%) is below the reliable decision threshold "
                f"({CONFIDENCE_THRESHOLD * 100:.0f}%). Proceed with engineering verification."
            )

        if float(readings.get("irr", 0)) < LOW_IRRADIANCE_THRESHOLD:
            is_low_confidence = True

        # Check physical panel line imbalances & determine affected location
        v1, v2 = float(readings["vdc1"]), float(readings["vdc2"])
        i1, i2 = float(readings["idc1"]), float(readings["idc2"])
        p1, p2 = v1 * i1, v2 * i2

        if is_single_line:
            if pred_class == 0:
                fault_location = "Panel Healthy"
            else:
                fault_location = "Solar Panel"
            recommended_action = FAULT_ACTIONS_SINGLE.get(pred_class, "Nominal operation verified.")
            fault_desc = FAULT_DESCRIPTIONS_SINGLE.get(pred_class, "")
        else:
            if pred_class == 0:
                fault_location = "All Lines Healthy"
            elif pred_class == 1:  # Short-Circuit
                if v1 < v2 - 8.0:
                    fault_location = "Panel Line 1"
                elif v2 < v1 - 8.0:
                    fault_location = "Panel Line 2"
                else:
                    fault_location = "Panel Line 1" if p1 <= p2 else "Panel Line 2"
            elif pred_class == 3:  # Open-Circuit
                if i1 < 1.0 and i2 >= 1.0:
                    fault_location = "Panel Line 1"
                elif i2 < 1.0 and i1 >= 1.0:
                    fault_location = "Panel Line 2"
                else:
                    fault_location = "Panel Line 1" if i1 <= i2 else "Panel Line 2"
            elif pred_class == 4:  # Shadowing
                if i1 < i2 - 0.4:
                    fault_location = "Panel Line 1"
                elif i2 < i1 - 0.4:
                    fault_location = "Panel Line 2"
                else:
                    fault_location = "Both Panel Lines"
            elif pred_class == 2:  # Degradation
                if p1 < p2 * 0.92:
                    fault_location = "Panel Line 1"
                elif p2 < p1 * 0.92:
                    fault_location = "Panel Line 2"
                else:
                    fault_location = "Both Panel Lines"
            else:
                fault_location = "Panel Line 1" if p1 <= p2 else "Panel Line 2"
            recommended_action = FAULT_ACTIONS.get(pred_class, "Nominal operation verified.")
            fault_desc = FAULT_DESCRIPTIONS.get(pred_class, "")

        total_backend_ms = round((time.perf_counter() - t_start) * 1000.0, 3)
        severity_level = FAULT_SEVERITY_LEVEL.get(pred_class, "healthy")

        if source:
            source_tag = source
        elif is_single_line:
            source_tag = "Single Panel Mode"
        elif is_demo:
            source_tag = "Pre-Configured Scenario"
        else:
            source_tag = "Manual Diagnosis"

        prediction_payload = {
            "class_id": pred_class,
            "label": FAULT_LABELS.get(pred_class, f"Class {pred_class}"),
            "severity": FAULT_SEVERITY.get(pred_class, "Unknown"),
            "severity_level": severity_level,
            "recommended_action": recommended_action,
            "description": fault_desc,
            "confidence": confidence,
            "is_low_confidence": is_low_confidence,
            "probabilities": probabilities,
            "warnings": warnings,
            "model_used": model_name,
            "inference_latency_ms": model_inference_ms,
            "model_inference_latency_ms": model_inference_ms,
            "backend_processing_ms": total_backend_ms,
            "source": source_tag,
            "is_demo": is_demo,
            "fault_location": fault_location,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "readings": readings,
            "computed_metrics": {
                "p1_watts": round(p1, 2),
                "p2_watts": round(p2, 2),
                "ptotal_watts": round(p1 + p2, 2),
                "voltage_difference_v": round(abs(v1 - v2), 2),
                "current_difference_a": round(abs(i1 - i2), 2)
            }
        }

        # Persist to SQLite
        try:
            row_id = insert_prediction(prediction_payload)
            prediction_payload["id"] = row_id
        except Exception as exc:
            pass

        self.latest_prediction = prediction_payload

        return {
            "success": True,
            "prediction": prediction_payload
        }

    def predict_batch(
        self,
        readings_list: List[Dict[str, float]],
        model_name: str = "random_forest",
        source: str = "CSV Batch"
    ) -> Dict[str, Any]:
        """
        Processes a list of sensor reading dictionaries in batch mode.
        Persists all valid predictions to SQLite in a single transaction.
        """
        import pandas as pd
        t_batch_start = time.perf_counter()
        records = []
        validation_failures = 0

        valid_readings = []
        for r in readings_list:
            is_valid, _, _ = DataValidator.validate_reading(r)
            if not is_valid:
                validation_failures += 1
            else:
                valid_readings.append(r)

        if valid_readings:
            model = self.get_model(model_name)
            df_valid = pd.DataFrame(valid_readings)
            X_batch = self.preprocessor.transform_batch(df_valid)

            t_infer = time.perf_counter()
            if hasattr(model, "predict_proba"):
                probs_batch = model.predict_proba(X_batch)
                preds_batch = np.argmax(probs_batch, axis=1)
            else:
                preds_batch = model.predict(X_batch)
                probs_batch = None
            total_infer_ms = (time.perf_counter() - t_infer) * 1000.0
            avg_latency = round(total_infer_ms / len(valid_readings), 3)

            timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

            for i, r in enumerate(valid_readings):
                pred_class = int(preds_batch[i])
                probs = {}
                conf = 1.0
                if probs_batch is not None:
                    row_probs = probs_batch[i]
                    for c_id, p in enumerate(row_probs):
                        probs[FAULT_LABELS.get(c_id, f"Class {c_id}")] = round(float(p), 4)
                    conf = round(float(row_probs[pred_class]), 4)
                else:
                    probs[FAULT_LABELS.get(pred_class, f"Class {pred_class}")] = 1.0

                v1, v2 = float(r["vdc1"]), float(r["vdc2"])
                i1, i2 = float(r["idc1"]), float(r["idc2"])
                p1, p2 = v1 * i1, v2 * i2

                rec = {
                    "class_id": pred_class,
                    "label": FAULT_LABELS.get(pred_class, f"Class {pred_class}"),
                    "severity": FAULT_SEVERITY.get(pred_class, "Unknown"),
                    "severity_level": FAULT_SEVERITY_LEVEL.get(pred_class, "healthy"),
                    "recommended_action": FAULT_ACTIONS.get(pred_class, ""),
                    "description": FAULT_DESCRIPTIONS.get(pred_class, ""),
                    "confidence": conf,
                    "is_low_confidence": conf < CONFIDENCE_THRESHOLD or float(r.get("irr", 0)) < LOW_IRRADIANCE_THRESHOLD,
                    "probabilities": probs,
                    "model_used": model_name,
                    "inference_latency_ms": avg_latency,
                    "source": source,
                    "is_demo": False,
                    "timestamp": timestamp_str,
                    "readings": r,
                    "computed_metrics": {
                        "p1_watts": round(p1, 2),
                        "p2_watts": round(p2, 2),
                        "ptotal_watts": round(p1 + p2, 2),
                        "voltage_difference_v": round(abs(v1 - v2), 2),
                        "current_difference_a": round(abs(i1 - i2), 2)
                    }
                }
                records.append(rec)

        if records:
            insert_batch(records)
            self.latest_prediction = records[-1]

        total_batch_ms = round((time.perf_counter() - t_batch_start) * 1000.0, 2)

        fault_summary = {
            "Normal Operation": sum(1 for rec in records if rec["class_id"] == 0),
            "Short-Circuit": sum(1 for rec in records if rec["class_id"] == 1),
            "Degradation": sum(1 for rec in records if rec["class_id"] == 2),
            "Open-Circuit": sum(1 for rec in records if rec["class_id"] == 3),
            "Shadowing": sum(1 for rec in records if rec["class_id"] == 4)
        }

        total_processed = len(records)
        normal_operations = fault_summary["Normal Operation"]
        fault_count = sum(1 for rec in records if rec["class_id"] != 0)

        return {
            "success": True,
            "total_rows_submitted": len(readings_list),
            "total_processed": total_processed,
            "processed_records": total_processed,
            "normal_operations": normal_operations,
            "fault_count": fault_count,
            "faults_detected": fault_count,
            "validation_failures": validation_failures,
            "batch_latency_ms": total_batch_ms,
            "fault_summary": fault_summary,
            "preview": records[:50]
        }


