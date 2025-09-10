# shopping.py - Shopping list functions
from typing import List, Dict
from recipe import Recipe, Ingredient

def extract_shopping_items(recipe: Recipe) -> List[str]:
    return [ing.name for ing in recipe.ingredients]

def calculate_total_cost(recipe: Recipe, price_db: Dict[str, float]) -> float:
    total = 0.0
    for ingredient in recipe.ingredients:
        unit_price = price_db.get(ingredient.name, 0.0)
        total += ingredient.amount * unit_price
    return total

def group_by_category(recipe: Recipe, categories: Dict[str, str]) -> Dict[str, List[Ingredient]]:
    grouped = {}
    for ingredient in recipe.ingredients:
        category = categories.get(ingredient.name, "other")
        if category not in grouped:
            grouped[category] = []
        grouped[category].append(ingredient)
    return grouped

def create_price_database() -> Dict[str, float]:
    return {
        "flour": 0.50,
        "sugar": 0.75,
        "eggs": 0.25,
        "butter": 1.20,
        "milk": 0.60
    }