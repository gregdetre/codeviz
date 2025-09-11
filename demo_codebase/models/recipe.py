# models/recipe.py - Recipe data model
from dataclasses import dataclass
from typing import List
from .ingredient import Ingredient

@dataclass
class Recipe:
    name: str
    ingredients: List[Ingredient]
    instructions: List[str]
    prep_time: int  # minutes
    
    def add_ingredient(self, ingredient: Ingredient) -> None:
        self.ingredients.append(ingredient)
    
    def get_ingredient_count(self) -> int:
        return len(self.ingredients)