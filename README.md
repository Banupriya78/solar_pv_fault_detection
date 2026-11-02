# Solar PV Health Monitoring and Fault Classification System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=flat-square&logo=react)](https://vitejs.dev)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E?style=flat-square&logo=scikit-learn)](https://scikit-learn.org)
[![Firebase](https://img.shields.io/badge/Hosting-Firebase-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat-square&logo=render)](https://render.com)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://python.org)
[![License](https://img.shields.io/badge/Dataset%20License-MIT-green?style=flat-square)](https://github.com/clayton-h-costa/pv_fault_dataset)

An intelligent, real-time diagnostic and health monitoring system for solar photovoltaic (PV) arrays. Powered by lightweight machine learning classifiers (**Random Forest**, **Decision Tree**, and **Support Vector Machine with RBF kernel**), the system detects, classifies, and pinpoints PV array faults—such as **Short-Circuits**, **Resistive Degradation**, **Disconnected Open-Circuits**, and **Partial Shadowing**—with sub-2ms inference latency.

The system is fully responsive across mobile, tablet, and desktop devices, and provides instant engineering maintenance reports with actionable remediation steps.

---

## Live Deployments

- **Web Application (Frontend on Firebase Hosting):** [https://solar-pv-fault-detection-522fd.web.app](https://solar-pv-fault-detection-522fd.web.app)  
  *(Alternative domain: [https://solar-pv-fault-detection-522fd.firebaseapp.com](https://solar-pv-fault-detection-522fd.firebaseapp.com))*
- **REST API (Backend on Render Web Service):** [https://solar-pv-api-ugdl.onrender.com](https://solar-pv-api-ugdl.onrender.com)
- **Interactive API Documentation (Swagger UI):** [https://solar-pv-api-ugdl.onrender.com/docs](https://solar-pv-api-ugdl.onrender.com/docs)
- **API Health Check Endpoint:** [https://solar-pv-api-ugdl.onrender.com/api/health](https://solar-pv-api-ugdl.onrender.com/api/health)

---

## 1. Project Architecture & Directory Layout

```
Solar-PV-Fault-Detection/
├── backend/                              # Python FastAPI REST API & Machine Learning Engine
│   ├── data/                             # Dataset storage & retrieval utilities
│   │   ├── dataset_elec.mat              # DC electrical telemetry (vdc1, vdc2, idc1, idc2)
│   │   ├── dataset_amb.mat               # Environmental telemetry & labels (irr, pvt, f_nv)
│   │   ├── download_dataset.py           # Automated UTFPR benchmark dataset downloader
│   │   ├── converted/                    # Converted CSVs & preview snapshots
│   │   └── predictions.db                # SQLite historical predictions database
│   ├── models/                           # Trained model weights & quantitative metrics
│   │   ├── random_forest.joblib          # Production Random Forest ensemble (100 trees, 3.29 MB)
│   │   ├── decision_tree.joblib          # Edge Decision Tree classifier (29.4 KB)
│   │   ├── svm.joblib                    # Support Vector Machine with RBF kernel (203.7 KB)
│   │   ├── scaler.joblib                 # Fitted StandardScaler (13 electrical features)
│   │   └── metrics_summary.json          # Verified benchmark metrics & confusion matrices
│   ├── src/                              # Core processing and inference logic
│   │   ├── data_loader.py                # MATLAB container parser (.mat v5 & v7.3 HDF5)
│   │   ├── data_validator.py             # Physical PV bounds checking & low-sun warnings
│   │   ├── preprocessor.py               # Feature engineering (P1, P2, Ptotal, ΔV, ΔI, ratios)
│   │   ├── model_trainer.py              # Training pipeline with temporal block evaluation
│   │   ├── predictor.py                  # Real-time inference engine & fault location identifier
│   │   ├── mat_converter.py              # MATLAB to CSV converter utility
│   │   └── db.py                         # SQLite persistence for historical audit trail
│   ├── tests/                            # Automated pytest test suite
│   │   ├── test_api.py                   # FastAPI REST route integration tests
│   │   ├── test_data_loader.py           # Dataset integrity & shape tests
│   │   ├── test_preprocessor.py          # Feature calculation & scaling tests
│   │   └── test_validator.py             # Physical boundary & warning tests
│   ├── requirements.txt                  # Python dependencies
│   └── main.py                           # FastAPI application entry point with CORS & routes
│
├── frontend/                             # React 19 + Vite Web Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx               # Responsive navigation sidebar with mobile drawer
│   │   │   ├── Dashboard.jsx             # KPI stat cards, latest diagnosis, & recent history
│   │   │   ├── FaultPrediction.jsx       # Single Panel & Dual Lines diagnosis with live power
│   │   │   ├── DiagnosisHistory.jsx      # Searchable & filterable history with CSV export
│   │   │   ├── MaintenanceReport.jsx     # Printable technical maintenance report modal
│   │   │   └── MaintenanceReportsPage.jsx# Centralized reports hub with priority filters
│   │   ├── api.js                        # Environment-aware API client (local proxy & Render)
│   │   ├── App.jsx                       # Main responsive shell, navigation & sticky header
│   │   ├── index.css                     # Complete responsive design system (mobile/tablet/desktop)
│   │   └── main.jsx                      # React application mount point
│   ├── vite.config.js                    # Vite configuration with /api reverse proxy to port 8000
│   └── package.json                      # Frontend dependencies (Lucide-React, Recharts)
│
├── .firebaserc                           # Firebase project configuration (solar-pv-fault-detection-522fd)
├── firebase.json                         # Firebase Hosting SPA rewrite & public directory rules
├── package.json                          # Monorepo convenience scripts for frontend & backend
├── run_backend.py                        # Cross-platform backend startup script with path resolution
├── .gitignore                            # Git ignore patterns for Python, Node, and databases
└── README.md                             # Comprehensive technical documentation
```

---

## 2. Dataset Setup & Acquisition

The model is trained on the authentic, peer-reviewed open-source photovoltaic benchmark dataset by **Clayton H. da Costa & André E. Lazzaretti (UTFPR)**:
- **Reference Paper:** *Monitoring System for Online Fault Detection and Classification in Photovoltaic Plants*, MDPI *Sensors* 2020, 20(17), 4688 ([DOI: 10.3390/s20174688](https://doi.org/10.3390/s20174688)).
- **License:** MIT License.
- **Physical Testbed:** Grid-connected 5.0 kWp photovoltaic system composed of two strings of 10 series-connected 250 Wp modules.
- **Acquisition Protocol:** 16 continuous days recorded at 1 Hz resolution (**1,373,798 raw telemetry rows** with 0 missing values).

### Dataset Files
The dataset consists of two MATLAB containers placed in `backend/data/`:
1. `dataset_elec.mat`: DC electrical telemetry (`vdc1`, `vdc2`, `idc1`, `idc2`).
2. `dataset_amb.mat`: Meteorological telemetry and ground-truth fault labels (`irr`, `pvt`, `f_nv`).

### How to Acquire the Dataset:

#### Option A: Automated Download Script (Recommended)
Run the automated downloader from the project root:
```bash
python backend/data/download_dataset.py
```

#### Option B: Manual Placement
1. Download `dataset_elec.mat` and `dataset_amb.mat` from the official repository: [clayton-h-costa/pv_fault_dataset](https://github.com/clayton-h-costa/pv_fault_dataset).
2. Place both `.mat` files directly inside `backend/data/`.

---

## 3. Quantitative Model Benchmarks

All models were evaluated strictly on a held-out test split of **9,354 samples** using contiguous temporal block partitioning to guarantee **Zero Data Leakage** between consecutive time-series records:

| Model Architecture | Accuracy | Macro Precision | Macro Recall | Macro F1-Score | Inference Latency | Model Disk Size | Target Hardware |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Random Forest** *(Production)* | **91.89%** | **94.25%** | **93.33%** | **93.41%** | $\sim 54\text{ ms}$ | 3.29 MB | Web SCADA, Cloud Inverters |
| **SVM (RBF Kernel)** | **91.69%** | **93.96%** | **93.24%** | **93.23%** | $\sim 1.1\text{ ms}$ | 203.7 KB | Non-Linear Sensor Calibration |
| **Decision Tree** | **86.21%** | **89.99%** | **88.92%** | **88.90%** | **$0.42\text{ ms}$** | **29.4 KB** | Microcontrollers & Edge IoT |

### Fault-Specific Detection Performance (Random Forest)

| Fault Category | Class ID | Precision | Recall (Fault Catch Rate) | F1-Score | Operational Impact |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Normal Operation** | `0` | 94.97% | 75.66% | 84.22% | Nominal array operating curve |
| **Short-Circuit** | `1` | **99.74%** | **96.19%** | **97.93%** | Bypassed modules, hotspot & fire hazard |
| **Resistive Degradation** | `2` | **98.15%** | **99.28%** | **98.71%** | Aging modules, cell cracks, power loss |
| **Open-Circuit** | `3` | **99.18%** | **100.0%** | **99.59%** | Disconnected cable or blown fuse |
| **Partial Shadowing** | `4` | 79.22% | **95.52%** | **86.61%** | Obstacle shade, bird soiling, dust |

---

## 4. Local Setup & Execution Guide

### Prerequisites
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** and **npm**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Banupriya78/solar_pv_fault_detection.git
cd Solar-PV-Fault-Detection
```

---

### Step 2: Backend Setup (Python)

1. **Create and activate a Python virtual environment:**
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Windows (Command Prompt)
   python -m venv .venv
   .\.venv\Scripts\activate.bat

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **(Optional) Train or regenerate ML models:**
   ```bash
   python -m backend.src.model_trainer
   ```

4. **Run automated unit tests:**
   ```bash
   pytest backend/tests -v
   ```

5. **Start the FastAPI backend server:**
   ```bash
   python run_backend.py
   # Or using root npm script:
   npm run backend
   ```
   - **Local API URL:** `http://127.0.0.1:8000`
   - **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`
   - **API Health Check:** `http://127.0.0.1:8000/api/health`

---

### Step 3: Frontend Setup (React + Vite)

Open a second terminal window in the project root:

1. **Install Node dependencies:**
   ```bash
   npm --prefix frontend install
   ```

2. **Start the Vite development server:**
   ```bash
   npm run dev
   # Or: npm --prefix frontend run dev
   ```

3. **Open the web application:**
   Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Deployment Guide

### A. Backend Deployment on Render

The backend is deployed as a Web Service on **Render**:

1. **Create a New Web Service:**
   - Connect your GitHub repository: `Banupriya78/solar_pv_fault_detection`.
   - **Name:** `solar-pv-api` (or custom name).
   - **Environment:** `Python 3`.
   - **Region:** Any preferred region (e.g., Oregon, Frankfurt).
   - **Branch:** `main`.

2. **Configure Build & Start Commands:**
   - **Build Command:**
     ```bash
     pip install -r backend/requirements.txt
     ```
   - **Start Command:**
     ```bash
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```

3. **Deploy:**
   - Render automatically provisions the environment, installs dependencies, and assigns a live public URL:  
     `https://solar-pv-api-ugdl.onrender.com`
   - Test the live deployment:
     ```bash
     curl https://solar-pv-api-ugdl.onrender.com/api/health
     ```

---

### B. Frontend Deployment on Firebase Hosting

The frontend is deployed to **Firebase Hosting** using the pre-configured `firebase.json` and `.firebaserc` files:

1. **Install Firebase CLI (if not already installed):**
   ```bash
   npm install -g firebase-tools
   ```

2. **Authenticate with Firebase:**
   ```bash
   firebase login
   ```

3. **Build the production frontend bundle:**
   ```bash
   npm run build
   # Or: npm --prefix frontend run build
   ```
   *(This compiles assets into `frontend/dist/`).*

4. **Deploy to Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```

5. **Verify Live Deployment:**
   - Firebase assigns a production URL: [https://solar-pv-fault-detection-522fd.web.app](https://solar-pv-fault-detection-522fd.web.app)
   - SPA routing is managed via `firebase.json`:
     ```json
     {
       "hosting": {
         "public": "frontend/dist",
         "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
         "rewrites": [
           {
             "source": "**",
             "destination": "/index.html"
           }
         ]
       }
     }
     ```

---

## 6. Web Application Features

The web application is organized into 4 primary views with complete responsive layout support:

1. **Dashboard:**
   - Real-time KPI statistics: Last Diagnosis, Total Diagnoses count, Faults Found & percentage, Average Model Confidence.
   - Latest Diagnosis card: Displays current fault condition, pinpointed location (`Panel Healthy`, `Panel Line 1`, `Panel Line 2`), confidence score, severity indicator, and short recommended action.
   - Direct button to launch the **Technical Maintenance Report**.
   - Recent Diagnoses interactive log with "View All" toggle and severity pill badges.

2. **Solar PV Fault Prediction:**
   - **Dual Operating Modes:**
     - **Single Panel Mode (4 Inputs):** Enter single module voltage ($V_{dc} \approx 28\text{V} - 32\text{V}$), current ($I_{dc} \approx 7\text{A}$), irradiance ($G$), and temperature ($T$). The engine automatically evaluates single-module MPP characteristics, displays single-panel power ($\sim 204\text{W}$), and outputs `Panel Healthy` or single-panel remedial actions.
     - **Dual Lines Mode (6 Inputs):** Enter voltages and currents for two 10-module string lines ($V_{dc1}, I_{dc1}, V_{dc2}, I_{dc2}, G, T$) for differential array evaluation.
   - Real-time physical validation of sensor parameters via `data_validator.py`.
   - Live power metrics computation ($P_1$, $P_2$, $P_{total}$, $\Delta V$, $\Delta I$, Health Ratio %).
   - Instant diagnostic verdict with high-voltage electrical safety warnings for short-circuit faults.

3. **Diagnosis History:**
   - Full historical telemetry archive stored in SQLite (`predictions.db`).
   - Real-time search by fault type, date, or prediction ID.
   - Category filtering (Normal Operation, Shadowing, Short-Circuit, Open-Circuit, Degradation).
   - 1-Click **Export CSV** feature to download audit spreadsheets.

4. **Maintenance Reports & Printable Modal:**
   - Centralized maintenance records hub with priority filtering (High, Medium, Low).
   - Interactive report modal with detailed diagnostic summaries, recorded electrical telemetry, numbered actionable next steps, and electrical safety notices.
   - Built-in **Print Report** / Save as PDF functionality with dedicated print stylesheets.

5. **Responsive Design System:**
   - Fluid support for mobile screens (phones $\le 640\text{px}$), tablets ($640\text{px} - 1023\text{px}$), and desktops ($\ge 1024\text{px}$).
   - Off-canvas navigation drawer with backdrop overlay and touch-friendly toggle button on mobile.
   - Horizontally scrollable tables with sticky headers to eliminate layout shifts or page-level horizontal overflow.

---

## 7. Package Scripts Reference

All operations can be managed directly from the project root using `npm`:

| Command | Action | Underlying Script |
| :--- | :--- | :--- |
| `npm run dev` | Start frontend development server | `npm --prefix frontend run dev` |
| `npm run backend` | Start FastAPI backend server | `python run_backend.py` |
| `npm run build` | Build production frontend bundle | `npm --prefix frontend run build` |
| `npm run preview` | Preview production build locally | `npm --prefix frontend run preview` |
| `npm run lint` | Run oxlint on frontend codebase | `npm --prefix frontend run lint` |

---

## 8. Academic Citation

If you utilize this software or dataset in your academic research, please cite the original study:

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

---

## 9. License

- **Software Codebase:** MIT License
- **Dataset:** MIT License (Courtesy of Clayton H. da Costa & André E. Lazzaretti, UTFPR)
