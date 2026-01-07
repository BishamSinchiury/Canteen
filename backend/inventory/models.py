from django.db import models
from django.conf import settings
from menu.models import FoodItem

class Vendor(models.Model):
    name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Positive = We owe them, Negative = They owe us")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (Bal: {self.balance})"

class VendorTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('CREDIT', 'Credit (Purchase)'),
        ('DEBIT', 'Debit (Payment)'),
    ]
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True, help_text="PO # or Payment Ref")
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.vendor.name} - {self.transaction_type} {self.amount}"

class Ingredient(models.Model):
    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('g', 'Gram'),
        ('l', 'Liter'),
        ('ml', 'Milliliter'),
        ('pc', 'Piece'),
        ('bag', 'Bag'),
        ('box', 'Box'),
        ('pkt', 'Packet'),
    ]
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    image = models.ImageField(upload_to='ingredients/', null=True, blank=True)
    current_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.unit})"

class StockMovement(models.Model):
    TYPE_CHOICES = [
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
        ('ADJUST', 'Adjustment'),
    ]
    REASON_CHOICES = [
        ('PURCHASE', 'Purchase'),
        ('CONSUMPTION', 'Consumption'),
        ('WASTAGE', 'Wastage'),
        ('SPOILAGE', 'Spoilage'),
        ('AUDIT', 'Audit Correction'),
        ('OTHER', 'Other'),
    ]
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='movements')
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    movement_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    reference = models.CharField(max_length=100, blank=True, help_text="PO #, TX #, or other reference")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.movement_type} - {self.ingredient.name} ({self.quantity})"

class Recipe(models.Model):
    food_item = models.OneToOneField(FoodItem, on_delete=models.CASCADE, related_name='recipe')
    instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Recipe for {self.food_item.name}"

class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, help_text="Quantity per unit of FoodItem")

    def __str__(self):
        return f"{self.ingredient.name} for {self.recipe.food_item.name}"

class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('RECEIVED', 'Received'),
        ('CANCELLED', 'Cancelled'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('CREDIT', 'Credit'),
        ('CASH', 'Cash'),
    ]
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='purchase_orders', null=True, blank=True)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='CREDIT')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    received_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"PO #{self.id} - {self.vendor.name}"

class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    received_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)

    def __str__(self):
        return f"{self.ingredient.name} in PO #{self.purchase_order.id}"
