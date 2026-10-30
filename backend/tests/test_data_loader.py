"""
Unit tests for PV DataLoader and Dataset Integrity
"""

import pytest
import numpy as np
from backend.src.data_loader import PVDataLoader, FAULT_LABELS

def test_data_files_exist():
    loader = PVDataLoader()
    assert loader.check_files_exist(), "Official dataset files should exist in backend/data/"

def test_raw_data_loading_and_shape():
    loader = PVDataLoader()
    df = loader.load_raw_data()
    # Authentic UTFPR dataset has exactly 1,373,798 rows
    assert df.shape[0] == 1373798
    assert set(["vdc1", "vdc2", "idc1", "idc2", "irr", "pvt", "f_nv"]).issubset(df.columns)
    # Check no NaN values
    assert df.isna().sum().sum() == 0

def test_dataset_overview_metrics():
    loader = PVDataLoader()
    overview = loader.get_dataset_overview()
    assert overview["total_samples"] == 1373798
    assert len(overview["class_distribution"]) == 5
    # Verify label IDs 0 to 4
    class_ids = [c["class_id"] for c in overview["class_distribution"]]
    assert class_ids == [0, 1, 2, 3, 4]

def test_stratified_sample():
    loader = PVDataLoader()
    sample = loader.get_stratified_sample(normal_samples=1000, shadow_samples=1000)
    # Fault classes 1 (5999), 2 (10371), 3 (6024) plus 1000 normal + 1000 shadow = 24394
    assert len(sample) == 24394
    for c_id in range(5):
        assert (sample["f_nv"] == c_id).sum() > 0
