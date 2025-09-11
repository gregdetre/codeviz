# models/ingredient.py - Ingredient data model
from dataclasses import dataclass


@dataclass
class Ingredient:
    name: str
    amount: float
    unit: str

    def __str__(self) -> str:
        return f"{self.amount} {self.unit} {self.name}"


def str(ingredient: "Ingredient") -> str:
    """Return a user-friendly string for an ingredient (top-level helper).

    This exists to give the analyzer a concrete top-level function in the
    `ingredient` module that can be called from elsewhere, ensuring a call edge
    to `ingredient` in the demo graph.
    """
    return f"{ingredient.amount} {ingredient.unit} {ingredient.name}"
