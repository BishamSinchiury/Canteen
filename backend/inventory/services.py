from decimal import Decimal
from django.db import transaction
from .models import Ingredient, StockMovement, Recipe, RecipeIngredient, VendorTransaction, PurchaseOrder
from ledger.models import CashBookEntry, Expense

def record_vendor_transaction(vendor, amount, transaction_type, reference, user, notes=''):
    """
    Record a credit/debit transaction for a vendor and update balance.
    CREDIT (Purchase): We owe them money (Balance increases)
    DEBIT (Payment): We pay them (Balance decreases)
    """
    with transaction.atomic():
        # Lock vendor row for update
        # vendor = Vendor.objects.select_for_update().get(id=vendor.id) 
        # Using simple update for now
        
        if transaction_type == 'CREDIT':
            vendor.balance += amount
        elif transaction_type == 'DEBIT':
            vendor.balance -= amount
            
            # DEBIT means we paid the vendor, so record as Expense and Cashbook Outflow
            Expense.objects.create(
                description=f"Payment to Vendor: {vendor.name}",
                amount=amount,
                category="Vendor Payment",
                paid_by="cash", # Assuming cash/bank outgoing
                date=transaction.now() if hasattr(transaction, 'now') else None  # Fallback or let auto_now_add handle it
                # Actually Expense.date is auto_now_add, so we don't need to pass it unless we want specific time
            )
            
            CashBookEntry.objects.create(
                entry_type='expense',
                amount=amount,
                description=f"Payment to Vendor: {vendor.name} (Ref: {reference})",
                created_by=user
            )
        
        vendor.save()
        
        VendorTransaction.objects.create(
            vendor=vendor,
            transaction_type=transaction_type,
            amount=amount,
            reference=reference,
            balance_after=vendor.balance,
            created_by=user,
            notes=notes
        )

def process_purchase_order(po_id, user):
    """
    Mark PO as received, update stock, and credit vendor account.
    """
    try:
        po = PurchaseOrder.objects.get(id=po_id)
    except PurchaseOrder.DoesNotExist:
        return
        
    if po.status == 'RECEIVED':
        return # Already processed

    from django.utils import timezone
    with transaction.atomic():
        po.status = 'RECEIVED'
        po.received_at = timezone.now()
        po.save()

        # Update Stock for each item
        for item in po.items.all():
            ingredient = item.ingredient
            qty = item.received_quantity if item.received_quantity > 0 else item.quantity
            qty = Decimal(str(qty)) # Ensure Decimal for arithmetic
            ingredient.current_quantity += qty
            ingredient.save()

            # Safe vendor name access
            vendor_name = po.vendor.name if po.vendor else 'Cash Purchase'
            StockMovement.objects.create(
                ingredient=ingredient,
                quantity=qty,
                movement_type='IN',
                reason='PURCHASE',
                reference=f'PO #{po.id}',
                user=user,
                notes=f'Received from {vendor_name} ({po.payment_method})'
            )

        # Credit Vendor Ledger only if Credit and Vendor is selected
        if po.total_amount > 0 and po.payment_method == 'CREDIT' and po.vendor:
            record_vendor_transaction(
                vendor=po.vendor,
                amount=po.total_amount,
                transaction_type='CREDIT',
                reference=f'PO #{po.id}',
                user=user,
                notes=f'Purchase Order Received'
            )
        
        # If Cash Purchase, record as Expense and Cashbook Outflow immediately
        elif po.total_amount > 0 and po.payment_method == 'CASH':
             vendor_desc = po.vendor.name if po.vendor else "Direct Purchase"
             Expense.objects.create(
                description=f"Cash Purchase (PO #{po.id}): {vendor_desc}",
                amount=po.total_amount,
                category="Inventory Purchase",
                paid_by="cash"
            )
            
             CashBookEntry.objects.create(
                entry_type='expense',
                amount=po.total_amount,
                description=f"Cash Purchase of Inventory (PO #{po.id})",
                created_by=user
            )


def deduct_stock_for_transaction(tx_line):
    """
    Deduct ingredients from stock based on a TransactionLine.
    If FoodItem tracks stock (stock_quantity is not None), deduct from that instead.
    If a recipe exists for the FoodItem, deduct the required ingredients.
    """
    # CRITICAL: Re-fetch food_item with lock to ensure we use latest DB state
    # This uses the lock acquired in create_transaction_atomic if called from there
    from menu.models import FoodItem
    from .models import Recipe, Ingredient, StockMovement
    
    food_item = FoodItem.objects.select_for_update().get(id=tx_line.food_item.id)
    quantity_sold = Decimal(str(tx_line.quantity))
    
    # Check if FoodItem tracks its own stock (Batch Production / Pre-made)
    if food_item.stock_quantity is not None:
        food_item.stock_quantity -= int(quantity_sold)
        if food_item.stock_quantity <= 0:
            food_item.stock_quantity = 0
            food_item.is_active = False # Auto-deactivate when sold out
        food_item.save()
        return # Skip ingredient deduction as it was done during production

    try:
        recipe = Recipe.objects.get(food_item=food_item)
    except Recipe.DoesNotExist:
        # No recipe defined, skip deduction
        return

    with transaction.atomic():
        for recipe_ingredient in recipe.ingredients.select_related('ingredient').all():
            # Lock the ingredient row to prevent race conditions
            ingredient = Ingredient.objects.select_for_update().get(id=recipe_ingredient.ingredient.id)
            deduction_qty = recipe_ingredient.quantity * quantity_sold
            
            # Update current quantity 
            if ingredient.current_quantity < deduction_qty:
                raise ValueError(f"Insufficient stock for {ingredient.name} (Required: {deduction_qty}, Available: {ingredient.current_quantity})")
                
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
            for recipe_ingredient in recipe.ingredients.select_related('ingredient').all():
                ingredient = Ingredient.objects.select_for_update().get(id=recipe_ingredient.ingredient.id)
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

def produce_food_item(food_item, quantity, user):
    """
    Produce a batch of food items:
    1. Validate Recipe (exists + >=2 ingredients)
    2. Check stock availability
    3. Deduct ingredients
    4. Update FoodItem stock
    """
    quantity = int(quantity)
    if quantity <= 0:
        raise ValueError("Quantity must be positive")

    try:
        recipe = Recipe.objects.get(food_item=food_item)
    except Recipe.DoesNotExist:
        raise ValueError("No recipe defined for this item")

    ingredients = recipe.ingredients.all()
    if ingredients.count() < 2:
        raise ValueError("Recipe must have at least 2 ingredients to be valid for production")

    with transaction.atomic():
        # Check stock first (fetch locked rows)
        locked_ingredients = []
        for recipe_ing in ingredients:
            # Lock ingredient for update
            ing = Ingredient.objects.select_for_update().get(id=recipe_ing.ingredient.id)
            required_qty = recipe_ing.quantity * Decimal(quantity)
            
            if ing.current_quantity < required_qty:
                raise ValueError(f"Cannot increase stock: Missing {ing.name} (Required: {required_qty}, Available: {ing.current_quantity})")
            
            locked_ingredients.append((ing, required_qty, recipe_ing))


        # Deduct Stock
        for ing, deduction_qty, recipe_ing in locked_ingredients:
            ing.current_quantity -= deduction_qty
            ing.save()

            StockMovement.objects.create(
                ingredient=ing,
                quantity=deduction_qty,
                movement_type='OUT',
                reason='CONSUMPTION',
                reference=f'Production: {food_item.name}',
                user=user,
                notes=f'Produced {quantity} {food_item.name}'
            )

        # Update Food Item
        current_stock = food_item.stock_quantity or 0
        food_item.stock_quantity = current_stock + quantity
        food_item.is_active = True
        food_item.save()

