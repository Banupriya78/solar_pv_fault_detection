"""
Project File Format Scanner and Safe Inspector
==============================================
Scans the project to identify files that are difficult to read manually
(MATLAB .mat, SQLite .db, Joblib .joblib, raster/vector images .png/.svg).
Inspects each file safely without executing untrusted code or corrupting data.
"""

import os
import sys
import struct
import sqlite3
import json
from typing import Dict, Any, List

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def safe_inspect_joblib(file_path: str) -> Dict[str, Any]:
    """
    Safely inspects a joblib/pickle file by checking its size, file magic bytes,
    and compression headers WITHOUT unpickling/executing arbitrary code.
    """
    size = os.path.getsize(file_path)
    with open(file_path, "rb") as f:
        header = f.read(16)

    # Joblib can be uncompressed or zlib/gzip/lz4 compressed
    compression = "uncompressed / raw pickle"
    if header.startswith(b"\x1f\x8b"):
        compression = "gzip compressed"
    elif header.startswith(b"\x78\x9c") or header.startswith(b"\x78\x01") or header.startswith(b"\x78\xda"):
        compression = "zlib compressed"
    elif header.startswith(b"\x04\x22\x4d\x18"):
        compression = "lz4 compressed"

    return {
        "file": os.path.relpath(file_path, PROJECT_ROOT),
        "format": "Joblib Serialized Binary (scikit-learn artifact)",
        "size_bytes": size,
        "size_kb": round(size / 1024.0, 2),
        "header_hex": header.hex(),
        "detected_compression": compression,
        "purpose": "Serialized machine learning model weights or fitted scaler for inference.",
        "convert_to_csv_appropriate": False,
        "reason": "Joblib files store serialized Python algorithm graph structures, decision tree nodes, and floating-point hyperplanes. Converting to tabular CSV is not applicable."
    }

def safe_inspect_sqlite(file_path: str) -> Dict[str, Any]:
    """
    Safely inspects an SQLite database using sqlite3 schema queries.
    """
    size = os.path.getsize(file_path)
    table_info = {}
    try:
        conn = sqlite3.connect(file_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall() if not row[0].startswith("sqlite_")]
        for tbl in tables:
            cursor.execute(f"SELECT COUNT(*) FROM \"{tbl}\";")
            count = cursor.fetchone()[0]
            cursor.execute(f"PRAGMA table_info(\"{tbl}\");")
            cols = [c[1] for c in cursor.fetchall()]
            table_info[tbl] = {
                "row_count": count,
                "column_count": len(cols),
                "columns": cols
            }
        conn.close()
    except Exception as e:
        table_info["error"] = str(e)

    return {
        "file": os.path.relpath(file_path, PROJECT_ROOT),
        "format": "SQLite 3 Relational Database Container",
        "size_bytes": size,
        "size_kb": round(size / 1024.0, 2),
        "tables": table_info,
        "purpose": "Persistent storage for prediction audit trails, user accounts, and auth sessions.",
        "convert_to_csv_appropriate": False,
        "reason": "Relational SQL database already structured with indexing, relations, and transactional integrity; CSV export is available on-demand per table if needed."
    }

def safe_inspect_mat(file_path: str) -> Dict[str, Any]:
    """
    Inspects a MATLAB .mat file. Detects MATLAB 5.0 vs v7.3 (HDF5)
    and lists all internal variables, shapes, and data types.
    """
    size = os.path.getsize(file_path)
    with open(file_path, "rb") as f:
        raw_header = f.read(128)

    # Check for HDF5 signature (MATLAB v7.3)
    is_v73 = raw_header.startswith(b"\x89HDF\r\n\x1a\n")
    header_str = raw_header[:124].decode("latin-1", errors="replace").strip()

    var_info = {}
    if is_v73:
        mat_version = "MATLAB v7.3 (HDF5 container)"
        try:
            import h5py
            with h5py.File(file_path, "r") as hf:
                for key in hf.keys():
                    ds = hf[key]
                    var_info[key] = {
                        "shape": list(ds.shape),
                        "dtype": str(ds.dtype),
                        "size": int(ds.size)
                    }
        except ImportError:
            var_info["error"] = "h5py required to read MATLAB v7.3 container."
    else:
        mat_version = "MATLAB 5.0 (Standard MAT-file container)"
        import scipy.io as sio
        mat_dict = sio.loadmat(file_path)
        for key, val in mat_dict.items():
            if not key.startswith("__"):
                var_info[key] = {
                    "shape": list(val.shape),
                    "dtype": str(val.dtype),
                    "size": int(val.size),
                    "min": float(val.min()) if val.size > 0 else None,
                    "max": float(val.max()) if val.size > 0 else None
                }

    return {
        "file": os.path.relpath(file_path, PROJECT_ROOT),
        "format": mat_version,
        "size_bytes": size,
        "size_mb": round(size / (1024.0 * 1024.0), 2),
        "header_text": header_str,
        "variables": var_info,
        "purpose": "Authentic operational benchmark photovoltaic telemetry dataset.",
        "convert_to_csv_appropriate": True,
        "reason": "Tabular numerical telemetry can be exported to standard CSV files in backend/data/converted/ for human inspection and universal software compatibility."
    }

def safe_inspect_image(file_path: str) -> Dict[str, Any]:
    """
    Inspects image assets (.png, .svg).
    """
    size = os.path.getsize(file_path)
    ext = os.path.splitext(file_path)[1].lower()

    details = {}
    if ext == ".png":
        fmt = "PNG Raster Image"
        with open(file_path, "rb") as f:
            header = f.read(24)
            if header.startswith(b"\x89PNG\r\n\x1a\n") and len(header) >= 24:
                width, height = struct.unpack(">II", header[16:24])
                details["dimensions"] = f"{width}x{height}"
    elif ext == ".svg":
        fmt = "Scalable Vector Graphics (XML text)"
        details["type"] = "Vector SVG icon/badge"
    else:
        fmt = f"Binary Media ({ext})"

    return {
        "file": os.path.relpath(file_path, PROJECT_ROOT),
        "format": fmt,
        "size_bytes": size,
        "details": details,
        "purpose": "Frontend visual asset or icon.",
        "convert_to_csv_appropriate": False,
        "reason": "Image media files cannot be converted to tabular CSV data."
    }

def scan_all_project_formats() -> List[Dict[str, Any]]:
    """
    Scans the entire repository and returns structured inspection data for all
    files requiring special readers.
    """
    inspected_files = []

    # 1. MATLAB files in backend/data/
    for fname in ["dataset_elec.mat", "dataset_amb.mat"]:
        fpath = os.path.join(PROJECT_ROOT, "backend", "data", fname)
        if os.path.exists(fpath):
            inspected_files.append(safe_inspect_mat(fpath))

    # 2. SQLite Database in backend/data/
    db_path = os.path.join(PROJECT_ROOT, "backend", "data", "predictions.db")
    if os.path.exists(db_path):
        inspected_files.append(safe_inspect_sqlite(db_path))

    # 3. Joblib Model files in backend/models/
    for fname in ["decision_tree.joblib", "random_forest.joblib", "svm.joblib", "scaler.joblib"]:
        fpath = os.path.join(PROJECT_ROOT, "backend", "models", fname)
        if os.path.exists(fpath):
            inspected_files.append(safe_inspect_joblib(fpath))

    # 4. Image assets in frontend/
    for root, _, files in os.walk(os.path.join(PROJECT_ROOT, "frontend")):
        if "node_modules" in root or "dist" in root:
            continue
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in [".png", ".svg"]:
                inspected_files.append(safe_inspect_image(os.path.join(root, f)))

    return inspected_files

def main():
    print("=" * 80)
    print("SOLAR PV FAULT DETECTION - PROJECT FILE FORMAT INSPECTION REPORT")
    print("=" * 80)
    results = scan_all_project_formats()
    for item in results:
        print(f"\n[FILE] {item['file']}")
        print(f"  Format:   {item['format']}")
        print(f"  Size:     {item.get('size_bytes', 0):,} bytes")
        print(f"  Purpose:  {item['purpose']}")
        print(f"  Convert:  {'YES -> CSV' if item['convert_to_csv_appropriate'] else 'NO'}")
        if not item["convert_to_csv_appropriate"]:
            print(f"  Reason:   {item['reason']}")
        if "variables" in item:
            print("  Variables:")
            for v, meta in item["variables"].items():
                print(f"    - {v}: shape={meta.get('shape')} dtype={meta.get('dtype')} size={meta.get('size'):,}")
        if "tables" in item:
            print("  Tables:")
            for t, meta in item["tables"].items():
                print(f"    - {t}: {meta.get('row_count'):,} rows, {meta.get('column_count')} columns")

    print("\n" + "=" * 80)
    print(f"Total non-text/structured files inspected: {len(results)}")
    print("=" * 80)

if __name__ == "__main__":
    main()
