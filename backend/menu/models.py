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
    stock_quantity = models.IntegerField(null=True, blank=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_fooditems')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
