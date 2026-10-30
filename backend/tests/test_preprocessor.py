"""
Unit tests for PV Preprocessor and Feature Engineering
"""

import pytest
import pandas as pd
import numpy as np
from backend.src.preprocessor import PVPreprocessor, FEATURE_NAMES

def test_feature_engineering_columns():
    raw_df = pd.DataFrame([{
        "vdc1": 290.0,
        "vdc2": 290.0,
        "idc1": 7.0,
        "idc2": 7.0,
        "irr": 800.0,
        "pvt": 30.0
    }])
    feat_df = PVPreprocessor.engineer_features(raw_df)
    assert list(feat_df.columns) == FEATURE_NAMES
    assert feat_df["p1"].iloc[0] == pytest.approx(290.0 * 7.0)
    assert feat_df["ptotal"].iloc[0] == pytest.approx(290.0 * 7.0 * 2)
    assert feat_df["v_diff"].iloc[0] == pytest.approx(0.0)
    assert feat_df["v_ratio"].iloc[0] == pytest.approx(1.0, rel=1e-3)

def test_transform_single():
    prep = PVPreprocessor()
    single_reading = {
        "vdc1": 280.0,
        "vdc2": 280.0,
        "idc1": 6.5,
        "idc2": 6.5,
        "irr": 750.0,
        "pvt": 28.0
    }
    vec = prep.transform_single(single_reading)
    assert vec.shape == (1, len(FEATURE_NAMES))
    assert not np.isnan(vec).any()
