# recipe.py - Recipe data structures and core functions
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class Ingredient:
    name: str
    amount: float
    unit: str

@dataclass
class Recipe:
    name: str
    ingredients: List[Ingredient]
    instructions: List[str]
    prep_time: int  # minutes

def create_recipe(name: str, prep_time: int) -> Recipe:
    return Recipe(name=name, ingredients=[], instructions=[], prep_time=prep_time)

def add_ingredient(recipe: Recipe, name: str, amount: float, unit: str) -> Recipe:
    ingredient = Ingredient(name, amount, unit)
    recipe.ingredients.append(ingredient)
    return recipe

def add_instruction(recipe: Recipe, instruction: str) -> Recipe:
    recipe.instructions.append(instruction)
    return recipe

def get_total_ingredients_count(recipe: Recipe) -> int:
    return len(recipe.ingredients)