# Shopping Module Guide

The shopping module helps plan grocery trips for recipes.

## Core Functions

- `extract_shopping_items()` - Gets ingredient names from recipe (shopping.py:6)
- `group_by_category()` - Groups ingredients by store section (shopping.py:16)

## Usage

```python
from shopping import extract_shopping_items, create_price_database

items = extract_shopping_items(recipe)
prices = create_price_database()
```

## Price Database

Includes automatic 10% discount on dairy items.