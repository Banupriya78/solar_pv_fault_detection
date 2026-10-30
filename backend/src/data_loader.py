"""
Data Loading and Validation Module for Solar PV Fault Dataset (Lazzaretti / UTFPR)
==================================================================================
This module loads the official MATLAB .mat files, validates row alignments,
verifies data integrity, and produces clean DataFrames with real operational data.
"""

import os
from typing import Dict, Any, Tuple, Optional
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

FAULT_SEVERITY = {
    0: "None (Healthy)",
    1: "Critical (Electrical Danger)",
    2: "Moderate (Efficiency Loss)",
    3: "Critical (Loss of String Power)",
    4: "Minor to Moderate (Temporary)"
}

FAULT_SEVERITY_LEVEL = {
    0: "healthy",
    1: "critical",
    2: "moderate",
    3: "critical",
    4: "warning"
}

FAULT_ACTIONS = {
    0: "Nominal MPP operation verified. Maintain routine scheduled inspection interval.",
    1: "Immediate: Isolate DC disconnect for affected Panel Line. Inspect bypass diodes and module interconnects.",
    2: "Action: Schedule I-V curve trace for affected Panel Line. Inspect modules for micro-cracks or series resistance.",
    3: "Immediate: Verify DC circuit breaker, line fuse continuity, and inverter DC isolator switch contacts.",
    4: "Action: Check array for localized physical shading or soiling on affected Panel Line."
}

FAULT_ACTIONS_SINGLE = {
    0: "Nominal operation verified. Maintain routine scheduled inspection interval.",
    1: "Immediate: Disconnect panel terminals safely. Inspect bypass diodes and terminal junction box.",
    2: "Action: Perform visual inspection and thermal IR check for cell micro-cracks or hot spots.",
    3: "Immediate: Check panel cable connections, fuses, and MC4 connectors for loose or broken wiring.",
    4: "Action: Check panel surface for dirt, fallen leaves, bird droppings, or nearby physical shading."
}

FAULT_DESCRIPTIONS = {
    0: "All panel lines operating under normal photovoltaic IV characteristics with balanced voltage and current.",
    1: "Short-circuit detected across adjacent PV modules in the panel line, causing a sharp DC voltage drop.",
    2: "Degradation identified in panel line modules, increasing series resistance and reducing power yield.",
    3: "Open-circuit disconnection detected on panel line, dropping current flow to zero.",
    4: "Partial shadowing from surrounding obstacles causing current mismatch across panel lines."
}

FAULT_DESCRIPTIONS_SINGLE = {
    0: "Solar panel is operating under normal photovoltaic IV characteristics with optimal power output.",
    1: "Internal cell short-circuit or diode fault detected on the solar panel, causing a sharp voltage drop.",
    2: "Cell degradation, hotspots, or increased series resistance identified on the solar panel.",
    3: "Disconnection or open-circuit detected. Solar panel current has dropped to near zero.",
    4: "Solar panel is experiencing partial shading from obstacles, dust, or soiling, reducing current output."
}

DEFAULT_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

class PVDataLoader:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or DEFAULT_DATA_DIR
        self.elec_path = os.path.join(self.data_dir, "dataset_elec.mat")
        self.amb_path = os.path.join(self.data_dir, "dataset_amb.mat")
        self._df: Optional[pd.DataFrame] = None
        self._overview_cache: Optional[Dict[str, Any]] = None

    def check_files_exist(self) -> bool:
        return os.path.isfile(self.elec_path) and os.path.isfile(self.amb_path)

    @staticmethod
    def _load_mat_container(file_path: str) -> Dict[str, np.ndarray]:
        """
        Loads a MATLAB .mat container supporting both legacy MATLAB 5.0 (via scipy.io)
        and MATLAB v7.3 HDF5 container format (via h5py).
        """
        try:
            mat = sio.loadmat(file_path)
            return {k: v.squeeze() for k, v in mat.items() if not k.startswith("__")}
        except NotImplementedError:
            import h5py
            res = {}
            with h5py.File(file_path, "r") as hf:
                for k in hf.keys():
                    if not k.startswith("#"):
                        arr = np.array(hf[k])
                        if arr.ndim == 2 and arr.shape[0] < arr.shape[1]:
                            arr = arr.T
                        res[k] = arr.squeeze()
            return res

    def load_raw_data(self) -> pd.DataFrame:
        """
        Loads the raw MATLAB files and creates a combined Pandas DataFrame.
        Validates row count alignment and column presence.
        """
        if self._df is not None:
            return self._df

        if not self.check_files_exist():
            raise FileNotFoundError(
                f"Dataset files missing in '{self.data_dir}'. "
                f"Please run 'python backend/data/download_dataset.py' or follow docs/dataset_guide.md."
            )

        elec_mat = self._load_mat_container(self.elec_path)
        amb_mat = self._load_mat_container(self.amb_path)

        # Extract real arrays
        vdc1 = elec_mat["vdc1"]
        vdc2 = elec_mat["vdc2"]
        idc1 = elec_mat["idc1"]
        idc2 = elec_mat["idc2"]

        irr = amb_mat["irr"]
        pvt = amb_mat["pvt"]
        f_nv = amb_mat["f_nv"].astype(np.int64)

        # Validate alignment
        n_samples = len(f_nv)
        for name, arr in [("vdc1", vdc1), ("vdc2", vdc2), ("idc1", idc1), ("idc2", idc2),
                          ("irr", irr), ("pvt", pvt)]:
            if len(arr) != n_samples:
                raise ValueError(
                    f"Temporal mismatch: '{name}' has {len(arr)} rows, but 'f_nv' has {n_samples} rows."
                )

        # Build DataFrame with authentic raw columns
        self._df = pd.DataFrame({
            "vdc1": vdc1,
            "vdc2": vdc2,
            "idc1": idc1,
            "idc2": idc2,
            "irr": irr,
            "pvt": pvt,
            "f_nv": f_nv
        })

        return self._df

    def get_dataset_overview(self) -> Dict[str, Any]:
        """
        Inspects the actual loaded dataset and returns genuine metadata,
        shapes, missing values, descriptive statistics, and class distribution.
        """
        if self._overview_cache is not None:
            return self._overview_cache

        df = self.load_raw_data()
        n_rows, n_cols = df.shape
        missing_counts = df.isna().sum().to_dict()
        columns = list(df.columns)

        # Compute descriptive statistics
        num_cols = ["vdc1", "vdc2", "idc1", "idc2", "irr", "pvt"]
        stats_df = df[num_cols].describe().T
        stats = {}
        for col in num_cols:
            stats[col] = {
                "mean": round(float(stats_df.loc[col, "mean"]), 3),
                "std": round(float(stats_df.loc[col, "std"]), 3),
                "min": round(float(stats_df.loc[col, "min"]), 3),
                "p25": round(float(stats_df.loc[col, "25%"]), 3),
                "median": round(float(stats_df.loc[col, "50%"]), 3),
                "p75": round(float(stats_df.loc[col, "75%"]), 3),
                "max": round(float(stats_df.loc[col, "max"]), 3),
            }

        # Class distribution
        class_counts = df["f_nv"].value_counts().sort_index().to_dict()
        class_distribution = []
        for class_id, count in class_counts.items():
            class_distribution.append({
                "class_id": int(class_id),
                "label": FAULT_LABELS.get(int(class_id), f"Class {class_id}"),
                "count": int(count),
                "percentage": round(float(count / n_rows * 100), 2),
                "severity": FAULT_SEVERITY.get(int(class_id), "Unknown"),
                "description": FAULT_DESCRIPTIONS.get(int(class_id), "")
            })

        self._overview_cache = {
            "total_samples": int(n_rows),
            "total_features": int(n_cols - 1),
            "columns": columns,
            "missing_values": missing_counts,
            "descriptive_statistics": stats,
            "class_distribution": class_distribution,
            "sampling_rate_hz": 1.0,
            "duration_days": 16,
            "dataset_citation": "Lazzaretti et al., MDPI Sensors 2020 (DOI: 10.3390/s20174688)"
        }
        return self._overview_cache

    def get_stratified_sample(
        self,
        normal_samples: int = 12000,
        shadow_samples: int = 12000,
        random_state: int = 42
    ) -> pd.DataFrame:
        """
        Creates a stratified, class-representative working dataset:
        - Retains 100% of all real fault occurrences (Short-Circuit: 5,999,
          Degradation: 10,371, Open-Circuit: 6,024) to prevent minority loss.
        - Subsamples normal operation (Class 0) and natural shadowing (Class 4)
          to create a balanced, lightweight dataset.
        """
        df = self.load_raw_data()
        
        # Filter classes
        df_fault_1 = df[df["f_nv"] == 1]
        df_fault_2 = df[df["f_nv"] == 2]
        df_fault_3 = df[df["f_nv"] == 3]

        df_normal = df[df["f_nv"] == 0].sample(
            n=min(normal_samples, len(df[df["f_nv"] == 0])),
            random_state=random_state
        )
        df_shadow = df[df["f_nv"] == 4].sample(
            n=min(shadow_samples, len(df[df["f_nv"] == 4])),
            random_state=random_state
        )

        sample_df = pd.concat([df_normal, df_fault_1, df_fault_2, df_fault_3, df_shadow], ignore_index=True)
        return sample_df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)

    def get_temporal_block_splits(
        self,
        normal_samples: int = 12000,
        shadow_samples: int = 12000,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Time-block contiguous split strategy to eliminate temporal data leakage.
        In 1 Hz time-series PV operational streams, random 80/20 splitting leaks
        neighboring 1-second auto-correlated samples across train and test splits,
        producing an artificially inflated 99.7% F1.

        This method:
        1. Identifies contiguous temporal recording blocks for each fault class.
        2. Retains 100% of minority fault occurrences (Class 1, 2, 3).
        3. Windows contiguous continuous intervals for Class 0 (Normal) and Class 4 (Shadowing).
        4. Splices contiguous temporal blocks so that training uses the initial (1-test_size)
           duration of each block, and testing strictly evaluates the held-out terminal test_size
           duration. This forces models to generalize across time intervals.
        """
        df = self.load_raw_data()
        train_indices = []
        test_indices = []

        for c in range(5):
            idx = np.where(df["f_nv"] == c)[0]
            if len(idx) == 0:
                continue

            diffs = np.diff(idx)
            break_pts = np.where(diffs > 1)[0]
            starts = [0] + (break_pts + 1).tolist()
            ends = break_pts.tolist() + [len(idx) - 1]
            blocks = [idx[s:e+1] for s, e in zip(starts, ends)]

            # For dominant classes (0 and 4), select representative blocks to meet sample target
            if c in [0, 4]:
                target = normal_samples if c == 0 else shadow_samples
                rng = np.random.RandomState(random_state)
                perm = rng.permutation(len(blocks))
                selected_blocks = []
                cur_count = 0
                for p in perm:
                    if cur_count + len(blocks[p]) <= target or len(selected_blocks) < 5:
                        selected_blocks.append(blocks[p])
                        cur_count += len(blocks[p])
                    if cur_count >= target:
                        break
                blocks = selected_blocks

            # Contiguous temporal block split: initial 80% train, terminal 20% test
            for b in blocks:
                split_pt = int(len(b) * (1.0 - test_size))
                if split_pt == 0:
                    split_pt = 1
                train_indices.extend(b[:split_pt])
                test_indices.extend(b[split_pt:])

        train_indices = np.array(train_indices)
        test_indices = np.array(test_indices)

        train_df = df.iloc[train_indices].reset_index(drop=True)
        test_df = df.iloc[test_indices].reset_index(drop=True)
        return train_df, test_df

