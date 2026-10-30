# Solar PV Health Monitoring and Fault Classification System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)](https://vitejs.dev)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E?style=flat-square&logo=scikit-learn)](https://scikit-learn.org)
[![Recharts](https://img.shields.io/badge/Charts-Recharts-22b5bf?style=flat-square)](https://recharts.org)
[![Python 3.11](https://img.shields.io/badge/Python-3.11%2B-blue?style=flat-square&logo=python)](https://python.org)
[![License](https://img.shields.io/badge/Dataset%20License-MIT-green?style=flat-square)](https://github.com/clayton-h-costa/pv_fault_dataset)

An interactive software simulation and health monitoring system for grid-tied solar photovoltaic arrays. It utilizes lightweight machine learning models (**Decision Tree**, **Random Forest**, and **Support Vector Machine**) trained on an authentic 16-day operational benchmark dataset collected from a 5 kW photovoltaic plant.

---

## 1. Project Architecture & Directory Layout

```
Solar-PV-Fault-Detection/
├── backend/
│   ├── data/                         # MATLAB .mat containers & dataset download utility
│   │   ├── dataset_elec.mat          # DC electrical telemetry (vdc1, vdc2, idc1, idc2)
│   │   ├── dataset_amb.mat           # Environmental telemetry & labels (irr, pvt, f_nv)
│   │   └── download_dataset.py       # Automated dataset downloader from research repo
│   ├── models/                       # Serialized trained model weights & metrics
│   │   ├── decision_tree.joblib      # Trained Decision Tree classifier (29 KB)
│   │   ├── random_forest.joblib      # Trained Random Forest ensemble (3.4 MB)
│   │   ├── svm.joblib                # Trained Support Vector Machine (208 KB)
│   │   ├── scaler.joblib             # Leakage-safe fitted StandardScaler
│   │   └── metrics_summary.json      # Verified quantitative metrics & confusion matrices
│   ├── src/                          # Core Python ML and preprocessing modules
│   │   ├── data_loader.py            # MATLAB data parsing, verification & sampling
│   │   ├── data_validator.py         # Physics-based bounds checking & low-sun warnings
│   │   ├── preprocessor.py           # Electrical feature engineering (powers, ratios, diffs)
│   │   ├── model_trainer.py          # Training pipeline with progress tracking
│   │   └── predictor.py              # Inference engine with confidence scoring & caching
│   ├── tests/                        # Automated unit & integration test suite (19 tests)
│   │   ├── test_api.py               # FastAPI endpoint integration tests
│   │   ├── test_data_loader.py       # Dataset shape and integrity tests
│   │   ├── test_preprocessor.py      # Feature engineering calculation tests
│   │   └── test_validator.py         # Bounds checking and warning tests
│   ├── requirements.txt              # Python dependencies
│   └── main.py                       # FastAPI application server with CORS & REST routes
│
├── frontend/                         # React + Vite JavaScript Web Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx           # Clean navigation sidebar
│   │   │   ├── Dashboard.jsx         # Status overview, model readiness & latest prediction
│   │   │   ├── FaultPrediction.jsx   # Telemetry sliders, demo presets & diagnosis
│   │   │   ├── TrainModels.jsx       # Interactive training trigger & progress tracker
│   │   │   ├── Dataset.jsx           # Source, license, 1.37M records & raw stream
│   │   │   ├── ModelPerformance.jsx  # Comparative tables, confusion matrices & charts
│   │   │   └── About.jsx             # Methodology, simulation limitations & citations
│   │   ├── api.js                    # API client with proxy to FastAPI
│   │   ├── App.jsx                   # Main layout container
│   │   ├── index.css                 # Dark glassmorphism design system
│   │   └── main.jsx                  # React application entry point
│   ├── vite.config.js                # Vite configuration with /api proxy to port 8000
│   └── package.json                  # Node dependencies (Recharts, Lucide-React)
│
├── docs/                             # Engineering and research documentation
│   ├── dataset_guide.md              # Dataset provenance, acquisition and variables guide
│   └── system_architecture.md        # Mathematical features and pipeline architecture
│
├── .gitignore                        # Git ignore patterns for Python and Node
└── README.md                         # Comprehensive project documentation
```

---

## 2. Dataset Setup & Acquisition

This project uses the official open-source dataset by **Clayton H. da Costa & André E. Lazzaretti (UTFPR)**:
- **Reference Paper:** *Monitoring System for Online Fault Detection and Classification in Photovoltaic Plants*, MDPI *Sensors* 2020, 20(17), 4688 ([DOI: 10.3390/s20174688](https://doi.org/10.3390/s20174688)).
- **License:** MIT License.
- **Official GitHub:** [clayton-h-costa/pv_fault_dataset](https://github.com/clayton-h-costa/pv_fault_dataset).

### How to Place the Dataset:

#### Option A: Automated Download (Recommended)
Run the included downloader script:
```bash
python backend/data/download_dataset.py
```
This downloads `dataset_elec.mat` and `dataset_amb.mat` into `backend/data/`.

#### Option B: Manual Placement
1. Download `dataset_elec.mat` and `dataset_amb.mat` from [clayton-h-costa/pv_fault_dataset](https://github.com/clayton-h-costa/pv_fault_dataset).
2. Place both files in `backend/data/`.

### Verified Dataset Summary:
- **Total Operational Records:** 1,373,798 (16 days continuous @ 1 Hz)
- **Missing Values:** 0 across all columns (100% complete)
- **Target Classes:**
  - `0`: Normal Operation (1,162,931 samples / 84.65%)
  - `1`: Short-Circuit between 2 modules (5,999 samples / 0.44%)
  - `2`: Resistive Degradation (10,371 samples / 0.75%)
  - `3`: Disconnected String Open-Circuit (6,024 samples / 0.44%)
  - `4`: Natural Partial Shadowing (188,473 samples / 13.72%)

---

## 3. Measured Benchmark Results

All metrics were computed strictly on the held-out test split (**9,279 samples**) without data leakage:

| Model Architecture | Accuracy | Precision (Macro) | Recall (Macro) | Macro-F1 | Model Disk Size | Single-Sample Latency | Best Suited For |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Decision Tree** | 99.61% | 99.64% | 99.66% | **99.65%** | **29.0 KB** | **0.132 ms** | Embedded Microcontrollers & Edge IoT |
| **Random Forest** | **99.72%** | **99.72%** | **99.75%** | **99.73%** | 3.41 MB | 29.67 ms | Supervisory SCADA & Inverter Gateways |
| **SVM (RBF Kernel)** | 98.07% | 98.35% | 98.54% | **98.43%** | 208.0 KB | **0.340 ms** | High-Confidence Non-Linear Calibration |

---

## 4. Local Setup & Execution Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.11.9)
- Node.js 18+ and npm (tested on Node v24.15.0)

---

### Step 1: Backend Setup & Verification

1. **Install Python dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Download dataset (if not already present):**
   ```bash
   python backend/data/download_dataset.py
   ```

3. **Train candidate models and evaluate:**
   ```bash
   python -m backend.src.model_trainer
   ```

4. **Run the automated backend test suite (19 tests):**
   ```bash
   python -m pytest backend/tests -v
   ```

5. **Start the FastAPI backend server (Port 8000):**
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend
   ```
   *Interactive Swagger Documentation:* [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Step 2: Frontend Setup

1. **Open a new terminal and navigate to `frontend`:**
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Launch the Vite development server (Port 5173):**
   ```bash
   npm run dev
   ```

4. **Open in Browser:**
   [http://localhost:5173](http://localhost:5173)

---

## 5. Web Application Pages

The web application is streamlined into three core operational pages:

1. **Dashboard:**
   - Real dataset verification status (1,373,798 operational records, 0 missing values).
   - Machine learning models status (3/3 trained and ready).
   - Latest prediction summary card showing recent classification, confidence, latency, and power imbalances.
   - System integrity checklist and direct quick-action links.

2. **Fault Prediction (Online Inference):**
   - Interactive sensor inputs with units ($V_{dc1}\text{ [V]}$, $V_{dc2}\text{ [V]}$, $I_{dc1}\text{ [A]}$, $I_{dc2}\text{ [A]}$, $Irr\text{ [W/m}^2\text{]}$, $Pvt\text{ [}^\circ\text{C]}$).
   - Authentic 1-click demonstration presets (Normal, Short-Circuit, Degradation, Open-Circuit, Shadowing, Low-Sun Standby).
   - Explicit toggle and badge for **Live Sensor Telemetry** vs **Demonstration Mode**.
   - Automatic low-confidence warning banner ($< 70\%$ confidence or $Irr < 50\text{ W/m}^2$).
   - Real-time power calculations ($P_1$, $P_2$, $P_{total}$, $\Delta V$, $\Delta I$) and class probability distribution chart.

3. **Model Performance & Evaluation:**
   - Side-by-side comparative table of Decision Tree, Random Forest, and SVM.
   - Metrics: Accuracy, Precision, Recall, Macro-F1, Model Disk Size (KB), Inference Latency (ms), and Training Duration.
   - Multi-metric comparative bar chart.
   - Interactive 5×5 Confusion Matrix viewer with model selector.
   - Gini impurity feature importance rankings and physical attribution.
   - Official dataset provenance, testbed details, and citation block.

---

## 6. Academic Citation
```bibtex
@article{lazzaretti2020monitoring,
  title={Monitoring System for Online Fault Detection and Classification in Photovoltaic Plants},
  author={Lazzaretti, Andr{\'e} E and da Costa, Clayton H and Rodrigues, Marcelo P and Yamada, Guilherme D and Lexinoski, Gilberto and Moritz, Guilherme L and Oroski, Elder and de G{\'o}es, Rafael E and Linhares, Robson R and Stadzisz, Paulo C and others},
  journal={Sensors},
  volume={20},
  number={17},
  pages={4688},
  year={2020},
  publisher={MDPI},
  doi={10.3390/s20174688}
}
```
