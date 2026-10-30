"""
Unit tests for Sensor Input Validator
"""

from backend.src.data_validator import DataValidator

def test_valid_reading():
    valid_data = {
        "vdc1": 290.0,
        "vdc2": 291.5,
        "idc1": 7.1,
        "idc2": 7.0,
        "irr": 800.0,
        "pvt": 35.0
    }
    is_valid, errors, warnings = DataValidator.validate_reading(valid_data)
    assert is_valid is True
    assert len(errors) == 0
    assert len(warnings) == 0

def test_invalid_voltage_reading():
    invalid_data = {
        "vdc1": -10.0,  # Negative voltage
        "vdc2": 600.0,  # Exceeds max 450V
        "idc1": 7.1,
        "idc2": 7.0,
        "irr": 800.0,
        "pvt": 35.0
    }
    is_valid, errors, warnings = DataValidator.validate_reading(invalid_data)
    assert is_valid is False
    assert len(errors) >= 2

def test_low_irradiance_warning():
    low_sun_data = {
        "vdc1": 15.0,
        "vdc2": 15.0,
        "idc1": 0.05,
        "idc2": 0.04,
        "irr": 20.0,  # < 50 W/m²
        "pvt": 10.0
    }
    is_valid, errors, warnings = DataValidator.validate_reading(low_sun_data)
    assert is_valid is True
    assert len(warnings) == 1
    assert "Low solar irradiance" in warnings[0]
