"""
Data and Sensor Input Validation Module
=======================================
Validates electrical and environmental sensor parameters, ensuring values
fall within plausible physical bounds of a 5kW photovoltaic installation.
Detects low-confidence operating conditions such as dawn/dusk/night quiescent states.
"""

from typing import Dict, Any, List, Tuple

# Physical parameter bounds for Canadian Solar 5kW testbed
BOUNDS = {
    "vdc1": {"min": 0.0, "max": 450.0, "unit": "V", "name": "DC Voltage String 1"},
    "vdc2": {"min": 0.0, "max": 450.0, "unit": "V", "name": "DC Voltage String 2"},
    "idc1": {"min": 0.0, "max": 15.0, "unit": "A", "name": "DC Current String 1"},
    "idc2": {"min": 0.0, "max": 15.0, "unit": "A", "name": "DC Current String 2"},
    "irr":  {"min": 0.0, "max": 1400.0, "unit": "W/m²", "name": "Solar Irradiance"},
    "pvt":  {"min": -25.0, "max": 85.0, "unit": "°C", "name": "Module Temperature"}
}

LOW_IRRADIANCE_THRESHOLD = 50.0  # W/m²

class DataValidator:
    @staticmethod
    def validate_reading(data: Dict[str, float]) -> Tuple[bool, List[str], List[str]]:
        """
        Validates a single sensor reading dictionary.
        Returns:
            is_valid (bool): True if inputs are physically valid
            errors (List[str]): List of error messages for out-of-bound variables
            warnings (List[str]): List of operational warnings (e.g., low irradiance)
        """
        errors = []
        warnings = []

        # Check required fields
        for field, meta in BOUNDS.items():
            if field not in data or data[field] is None:
                errors.append(f"Missing required sensor field: '{field}' ({meta['name']}).")
                continue

            val = float(data[field])
            if val < meta["min"] or val > meta["max"]:
                errors.append(
                    f"{meta['name']} ({field}={val:.2f}{meta['unit']}) exceeds physical limits "
                    f"[{meta['min']}{meta['unit']} - {meta['max']}{meta['unit']}]."
                )

        # Operational domain checks
        if "irr" in data and data["irr"] is not None:
            if float(data["irr"]) < LOW_IRRADIANCE_THRESHOLD:
                warnings.append(
                    f"Low solar irradiance detected ({data['irr']:.1f} W/m² < {LOW_IRRADIANCE_THRESHOLD} W/m²). "
                    "Inverter MPPT operates in standby/quiescent mode. Diagnostics have reduced confidence."
                )

        is_valid = len(errors) == 0
        return is_valid, errors, warnings
