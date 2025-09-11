# utils/helpers.py - Helper utility functions
from typing import Dict, List

def format_price(price: float) -> str:
    """Format price as currency string"""
    return f"${price:.2f}"

def calculate_discount(original_price: float, discount_percent: float) -> float:
    """Calculate discounted price"""
    return original_price * (1 - discount_percent / 100)

def validate_positive_number(value: float, name: str) -> None:
    """Validate that a number is positive"""
    if value <= 0:
        raise ValueError(f"{name} must be positive, got {value}")