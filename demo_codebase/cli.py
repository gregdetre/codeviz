#!/usr/bin/env python3
"""Simple CLI for recipe planning demo."""

import sys
from main import build_pancake_recipe

def main():
    if len(sys.argv) < 2:
        print("Usage: cli.py <recipe_name>")
        print("Available: pancakes")
        sys.exit(1)
    
    recipe_name = sys.argv[1].lower()
    
    if recipe_name == "pancakes":
        recipe = build_pancake_recipe()
        print(f"Created: {recipe.name}")
        print(f"Ingredients: {len(recipe.ingredients)}")
        print(f"Prep time: {recipe.prep_time} min")
    else:
        print(f"Unknown recipe: {recipe_name}")
        sys.exit(1)

if __name__ == "__main__":
    main()