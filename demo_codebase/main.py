# main.py - Main recipe planning workflow
from recipe import (
    create_recipe,
    add_ingredient,
    add_instruction,
    get_total_ingredients_count,
)
from shopping import (
    extract_shopping_items,
    calculate_total_cost,
    group_by_category,
    create_price_database,
)
from utils.helpers import format_price, validate_positive_number
from models.recipe import Recipe
from models.ingredient import Ingredient, str as ingredient_str


def build_pancake_recipe():
    recipe = create_recipe("Fluffy Pancakes", 15)

    recipe = add_ingredient(recipe, "flour", 2.0, "cups")
    recipe = add_ingredient(recipe, "sugar", 2.0, "tbsp")
    recipe = add_ingredient(recipe, "eggs", 2.0, "whole")
    recipe = add_ingredient(recipe, "milk", 1.5, "cups")
    recipe = add_ingredient(recipe, "butter", 0.25, "cups")

    recipe = add_instruction(recipe, "Mix dry ingredients")
    recipe = add_instruction(recipe, "Beat eggs and milk")
    recipe = add_instruction(recipe, "Combine wet and dry ingredients")
    recipe = add_instruction(recipe, "Cook on griddle")

    return recipe


def plan_shopping(recipe):
    price_db = create_price_database()
    shopping_list = extract_shopping_items(recipe)
    total_cost = calculate_total_cost(recipe, price_db)

    categories = {
        "flour": "dry_goods",
        "sugar": "dry_goods",
        "eggs": "dairy",
        "milk": "dairy",
        "butter": "dairy",
    }
    grouped_items = group_by_category(recipe, categories)

    return shopping_list, total_cost, grouped_items


def main():
    print("Building recipe...")
    recipe = build_pancake_recipe()

    print(f"Recipe: {recipe.name}")
    print(f"Prep time: {recipe.prep_time} minutes")
    print(f"Ingredients count: {get_total_ingredients_count(recipe)}")
    # Show first ingredient via ingredient module helper to ensure call edge
    print(f"First ingredient: {ingredient_str(recipe.ingredients[0])}")

    print("\nPlanning shopping...")
    shopping_list, cost, grouped = plan_shopping(recipe)

    print(f"Shopping items: {shopping_list}")
    print(f"Total estimated cost: {format_price(cost)}")
    print(f"Grouped by category: {list(grouped.keys())}")

    # Validate costs are positive
    validate_positive_number(cost, "total cost")


if __name__ == "__main__":
    main()
