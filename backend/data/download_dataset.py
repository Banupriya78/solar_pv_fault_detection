"""
Dataset Downloader and Verification Utility
=============================================
This script downloads the official, publicly available Lazzaretti / UTFPR Photovoltaic
Fault Dataset directly from the official research repository:
Repository: https://github.com/clayton-h-costa/pv_fault_dataset
Associated Paper: Lazzaretti et al., "Monitoring System for Online Fault Detection
and Classification in Photovoltaic Plants", MDPI Sensors, 2020.
DOI: 10.3390/s20174688

Files downloaded into backend/data/:
1. dataset_elec.mat - DC electrical voltage and current readings from 2 strings (vdc1, vdc2, idc1, idc2)
2. dataset_amb.mat  - Environmental variables and ground truth fault labels (irr, pvt, f_nv)
"""

import os
import sys
import urllib.request
import hashlib

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

FILES = {
    "dataset_elec.mat": {
        "url": "https://raw.githubusercontent.com/clayton-h-costa/pv_fault_dataset/master/dataset_elec.mat",
        "description": "DC Electrical data (String 1 & 2 Voltages and Currents)"
    },
    "dataset_amb.mat": {
        "url": "https://raw.githubusercontent.com/clayton-h-costa/pv_fault_dataset/master/dataset_amb.mat",
        "description": "Environmental data (Irradiance, PV Module Temp) & Fault labels (f_nv)"
    }
}

def download_file(filename: str, info: dict) -> str:
    destination = os.path.join(DATA_DIR, filename)
    if os.path.exists(destination) and os.path.getsize(destination) > 1000000:
        print(f"[EXISTS] {filename} is already present ({os.path.getsize(destination):,} bytes). Skipping download.")
        return destination

    print(f"[DOWNLOADING] {filename} ({info['description']})...")
    print(f" Source URL: {info['url']}")

    def report_progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = min(100.0, downloaded * 100.0 / total_size)
            mb_downloaded = downloaded / (1024 * 1024)
            mb_total = total_size / (1024 * 1024)
            sys.stdout.write(f"\r  Progress: {percent:5.1f}% [{mb_downloaded:5.1f}MB / {mb_total:5.1f}MB]")
            sys.stdout.flush()

    urllib.request.urlretrieve(info["url"], destination, reporthook=report_progress)
    print(f"\n[COMPLETED] Saved to {destination} ({os.path.getsize(destination):,} bytes)\n")
    return destination

def main():
    print("=" * 70)
    print(" Solar PV Fault Dataset - Automated Official Downloader")
    print("=" * 70)
    for fname, info in FILES.items():
        download_file(fname, info)
    print("All required dataset files are ready in backend/data/.")

if __name__ == "__main__":
    main()
