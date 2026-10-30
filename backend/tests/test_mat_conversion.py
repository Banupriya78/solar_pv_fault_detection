"""
Automated Test Suite for MATLAB Dataset Inspection & Conversion
==============================================================
Validates:
1. Detection and inspection of MATLAB .mat files.
2. Conversion to CSV without data loss, truncation, or corruption.
3. Preservation of exact row counts (1,373,798), column names, and 0-null integrity.
4. Availability of Excel-friendly preview CSV (1,000 rows).
5. Continuous functionality of PVDataLoader reading original .mat files directly.
"""

import os
import json
import pytest
import pandas as pd
import numpy as np

from backend.src.data_loader import PVDataLoader, FAULT_LABELS
from backend.src.inspect_project_files import safe_inspect_mat, safe_inspect_joblib, safe_inspect_sqlite
from backend.src.mat_converter import read_mat_safely, convert_datasets, CONVERTED_DIR, DATA_DIR

def test_safe_inspect_mat():
    elec_path = os.path.join(DATA_DIR, "dataset_elec.mat")
    amb_path = os.path.join(DATA_DIR, "dataset_amb.mat")
    
    assert os.path.exists(elec_path), "dataset_elec.mat must exist"
    assert os.path.exists(amb_path), "dataset_amb.mat must exist"
    
    elec_info = safe_inspect_mat(elec_path)
    assert elec_info["convert_to_csv_appropriate"] is True
    assert "vdc1" in elec_info["variables"]
    assert elec_info["variables"]["vdc1"]["size"] == 1373798
    
    amb_info = safe_inspect_mat(amb_path)
    assert amb_info["convert_to_csv_appropriate"] is True
    assert "f_nv" in amb_info["variables"]
    assert amb_info["variables"]["f_nv"]["size"] == 1373798

def test_safe_inspect_other_formats():
    # SQLite
    db_path = os.path.join(DATA_DIR, "predictions.db")
    if os.path.exists(db_path):
        db_info = safe_inspect_sqlite(db_path)
        assert db_info["convert_to_csv_appropriate"] is False
        assert "predictions" in db_info["tables"]

    # Joblib
    model_path = os.path.join(os.path.dirname(DATA_DIR), "models", "random_forest.joblib")
    if os.path.exists(model_path):
        jl_info = safe_inspect_joblib(model_path)
        assert jl_info["convert_to_csv_appropriate"] is False
        assert jl_info["size_bytes"] > 1000000

def test_converted_csv_files_exist():
    assert os.path.exists(CONVERTED_DIR), "backend/data/converted/ directory must exist"
    
    expected_files = [
        "dataset_elec.csv",
        "dataset_amb.csv",
        "dataset_combined.csv",
        "dataset_preview_1000.csv",
        "conversion_metadata.json"
    ]
    for fname in expected_files:
        fpath = os.path.join(CONVERTED_DIR, fname)
        assert os.path.exists(fpath), f"Converted file missing: {fname}"
        assert os.path.getsize(fpath) > 0, f"File {fname} is empty"

def test_dataset_integrity_and_sample_counts():
    meta_path = os.path.join(CONVERTED_DIR, "conversion_metadata.json")
    with open(meta_path, "r") as f:
        meta = json.load(f)
        
    assert meta["dataset_integrity"]["total_samples"] == 1373798
    assert meta["dataset_integrity"]["missing_values"] == {
        "vdc1": 0, "vdc2": 0, "idc1": 0, "idc2": 0,
        "irr": 0, "pvt": 0, "f_nv": 0
    }
    
    # Verify preview CSV
    preview_path = os.path.join(CONVERTED_DIR, "dataset_preview_1000.csv")
    df_preview = pd.read_csv(preview_path)
    assert len(df_preview) == 1000
    assert "fault_label" in df_preview.columns
    assert set(df_preview["fault_label"].unique()).issubset(set(FAULT_LABELS.values()))

def test_data_loader_still_reads_original_mat_directly():
    loader = PVDataLoader()
    df = loader.load_raw_data()
    
    assert len(df) == 1373798
    assert list(df.columns) == ["vdc1", "vdc2", "idc1", "idc2", "irr", "pvt", "f_nv"]
    assert df.isna().sum().sum() == 0
    
    overview = loader.get_dataset_overview()
    assert overview["total_samples"] == 1373798
    assert overview["duration_days"] == 16
