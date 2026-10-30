"""
Feature Engineering and Preprocessing Pipeline
=============================================
Transforms raw PV electrical and environmental telemetry into diagnostic
features for lightweight ML classification models.
Ensures zero data leakage by strictly fitting scalers on the training split.
"""

import os
from typing import Tuple, List, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib

FEATURE_NAMES = [
    "vdc1", "vdc2", "idc1", "idc2", "irr", "pvt",
    "p1", "p2", "ptotal", "v_diff", "i_diff", "v_ratio", "i_ratio"
]

class PVPreprocessor:
    def __init__(self, models_dir: Optional[str] = None):
        self.models_dir = models_dir or os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models"
        )
        self.scaler_path = os.path.join(self.models_dir, "scaler.joblib")
        self.scaler: Optional[StandardScaler] = None

    @staticmethod
    def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
        """
        Derives diagnostic PV electrical indicators from base measurements:
        - String powers (p1, p2, ptotal)
        - Inter-string imbalances (v_diff, i_diff)
        - Normalized ratios (v_ratio, i_ratio)
        """
        res = df.copy()
        eps = 1e-4

        res["p1"] = res["vdc1"] * res["idc1"]
        res["p2"] = res["vdc2"] * res["idc2"]
        res["ptotal"] = res["p1"] + res["p2"]
        res["v_diff"] = res["vdc1"] - res["vdc2"]
        res["i_diff"] = res["idc1"] - res["idc2"]
        res["v_ratio"] = res["vdc1"] / (res["vdc2"] + eps)
        res["i_ratio"] = res["idc1"] / (res["idc2"] + eps)

        # Clip extreme ratios from division near zero
        res["v_ratio"] = res["v_ratio"].clip(0.0, 100.0)
        res["i_ratio"] = res["i_ratio"].clip(0.0, 100.0)

        return res[FEATURE_NAMES]

    def prepare_temporal_train_test_data(
        self,
        train_df: pd.DataFrame,
        test_df: pd.DataFrame
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str]]:
        """
        Temporal leakage-safe preparation:
        1. Feature engineering on pre-partitioned contiguous temporal train and test sets.
        2. Strictly fits StandardScaler exclusively on training data.
        3. Transforms held-out temporal test set without look-ahead bias.
        """
        X_train_df = self.engineer_features(train_df)
        X_test_df = self.engineer_features(test_df)
        y_train = train_df["f_nv"].values
        y_test = test_df["f_nv"].values

        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train_df.values)
        X_test_scaled = self.scaler.transform(X_test_df.values)

        os.makedirs(self.models_dir, exist_ok=True)
        joblib.dump(self.scaler, self.scaler_path)

        return X_train_scaled, X_test_scaled, y_train, y_test, FEATURE_NAMES

    def prepare_train_test_data(
        self,
        df: pd.DataFrame,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str]]:
        """
        Leakage-safe data preparation:
        1. Feature engineering on dataset.
        2. Stratified train/test split.
        3. Fit StandardScaler exclusively on X_train.
        4. Transform both X_train and X_test with fitted scaler.
        """
        X_df = self.engineer_features(df)
        y = df["f_nv"].values

        # Stratified train/test split
        X_train_df, X_test_df, y_train, y_test = train_test_split(
            X_df, y, test_size=test_size, stratify=y, random_state=random_state
        )

        # Leakage-safe scaling: fit only on training data
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train_df.values)
        X_test_scaled = self.scaler.transform(X_test_df.values)

        # Save scaler
        os.makedirs(self.models_dir, exist_ok=True)
        joblib.dump(self.scaler, self.scaler_path)

        return X_train_scaled, X_test_scaled, y_train, y_test, FEATURE_NAMES

    def transform_single(self, input_dict: dict) -> np.ndarray:
        """
        Transforms a single sample dictionary into scaled feature vector for model inference.
        """
        if self.scaler is None:
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
            else:
                raise FileNotFoundError(f"Scaler not found at '{self.scaler_path}'. Train models first.")

        single_df = pd.DataFrame([{
            "vdc1": float(input_dict["vdc1"]),
            "vdc2": float(input_dict["vdc2"]),
            "idc1": float(input_dict["idc1"]),
            "idc2": float(input_dict["idc2"]),
            "irr":  float(input_dict["irr"]),
            "pvt":  float(input_dict["pvt"])
        }])

        feat_df = self.engineer_features(single_df)
        return self.scaler.transform(feat_df.values)

    def transform_batch(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transforms a batch DataFrame of telemetry readings into a scaled feature matrix.
        """
        if self.scaler is None:
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
            else:
                raise FileNotFoundError(f"Scaler not found at '{self.scaler_path}'. Train models first.")

        feat_df = self.engineer_features(df)
        return self.scaler.transform(feat_df.values)

