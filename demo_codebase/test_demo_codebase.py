# Minimal tests for demo_codebase

from recipe import create_recipe, add_ingredient, get_total_ingredients_count
from shopping import create_price_database, calculate_total_cost


def test_recipe_build_and_counts():
    r = create_recipe("Test", 5)
    assert r.name == "Test"
    assert get_total_ingredients_count(r) == 0

    add_ingredient(r, "flour", 2.0, "cups")
    add_ingredient(r, "eggs", 2.0, "whole")

    assert get_total_ingredients_count(r) == 2


def test_total_cost_uses_discounted_prices():
    r = create_recipe("Test", 5)
    add_ingredient(r, "milk", 1.0, "cups")
    add_ingredient(r, "butter", 1.0, "cups")

    prices = create_price_database()
    # Base milk=0.60, butter=1.20, dairy has 10% off in impl
    total = calculate_total_cost(r, prices)
    # 0.60*0.9 + 1.20*0.9 = 1.62
    assert abs(total - 1.62) < 1e-9
