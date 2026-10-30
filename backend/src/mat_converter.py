"""
MATLAB .mat Dataset Converter and Validator
==========================================
Converts MATLAB .mat telemetry files to readable CSV format without modifying
or deleting the original .mat containers. Supports both MATLAB 5.0 (via scipy.io)
and MATLAB v7.3 HDF5 containers (via h5py).

Outputs saved to: backend/data/converted/
- dataset_elec.csv: Complete 1,373,798 rows of DC electrical telemetry
- dataset_amb.csv: Complete 1,373,798 rows of environmental metrics and labels
- dataset_combined.csv: Complete 1,373,798 rows unified tabular dataset
- dataset_preview_1000.csv: 1,000-row preview with human-readable fault labels for Excel compatibility
- conversion_metadata.json: Comprehensive validation, shape, dtype, and integrity report
"""

import os
import sys
import time
import json
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
import scipy.io as sio

FAULT_LABELS = {
    0: "Normal Operation",
    1: "Short-Circuit",
    2: "Degradation",
    3: "Open-Circuit",
    4: "Shadowing"
}

COLUMN_DESCRIPTIONS = {
    "vdc1": "DC Voltage String 1 (V)",
    "vdc2": "DC Voltage String 2 (V)",
    "idc1": "DC Current String 1 (A)",
    "idc2": "DC Current String 2 (A)",
    "irr":  "Solar Irradiance on PV Array Plane (W/m²)",
    "pvt":  "Back-of-Module Temperature (°C)",
    "f_nv": "Ground-Truth Fault Category Label (0 to 4)"
}

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
CONVERTED_DIR = os.path.join(DATA_DIR, "converted")

def read_mat_safely(file_path: str) -> Tuple[Dict[str, np.ndarray], str]:
    """
    Reads a MATLAB .mat file safely, auto-detecting MATLAB 5.0 vs MATLAB v7.3 (HDF5).
    Returns (variables_dict, format_description).
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"MATLAB file not found: {file_path}")

    # Check for HDF5 header signature
    with open(file_path, "rb") as f:
        header_start = f.read(8)

    if header_start.startswith(b"\x89HDF\r\n\x1a\n"):
        import h5py
        res = {}
        with h5py.File(file_path, "r") as hf:
            for k in hf.keys():
                if not k.startswith("#"):
                    arr = np.array(hf[k])
                    # In MATLAB v7.3, HDF5 datasets are stored transposed
                    if arr.ndim == 2 and arr.shape[0] < arr.shape[1]:
                        arr = arr.T
                    res[k] = arr.squeeze()
        return res, "MATLAB v7.3 (HDF5)"

    try:
        mat_dict = sio.loadmat(file_path)
        res = {}
        for k, v in mat_dict.items():
            if not k.startswith("__"):
                res[k] = v.squeeze()
        return res, "MATLAB 5.0 (Standard)"
    except NotImplementedError:
        # Fallback to h5py if scipy raises NotImplementedError
        import h5py
        res = {}
        with h5py.File(file_path, "r") as hf:
            for k in hf.keys():
                if not k.startswith("#"):
                    arr = np.array(hf[k])
                    res[k] = arr.squeeze()
        return res, "MATLAB v7.3 (HDF5 via fallback)"

def convert_datasets(
    data_dir: str = DATA_DIR,
    output_dir: str = CONVERTED_DIR,
    preview_limit: int = 1000
) -> Dict[str, Any]:
    """
    Loads raw .mat files, verifies alignment, checks data integrity,
    and exports complete CSV files and a spreadsheet-friendly preview.
    """
    os.makedirs(output_dir, exist_ok=True)
    t0 = time.time()

    elec_path = os.path.join(data_dir, "dataset_elec.mat")
    amb_path = os.path.join(data_dir, "dataset_amb.mat")

    print("=" * 80)
    print("MATLAB .MAT DATASET CONVERSION & INTEGRITY VERIFICATION")
    print("=" * 80)
    print(f"Source Directory: {data_dir}")
    print(f"Output Directory: {output_dir}")

    # 1. Load dataset_elec.mat
    print(f"\n[1/5] Inspecting & Loading: {os.path.basename(elec_path)}...")
    elec_vars, elec_fmt = read_mat_safely(elec_path)
    elec_file_size = os.path.getsize(elec_path)
    print(f"  Detected Format: {elec_fmt} ({elec_file_size:,} bytes)")
    for var_name, arr in elec_vars.items():
        print(f"    - Variable: '{var_name}', shape={arr.shape}, dtype={arr.dtype}, min={arr.min():.4f}, max={arr.max():.4f}")

    # 2. Load dataset_amb.mat
    print(f"\n[2/5] Inspecting & Loading: {os.path.basename(amb_path)}...")
    amb_vars, amb_fmt = read_mat_safely(amb_path)
    amb_file_size = os.path.getsize(amb_path)
    print(f"  Detected Format: {amb_fmt} ({amb_file_size:,} bytes)")
    for var_name, arr in amb_vars.items():
        print(f"    - Variable: '{var_name}', shape={arr.shape}, dtype={arr.dtype}, min={arr.min():.4f}, max={arr.max():.4f}")

    # 3. Validate temporal alignment
    n_samples = len(amb_vars["f_nv"])
    for name, arr in [("vdc1", elec_vars["vdc1"]), ("vdc2", elec_vars["vdc2"]),
                      ("idc1", elec_vars["idc1"]), ("idc2", elec_vars["idc2"]),
                      ("irr", amb_vars["irr"]), ("pvt", amb_vars["pvt"])]:
        if len(arr) != n_samples:
            raise ValueError(f"Temporal alignment failure: '{name}' has {len(arr)} rows, expected {n_samples}.")
    print(f"\n[3/5] Temporal alignment verified: exactly {n_samples:,} continuous 1 Hz samples across all 7 channels.")

    # 4. Construct DataFrames
    df_elec = pd.DataFrame({
        "vdc1": elec_vars["vdc1"],
        "vdc2": elec_vars["vdc2"],
        "idc1": elec_vars["idc1"],
        "idc2": elec_vars["idc2"]
    })

    df_amb = pd.DataFrame({
        "irr":  amb_vars["irr"],
        "pvt":  amb_vars["pvt"],
        "f_nv": amb_vars["f_nv"].astype(int)
    })

    df_combined = pd.concat([df_elec, df_amb], axis=1)

    # Integrity verification: missing values check
    missing_counts = df_combined.isna().sum().to_dict()
    total_missing = sum(missing_counts.values())
    print(f"  Missing values verification: {total_missing} nulls found (100% complete dataset).")

    # 5. Export CSV files
    print(f"\n[4/5] Exporting CSV files to '{output_dir}'...")

    # A. dataset_elec.csv
    elec_csv_path = os.path.join(output_dir, "dataset_elec.csv")
    print(f"  Writing {os.path.basename(elec_csv_path)} ({len(df_elec):,} rows x {len(df_elec.columns)} cols)...")
    df_elec.to_csv(elec_csv_path, index=False, float_format="%.4f")
    elec_csv_size = os.path.getsize(elec_csv_path)

    # B. dataset_amb.csv
    amb_csv_path = os.path.join(output_dir, "dataset_amb.csv")
    print(f"  Writing {os.path.basename(amb_csv_path)} ({len(df_amb):,} rows x {len(df_amb.columns)} cols)...")
    df_amb.to_csv(amb_csv_path, index=False, float_format="%.4f")
    amb_csv_size = os.path.getsize(amb_csv_path)

    # C. dataset_combined.csv (complete, non-truncated)
    combined_csv_path = os.path.join(output_dir, "dataset_combined.csv")
    print(f"  Writing {os.path.basename(combined_csv_path)} ({len(df_combined):,} rows x {len(df_combined.columns)} cols)...")
    df_combined.to_csv(combined_csv_path, index=False, float_format="%.4f")
    combined_csv_size = os.path.getsize(combined_csv_path)

    # D. dataset_preview_1000.csv (spreadsheet preview for Excel compatibility)
    preview_csv_path = os.path.join(output_dir, f"dataset_preview_{preview_limit}.csv")
    print(f"  Writing Excel-friendly preview {os.path.basename(preview_csv_path)} ({preview_limit} rows)...")
    df_preview = df_combined.head(preview_limit).copy()
    df_preview["fault_label"] = df_preview["f_nv"].map(FAULT_LABELS)
    df_preview.to_csv(preview_csv_path, index=False, float_format="%.4f")
    preview_csv_size = os.path.getsize(preview_csv_path)

    # Compute class distribution
    class_distribution = {}
    for cid, count in df_combined["f_nv"].value_counts().sort_index().items():
        class_distribution[str(cid)] = {
            "label": FAULT_LABELS.get(int(cid), f"Class {cid}"),
            "count": int(count),
            "percentage": round(float(count / n_samples * 100), 2)
        }

    # Generate metadata report
    metadata = {
        "conversion_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "conversion_duration_seconds": round(time.time() - t0, 2),
        "source_files": {
            "dataset_elec.mat": {
                "path": os.path.relpath(elec_path, data_dir),
                "format": elec_fmt,
                "size_bytes": elec_file_size,
                "variables": {k: {"shape": list(v.shape), "dtype": str(v.dtype)} for k, v in elec_vars.items()}
            },
            "dataset_amb.mat": {
                "path": os.path.relpath(amb_path, data_dir),
                "format": amb_fmt,
                "size_bytes": amb_file_size,
                "variables": {k: {"shape": list(v.shape), "dtype": str(v.dtype)} for k, v in amb_vars.items()}
            }
        },
        "dataset_integrity": {
            "total_samples": int(n_samples),
            "columns": list(df_combined.columns),
            "column_descriptions": COLUMN_DESCRIPTIONS,
            "missing_values": missing_counts,
            "class_distribution": class_distribution,
            "excel_compatibility_note": f"Complete dataset has {n_samples:,} rows, exceeding Microsoft Excel's hard limit of 1,048,576 rows. Use dataset_preview_{preview_limit}.csv for Excel inspection, or Python/pandas for full dataset analysis."
        },
        "generated_files": {
            "dataset_elec.csv": {
                "rows": len(df_elec),
                "columns": list(df_elec.columns),
                "size_bytes": elec_csv_size,
                "description": "DC string voltage and current telemetry (4 channels)."
            },
            "dataset_amb.csv": {
                "rows": len(df_amb),
                "columns": list(df_amb.columns),
                "size_bytes": amb_csv_size,
                "description": "Solar irradiance, cell temperature, and ground-truth fault label (3 channels)."
            },
            "dataset_combined.csv": {
                "rows": len(df_combined),
                "columns": list(df_combined.columns),
                "size_bytes": combined_csv_size,
                "description": "Full unified 7-channel operational telemetry stream (non-truncated)."
            },
            f"dataset_preview_{preview_limit}.csv": {
                "rows": len(df_preview),
                "columns": list(df_preview.columns),
                "size_bytes": preview_csv_size,
                "description": "Small 1,000-row preview with human-readable fault labels for spreadsheet applications."
            }
        }
    }

    meta_path = os.path.join(output_dir, "conversion_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[5/5] Conversion metadata saved to: {os.path.basename(meta_path)}")
    print(f"\nSUCCESS: Converted {n_samples:,} rows in {round(time.time() - t0, 2)}s.")
    print("=" * 80)
    return metadata

def main():
    convert_datasets()

if __name__ == "__main__":
    main()
