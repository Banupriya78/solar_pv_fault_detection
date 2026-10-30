"""
Model Training and Evaluation Pipeline
======================================
Trains and benchmarks three lightweight ML models for Solar PV Fault Classification:
1. Decision Tree (Interpretable, single-tree baseline)
2. Random Forest (High-accuracy ensemble)
3. Support Vector Machine (Kernel RBF classifier with probability estimation)

Evaluates strictly with leakage-safe methodology on the held-out test split.
Measures real accuracy, precision, recall, macro-F1, confusion matrix, model disk size,
and single-sample inference latency in milliseconds.
"""

import os
import json
import time
import threading
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
import joblib

from backend.src.data_loader import PVDataLoader, FAULT_LABELS
from backend.src.preprocessor import PVPreprocessor, FEATURE_NAMES

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

class TrainingTracker:
    def __init__(self):
        self._lock = threading.Lock()
        self.is_training = False
        self.progress_percent = 0
        self.current_step = "Idle"
        self.started_at = None
        self.finished_at = None
        self.error = None
        self.last_results = None

    def update(self, step: str, percent: int):
        with self._lock:
            self.current_step = step
            self.progress_percent = percent

    def start(self):
        with self._lock:
            self.is_training = True
            self.progress_percent = 5
            self.current_step = "Initializing training pipeline..."
            self.started_at = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
            self.finished_at = None
            self.error = None

    def finish(self, results):
        with self._lock:
            self.is_training = False
            self.progress_percent = 100
            self.current_step = "Training and evaluation completed successfully."
            self.finished_at = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
            self.last_results = results

    def fail(self, err_msg: str):
        with self._lock:
            self.is_training = False
            self.current_step = f"Training failed: {err_msg}"
            self.error = err_msg

    def get_status(self):
        with self._lock:
            return {
                "is_training": self.is_training,
                "progress_percent": self.progress_percent,
                "current_step": self.current_step,
                "started_at": self.started_at,
                "finished_at": self.finished_at,
                "error": self.error,
                "has_results": self.last_results is not None
            }

training_tracker = TrainingTracker()

class PVModelTrainer:
    def __init__(self, models_dir: str = MODELS_DIR):
        self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        self.preprocessor = PVPreprocessor(models_dir=self.models_dir)

    def measure_inference_latency(self, model, sample_vec: np.ndarray, n_trials: int = 500) -> float:
        """
        Measures single-sample inference latency in milliseconds (ms).
        """
        # Warmup
        for _ in range(20):
            _ = model.predict(sample_vec)

        t_start = time.perf_counter()
        for _ in range(n_trials):
            _ = model.predict(sample_vec)
        t_end = time.perf_counter()

        latency_ms = ((t_end - t_start) / n_trials) * 1000.0
        return round(latency_ms, 3)

    def train_and_evaluate_all(
        self,
        normal_samples: int = 12000,
        shadow_samples: int = 12000,
        tracker: Optional[TrainingTracker] = None
    ) -> Dict[str, Any]:
        """
        Loads the authentic dataset, prepares leakage-safe train/test splits,
        trains Decision Tree, Random Forest, and SVM, evaluates them,
        and saves artifacts and metrics.
        """
        if tracker:
            tracker.update("Loading real PV dataset from backend/data/...", 10)
        print("[1/5] Loading real PV dataset and preparing contiguous temporal blocks...")
        loader = PVDataLoader()
        train_df, test_df = loader.get_temporal_block_splits(
            normal_samples=normal_samples,
            shadow_samples=shadow_samples,
            test_size=0.2,
            random_state=42
        )
        print(f" Loaded temporal blocks: Train={len(train_df):,} rows, Test={len(test_df):,} rows.")

        if tracker:
            tracker.update("Preparing temporal leakage-safe train/test splits...", 25)

        print("[2/5] Performing temporal leakage-safe feature engineering and scaling...")
        X_train, X_test, y_train, y_test, feat_names = self.preprocessor.prepare_temporal_train_test_data(
            train_df=train_df,
            test_df=test_df
        )
        print(f" X_train: {X_train.shape}, X_test: {X_test.shape}")

        models = {
            "decision_tree": {
                "name": "Decision Tree",
                "estimator": DecisionTreeClassifier(
                    max_depth=12,
                    min_samples_split=6,
                    random_state=42
                ),
                "progress_step": ("Training Decision Tree classifier...", 45)
            },
            "random_forest": {
                "name": "Random Forest",
                "estimator": RandomForestClassifier(
                    n_estimators=100,
                    max_depth=14,
                    min_samples_split=4,
                    random_state=42,
                    n_jobs=-1
                ),
                "progress_step": ("Training Random Forest ensemble (100 trees)...", 65)
            },
            "svm": {
                "name": "Support Vector Machine (RBF)",
                "estimator": SVC(
                    kernel="rbf",
                    C=10.0,
                    gamma="scale",
                    probability=True,
                    random_state=42
                ),
                # Subsample training set slightly for SVM for lightweight memory and rapid convergence
                "train_subset_size": 18000,
                "progress_step": ("Training Support Vector Machine (RBF kernel)...", 85)
            }
        }

        # Shuffle training partition exclusively (within train set only) for uniform class distribution
        rng = np.random.RandomState(42)
        tr_perm = rng.permutation(len(X_train))
        X_train_fit = X_train[tr_perm]
        y_train_fit = y_train[tr_perm]

        results = {}
        sample_for_latency = X_test[0:1]

        print("[3/5] Training and evaluating candidate classifiers...")
        for key, conf in models.items():
            clf_name = conf["name"]
            estimator = conf["estimator"]
            if tracker and "progress_step" in conf:
                tracker.update(conf["progress_step"][0], conf["progress_step"][1])
            print(f"  Training {clf_name}...")

            t_train_start = time.perf_counter()
            if "train_subset_size" in conf and len(X_train_fit) > conf["train_subset_size"]:
                estimator.fit(X_train_fit[:conf["train_subset_size"]], y_train_fit[:conf["train_subset_size"]])
            else:
                estimator.fit(X_train_fit, y_train_fit)
            train_duration = round(time.perf_counter() - t_train_start, 3)

            # Predictions on held-out test split
            y_pred = estimator.predict(X_test)

            # Leakage-safe metrics calculation
            acc = round(float(accuracy_score(y_test, y_pred)), 4)
            prec = round(float(precision_score(y_test, y_pred, average="macro", zero_division=0)), 4)
            rec = round(float(recall_score(y_test, y_pred, average="macro", zero_division=0)), 4)
            f1 = round(float(f1_score(y_test, y_pred, average="macro", zero_division=0)), 4)

            # Confusion matrix
            cm = confusion_matrix(y_test, y_pred, labels=[0, 1, 2, 3, 4]).tolist()

            # Classification report dict
            clf_report = classification_report(
                y_test, y_pred,
                labels=[0, 1, 2, 3, 4],
                target_names=[FAULT_LABELS[i] for i in range(5)],
                output_dict=True,
                zero_division=0
            )

            # Save model
            model_path = os.path.join(self.models_dir, f"{key}.joblib")
            joblib.dump(estimator, model_path)
            model_size_bytes = os.path.getsize(model_path)
            model_size_kb = round(model_size_bytes / 1024.0, 2)

            # Measure latency
            latency_ms = self.measure_inference_latency(estimator, sample_for_latency)

            # Feature importances where supported
            feature_importances = []
            if hasattr(estimator, "feature_importances_"):
                importances = estimator.feature_importances_
                for f_name, imp in zip(feat_names, importances):
                    feature_importances.append({
                        "feature": f_name,
                        "importance": round(float(imp), 4)
                    })
                feature_importances.sort(key=lambda x: x["importance"], reverse=True)

            results[key] = {
                "key": key,
                "name": clf_name,
                "accuracy": acc,
                "precision": prec,
                "recall": rec,
                "macro_f1": f1,
                "training_time_seconds": train_duration,
                "model_size_bytes": model_size_bytes,
                "model_size_kb": model_size_kb,
                "inference_latency_ms": latency_ms,
                "confusion_matrix": cm,
                "classification_report": clf_report,
                "feature_importances": feature_importances,
                "supports_feature_importance": len(feature_importances) > 0
            }

            print(f"   Done -> Accuracy: {acc*100:.2f}%, Macro-F1: {f1*100:.2f}%, Size: {model_size_kb}KB, Latency: {latency_ms}ms")

        if tracker:
            tracker.update("Serializing models and generating metrics report...", 95)

        # Save metrics summary
        summary_payload = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "dataset_info": {
                "total_raw_stream": 1373798,
                "operational_window_samples": int(len(y_train) + len(y_test)),
                "train_samples": int(len(y_train)),
                "test_samples": int(len(y_test)),
                "test_split_ratio": 0.20,
                "sampling_rate_hz": 1.0,
                "duration_days": 16,
                "features": feat_names
            },
            "methodology": {
                "split_strategy": "Contiguous Temporal Block Splitting",
                "anti_leakage_note": "Evaluated strictly on held-out terminal temporal duration blocks to prevent 1-second auto-correlation leakage across adjacent time-series rows.",
                "explanation": "Trained on 46,394 windowed operational samples derived from the 1,373,798 raw 1 Hz record stream. Retains 100% of minority fault events (Short-Circuit: 5,999, Degradation: 10,371, Open-Circuit: 6,024) while balancing normal and shadowing intervals."
            },
            "models": results,
            "labels": FAULT_LABELS
        }

        metrics_file = os.path.join(self.models_dir, "metrics_summary.json")
        with open(metrics_file, "w") as f:
            json.dump(summary_payload, f, indent=2)

        print(f"[4/5] All models and metrics serialized to '{self.models_dir}'")
        if tracker:
            tracker.finish(summary_payload)
        return summary_payload

def main():
    trainer = PVModelTrainer()
    trainer.train_and_evaluate_all()

if __name__ == "__main__":
    main()
