from django.test import TestCase, TransactionTestCase
from django.db import transaction
from decimal import Decimal
from menu.models import FoodItem
from inventory.models import Ingredient, Recipe, RecipeIngredient
from inventory.services import produce_food_item, deduct_stock_for_transaction
from transactions.services import create_transaction_atomic
from transactions.models import Transaction, TransactionLine
from django.contrib.auth import get_user_model
import threading

User = get_user_model()

class InventoryLockingTests(TransactionTestCase):
    # Use TransactionTestCase to test database locking (Thread-based)
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        
        # Create Ingredient
        self.flour = Ingredient.objects.create(name='Flour', current_quantity=1000, unit='g') # 1000g
        
        # Create Food Items
        self.momo = FoodItem.objects.create(name='Momo', price_full=100, category='Main')
        self.chowmein = FoodItem.objects.create(name='Chowmein', price_full=80, category='Main')
        
        # Recipes (Sharing Flour)
        self.r_momo = Recipe.objects.create(food_item=self.momo)
        RecipeIngredient.objects.create(recipe=self.r_momo, ingredient=self.flour, quantity=600) # 600g
        
        self.r_chow = Recipe.objects.create(food_item=self.chowmein)
        RecipeIngredient.objects.create(recipe=self.r_chow, ingredient=self.flour, quantity=600) # 600g
        
        # Active
        self.momo.is_active = True
        self.momo.save()
        self.chowmein.is_active = True
        self.chowmein.save()

    def test_race_condition_shared_ingredient(self):
        """
        Test that two simultaneous transactions sharing an ingredient 
        do NOT result in negative stock.
        Total Flour: 1000g.
        Momo needs 600g. Chowmein needs 600g.
        Only ONE should succeed.
        """
        
        results = {'success': 0, 'errors': []}
        
        def sell_item(item_id, item_name):
            try:
                # Simulate transaction creation
                lines = [{'food_item': item_id, 'quantity': 1, 'portion_type': 'full', 'unit_price': 100, 'line_total': 100}]
                create_transaction_atomic(
                    cashier=self.user,
                    payment_type='cash',
                    lines_data=lines
                )
                results['success'] += 1
            except Exception as e:
                results['errors'].append(f"{item_name}: {str(e)}")

        # Run in threads to simulate race
        t1 = threading.Thread(target=sell_item, args=(self.momo.id, 'Momo'))
        t2 = threading.Thread(target=sell_item, args=(self.chowmein.id, 'Chowmein'))
        
        t1.start()
        t2.start()
        
        t1.join()
        t2.join()
        
        # Check results
        self.flour.refresh_from_db()
        print(f"\nFinal Flour: {self.flour.current_quantity}")
        print(f"Successes: {results['success']}")
        print(f"Errors: {results['errors']}")
        
        # Assertions
        self.assertEqual(results['success'], 1, "Only one transaction should succeed")
        self.assertTrue(self.flour.current_quantity >= 0, "Stock should not be negative")
        self.assertEqual(self.flour.current_quantity, 400, "Should have 400g left (1000 - 600)")

    def test_production_insufficient_message(self):
        """Test exact error message for production"""
        self.flour.current_quantity = 500
        self.flour.save()
        
        with self.assertRaises(ValueError) as cm:
            produce_food_item(self.momo, 1, self.user)
            
        self.assertIn("Cannot increase stock: Missing Flour", str(cm.exception))
