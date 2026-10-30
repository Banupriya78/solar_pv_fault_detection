"""
SQLite Persistence Layer for Solar PV Fault Predictions
=======================================================
Stores persistent prediction history, enables summary metrics,
and records batch CSV diagnoses without fabricating data.
"""

import os
import sqlite3
import json
import hashlib
import secrets
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "predictions.db")

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Generates a secure PBKDF2-SHA256 salted hash for academic demo authentication."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return hashed, salt

def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    """Verifies a plain password against the stored PBKDF2 hash using constant-time comparison."""
    hashed, _ = hash_password(password, salt)
    return secrets.compare_digest(hashed, expected_hash)

def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path: str = DB_PATH):
    """Initializes the SQLite predictions, users, and sessions tables."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # 1. Predictions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                vdc1 REAL NOT NULL,
                vdc2 REAL NOT NULL,
                idc1 REAL NOT NULL,
                idc2 REAL NOT NULL,
                irr REAL NOT NULL,
                pvt REAL NOT NULL,
                p1_watts REAL,
                p2_watts REAL,
                ptotal_watts REAL,
                v_diff REAL,
                i_diff REAL,
                class_id INTEGER NOT NULL,
                label TEXT NOT NULL,
                severity TEXT NOT NULL,
                severity_level TEXT,
                confidence REAL NOT NULL,
                model_used TEXT NOT NULL,
                inference_latency_ms REAL NOT NULL,
                source TEXT NOT NULL,
                is_demo INTEGER DEFAULT 0,
                is_low_confidence INTEGER DEFAULT 0,
                recommended_action TEXT,
                description TEXT,
                probabilities_json TEXT,
                fault_location TEXT
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pred_timestamp ON predictions(timestamp DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pred_class ON predictions(class_id);")

        # Ensure fault_location column exists if table was created previously
        try:
            cursor.execute("ALTER TABLE predictions ADD COLUMN fault_location TEXT;")
        except Exception:
            pass

        # 2. Users Table for Authentication
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT DEFAULT 'Solar PV Specialist',
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login TEXT
            );
        """)

        # 3. Sessions Table for Bearer Tokens
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);")

        # 4. Seed default operator account if no users exist
        cursor.execute("SELECT COUNT(*) AS count FROM users")
        if cursor.fetchone()["count"] == 0:
            pw_hash, salt = hash_password("pvmonitor2026")
            now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
            cursor.execute("""
                INSERT INTO users (username, email, full_name, role, password_hash, salt, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, ("operator", "operator@pvmonitor.io", "Plant Operator", "Solar PV Systems Specialist", pw_hash, salt, now_str))

        conn.commit()

def insert_prediction(record: Dict[str, Any], db_path: str = DB_PATH) -> int:
    """Inserts a single prediction record into SQLite and returns the row id."""
    readings = record.get("readings", {})
    metrics = record.get("computed_metrics", {})
    probs = record.get("probabilities", {})

    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO predictions (
                timestamp, vdc1, vdc2, idc1, idc2, irr, pvt,
                p1_watts, p2_watts, ptotal_watts, v_diff, i_diff,
                class_id, label, severity, severity_level,
                confidence, model_used, inference_latency_ms,
                source, is_demo, is_low_confidence,
                recommended_action, description, probabilities_json,
                fault_location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record.get("timestamp") or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            float(readings.get("vdc1", 0.0)),
            float(readings.get("vdc2", 0.0)),
            float(readings.get("idc1", 0.0)),
            float(readings.get("idc2", 0.0)),
            float(readings.get("irr", 0.0)),
            float(readings.get("pvt", 0.0)),
            float(metrics.get("p1_watts", 0.0)),
            float(metrics.get("p2_watts", 0.0)),
            float(metrics.get("ptotal_watts", 0.0)),
            float(metrics.get("voltage_difference_v", 0.0)),
            float(metrics.get("current_difference_a", 0.0)),
            int(record.get("class_id", 0)),
            record.get("label", "Unknown"),
            record.get("severity", "Unknown"),
            record.get("severity_level", "healthy"),
            float(record.get("confidence", 1.0)),
            record.get("model_used", "random_forest"),
            float(record.get("inference_latency_ms", 0.0)),
            record.get("source", "Manual Diagnosis"),
            1 if record.get("is_demo") else 0,
            1 if record.get("is_low_confidence") else 0,
            record.get("recommended_action", ""),
            record.get("description", ""),
            json.dumps(probs),
            record.get("fault_location", "All Lines Healthy" if int(record.get("class_id", 0)) == 0 else "Panel Line 1")
        ))
        conn.commit()
        return cursor.lastrowid

def insert_batch(records: List[Dict[str, Any]], db_path: str = DB_PATH) -> int:
    """Inserts a batch of prediction records in a single transaction."""
    rows = []
    for record in records:
        readings = record.get("readings", {})
        metrics = record.get("computed_metrics", {})
        probs = record.get("probabilities", {})
        rows.append((
            record.get("timestamp") or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            float(readings.get("vdc1", 0.0)),
            float(readings.get("vdc2", 0.0)),
            float(readings.get("idc1", 0.0)),
            float(readings.get("idc2", 0.0)),
            float(readings.get("irr", 0.0)),
            float(readings.get("pvt", 0.0)),
            float(metrics.get("p1_watts", 0.0)),
            float(metrics.get("p2_watts", 0.0)),
            float(metrics.get("ptotal_watts", 0.0)),
            float(metrics.get("voltage_difference_v", 0.0)),
            float(metrics.get("current_difference_a", 0.0)),
            int(record.get("class_id", 0)),
            record.get("label", "Unknown"),
            record.get("severity", "Unknown"),
            record.get("severity_level", "healthy"),
            float(record.get("confidence", 1.0)),
            record.get("model_used", "random_forest"),
            float(record.get("inference_latency_ms", 0.0)),
            record.get("source", "CSV Batch"),
            1 if record.get("is_demo") else 0,
            1 if record.get("is_low_confidence") else 0,
            record.get("recommended_action", ""),
            record.get("description", ""),
            json.dumps(probs),
            record.get("fault_location", "All Lines Healthy" if int(record.get("class_id", 0)) == 0 else "Panel Line 1")
        ))

    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.executemany("""
            INSERT INTO predictions (
                timestamp, vdc1, vdc2, idc1, idc2, irr, pvt,
                p1_watts, p2_watts, ptotal_watts, v_diff, i_diff,
                class_id, label, severity, severity_level,
                confidence, model_used, inference_latency_ms,
                source, is_demo, is_low_confidence,
                recommended_action, description, probabilities_json,
                fault_location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, rows)
        conn.commit()
        return len(rows)

def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Converts a SQLite row into the standard prediction API payload format."""
    probs = {}
    if row["probabilities_json"]:
        try:
            probs = json.loads(row["probabilities_json"])
        except Exception:
            probs = {}

    # Determine or retrieve fault_location
    fault_loc = None
    if "fault_location" in row.keys() and row["fault_location"]:
        fault_loc = row["fault_location"]
    else:
        # Dynamically evaluate if not stored
        if row["class_id"] == 0:
            fault_loc = "All Lines Healthy"
        else:
            v1, v2 = float(row["vdc1"]), float(row["vdc2"])
            i1, i2 = float(row["idc1"]), float(row["idc2"])
            p1, p2 = v1 * i1, v2 * i2
            if row["class_id"] == 1:
                fault_loc = "Panel Line 1" if v1 < v2 - 8.0 else ("Panel Line 2" if v2 < v1 - 8.0 else ("Panel Line 1" if p1 <= p2 else "Panel Line 2"))
            elif row["class_id"] == 3:
                fault_loc = "Panel Line 1" if i1 < 1.0 and i2 >= 1.0 else ("Panel Line 2" if i2 < 1.0 and i1 >= 1.0 else ("Panel Line 1" if i1 <= i2 else "Panel Line 2"))
            elif row["class_id"] == 4:
                fault_loc = "Panel Line 1" if i1 < i2 - 0.4 else ("Panel Line 2" if i2 < i1 - 0.4 else "Both Panel Lines")
            elif row["class_id"] == 2:
                fault_loc = "Panel Line 1" if p1 < p2 * 0.92 else ("Panel Line 2" if p2 < p1 * 0.92 else "Both Panel Lines")
            else:
                fault_loc = "Panel Line 1" if p1 <= p2 else "Panel Line 2"

    return {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "class_id": row["class_id"],
        "label": row["label"],
        "severity": row["severity"],
        "severity_level": row["severity_level"] or "healthy",
        "confidence": row["confidence"],
        "model_used": row["model_used"],
        "inference_latency_ms": row["inference_latency_ms"],
        "model_inference_latency_ms": row["inference_latency_ms"],
        "source": row["source"],
        "is_demo": bool(row["is_demo"]),
        "is_low_confidence": bool(row["is_low_confidence"]),
        "recommended_action": row["recommended_action"],
        "description": row["description"],
        "probabilities": probs,
        "fault_location": fault_loc,
        "readings": {
            "vdc1": row["vdc1"],
            "vdc2": row["vdc2"],
            "idc1": row["idc1"],
            "idc2": row["idc2"],
            "irr": row["irr"],
            "pvt": row["pvt"]
        },
        "computed_metrics": {
            "p1_watts": row["p1_watts"],
            "p2_watts": row["p2_watts"],
            "ptotal_watts": row["ptotal_watts"],
            "voltage_difference_v": row["v_diff"],
            "current_difference_a": row["i_diff"]
        }
    }

def get_history(limit: int = 50, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Retrieves the most recent predictions ordered by timestamp descending."""
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM predictions ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        return [row_to_dict(r) for r in rows]

def get_prediction_by_id(pred_id: int, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """Retrieves a single prediction by its primary key ID."""
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM predictions WHERE id = ?", (pred_id,))
        row = cursor.fetchone()
        return row_to_dict(row) if row else None

def get_summary(db_path: str = DB_PATH) -> Dict[str, Any]:
    """
    Computes real summary statistics from recorded predictions.
    If 0 predictions are recorded, returns an explicit empty summary state.
    """
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS total FROM predictions")
        total = cursor.fetchone()["total"]

        if total == 0:
            return {
                "total_predictions": 0,
                "has_predictions": False,
                "faults_count": 0,
                "fault_percentage": 0.0,
                "average_confidence": 0.0,
                "fault_counts": {
                    "Normal Operation": 0,
                    "Short-Circuit": 0,
                    "Degradation": 0,
                    "Open-Circuit": 0,
                    "Shadowing": 0
                },
                "latest_prediction": None,
                "last_prediction_time": None
            }

        # Calculate total, average confidence, and total faults
        cursor.execute("""
            SELECT 
                COUNT(*) AS total,
                COALESCE(AVG(confidence), 0.0) AS avg_conf,
                COALESCE(SUM(CASE WHEN class_id != 0 THEN 1 ELSE 0 END), 0) AS fault_cnt
            FROM predictions
        """)
        stats_row = cursor.fetchone()
        total_records = stats_row["total"]
        avg_conf = float(stats_row["avg_conf"])
        fault_cnt = int(stats_row["fault_cnt"])
        fault_pct = round((fault_cnt / total_records) * 100.0, 1) if total_records > 0 else 0.0
        avg_conf_pct = round(avg_conf * 100.0, 1)

        # Fault counts grouped by label
        cursor.execute("""
            SELECT label, COUNT(*) AS count 
            FROM predictions 
            GROUP BY label
        """)
        counts_by_label = {row["label"]: row["count"] for row in cursor.fetchall()}

        fault_counts = {
            "Normal Operation": counts_by_label.get("Normal Operation", 0),
            "Short-Circuit": counts_by_label.get("Short-Circuit", 0),
            "Degradation": counts_by_label.get("Degradation", 0),
            "Open-Circuit": counts_by_label.get("Open-Circuit", 0),
            "Shadowing": counts_by_label.get("Shadowing", 0)
        }

        # Latest prediction
        cursor.execute("SELECT * FROM predictions ORDER BY id DESC LIMIT 1")
        latest_row = cursor.fetchone()
        latest_dict = row_to_dict(latest_row) if latest_row else None

        return {
            "total_predictions": total_records,
            "has_predictions": total_records > 0,
            "faults_count": fault_cnt,
            "fault_percentage": fault_pct,
            "average_confidence": avg_conf_pct,
            "fault_counts": fault_counts,
            "latest_prediction": latest_dict,
            "last_prediction_time": latest_dict["timestamp"] if latest_dict else None
        }

def clear_history(db_path: str = DB_PATH):
    """Clears all records in the predictions table (used for testing or resetting)."""
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM predictions")
        conn.commit()

# =========================================================================
# Authentication & User Management Helper Functions
# =========================================================================

def get_initials(name: str) -> str:
    """Returns 2-letter uppercase initials from full name."""
    parts = name.strip().split()
    if not parts:
        return "PM"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()

def user_row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Converts a user database row into a safe user profile dictionary (no hash or salt)."""
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "full_name": row["full_name"],
        "role": row["role"],
        "initials": get_initials(row["full_name"]),
        "created_at": row["created_at"],
        "last_login": row["last_login"]
    }

def authenticate_user(username_or_email: str, password: str, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """
    Validates user credentials against SQLite. Returns safe user dictionary if valid, else None.
    """
    init_db(db_path)
    clean_identifier = username_or_email.strip().lower()
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM users 
            WHERE LOWER(username) = ? OR LOWER(email) = ?
            LIMIT 1
        """, (clean_identifier, clean_identifier))
        user_row = cursor.fetchone()
        if not user_row:
            return None

        if not verify_password(password, user_row["salt"], user_row["password_hash"]):
            return None

        # Update last login timestamp
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now_str, user_row["id"]))
        conn.commit()

        # Fetch refreshed record
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_row["id"],))
        return user_row_to_dict(cursor.fetchone())

def create_user_session(user_id: int, duration_hours: int = 48, db_path: str = DB_PATH) -> str:
    """Creates a bearer session token in SQLite for the specified user."""
    init_db(db_path)
    token = secrets.token_urlsafe(32)
    created_at = datetime.utcnow()
    expires_at = created_at + timedelta(hours=duration_hours)

    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sessions (token, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
        """, (
            token,
            user_id,
            created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
            expires_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        ))
        conn.commit()
    return token

def get_user_from_token(token: str, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """
    Validates a session token and returns the authenticated user if session is active and unexpired.
    """
    if not token:
        return None
    init_db(db_path)
    clean_token = token.strip()
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.*, s.expires_at 
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ?
            LIMIT 1
        """, (clean_token,))
        row = cursor.fetchone()
        if not row:
            return None

        # Check expiration
        if row["expires_at"] < now_str:
            cursor.execute("DELETE FROM sessions WHERE token = ?", (clean_token,))
            conn.commit()
            return None

        return user_row_to_dict(row)

def delete_user_session(token: str, db_path: str = DB_PATH) -> bool:
    """Deletes an active session on user logout."""
    if not token:
        return False
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token.strip(),))
        conn.commit()
        return cursor.rowcount > 0

def update_profile(user_id: int, full_name: str, email: str, role: Optional[str] = None, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """Updates user profile information in SQLite."""
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        if role:
            cursor.execute("""
                UPDATE users 
                SET full_name = ?, email = ?, role = ?
                WHERE id = ?
            """, (full_name.strip(), email.strip().lower(), role.strip(), user_id))
        else:
            cursor.execute("""
                UPDATE users 
                SET full_name = ?, email = ?
                WHERE id = ?
            """, (full_name.strip(), email.strip().lower(), user_id))
        conn.commit()

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return user_row_to_dict(row) if row else None

