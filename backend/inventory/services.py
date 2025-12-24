from decimal import Decimal
from django.db import transaction
from .models import Ingredient, StockMovement, Recipe, RecipeIngredient

def deduct_stock_for_transaction(tx_line):
    """
    Deduct ingredients from stock based on a TransactionLine.
    If a recipe exists for the FoodItem, deduct the required ingredients.
    """
    food_item = tx_line.food_item
    quantity_sold = Decimal(str(tx_line.quantity))
    
    try:
        recipe = Recipe.objects.get(food_item=food_item)
    except Recipe.DoesNotExist:
        # No recipe defined, skip deduction
        return

    with transaction.atomic():
        for recipe_ingredient in recipe.ingredients.all():
            ingredient = recipe_ingredient.ingredient
            deduction_qty = recipe_ingredient.quantity * quantity_sold
            
            # Update current quantity (allows negative stock as per requirements)
            ingredient.current_quantity -= deduction_qty
            ingredient.save()
            
            # Log the movement
            StockMovement.objects.create(
                ingredient=ingredient,
                quantity=deduction_qty,
                movement_type='OUT',
                reason='CONSUMPTION',
                reference=f'TX #{tx_line.transaction.id}',
                user=tx_line.transaction.cashier,
                notes=f'Sold {quantity_sold} {food_item.name}'
            )

def reverse_stock_deduction(tx):
    """
    Reverse stock deduction when a transaction is canceled.
    """
    for line in tx.lines.all():
        food_item = line.food_item
        quantity_sold = Decimal(str(line.quantity))
        
        try:
            recipe = Recipe.objects.get(food_item=food_item)
        except Recipe.DoesNotExist:
            continue

        with transaction.atomic():
            for recipe_ingredient in recipe.ingredients.all():
                ingredient = recipe_ingredient.ingredient
                reversal_qty = recipe_ingredient.quantity * quantity_sold
                
                # Add back to stock
                ingredient.current_quantity += reversal_qty
                ingredient.save()
                
                # Log the movement
                StockMovement.objects.create(
                    ingredient=ingredient,
                    quantity=reversal_qty,
                    movement_type='IN',
                    reason='AUDIT',
                    reference=f'TX #{tx.id} CANCELED',
                    user=None, # System reversal
                    notes=f'Reversal for canceled sale of {quantity_sold} {food_item.name}'
                )
