from django.db import models
from accounts.models import User


class FoodItem(models.Model):
    PORTION_CHOICES = (('full', 'Full'), ('half', 'Half'))

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    available_portions = models.JSONField(default=list)  # e.g. ['full','half']
    price_full = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    price_half = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    category = models.CharField(max_length=100, blank=True)
    image = models.ImageField(upload_to='menu_items/', null=True, blank=True)
    stock_quantity = models.IntegerField(null=True, blank=True, help_text="Pre-made stock count (optional)")
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_fooditems')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def has_valid_recipe(self):
        """Check if item has a recipe with at least 2 ingredients"""
        try:
            recipe = self.recipe
            return recipe.ingredients.count() >= 2
        except:
            return False

    def calculate_max_available(self):
        """Calculate how many items can be made from current ingredient stock"""
        try:
            recipe = self.recipe
            if not recipe:
                return 0
            
            min_possible = float('inf')
            for recipe_ingredient in recipe.ingredients.all():
                ingredient = recipe_ingredient.ingredient
                required_qty = recipe_ingredient.quantity
                
                if required_qty <= 0:
                    continue
                    
                possible = int(ingredient.current_quantity / required_qty)
                min_possible = min(min_possible, possible)
            
            return min_possible if min_possible != float('inf') else 0
        except:
            return 0

    def can_activate(self):
        """Check if item can be activated (must have valid recipe)"""
        return self.has_valid_recipe()

    def get_availability_status(self):
        """Get detailed availability info"""
        if self.stock_quantity is not None:
            # Pre-made item
            return {
                'type': 'pre_made',
                'available': self.stock_quantity > 0,
                'quantity': self.stock_quantity,
                'can_make': 0
            }
        else:
            # Made-to-order item
            can_make = self.calculate_max_available()
            return {
                'type': 'made_to_order',
                'available': can_make > 0,
                'quantity': 0,
                'can_make': can_make
            }

