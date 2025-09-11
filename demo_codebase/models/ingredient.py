# models/ingredient.py - Ingredient data model
from dataclasses import dataclass

@dataclass
class Ingredient:
    name: str
    amount: float
    unit: str
    
    def __str__(self) -> str:
        return f"{self.amount} {self.unit} {self.name}"