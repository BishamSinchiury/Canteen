from django.db import models
from django.conf import settings
from menu.models import FoodItem


class Transaction(models.Model):
    PAYMENT_CHOICES = (('cash', 'Cash'), ('credit', 'Credit'), ('mixed', 'Mixed'))

    timestamp = models.DateTimeField(auto_now_add=True)
    cashier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='transactions')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_CHOICES)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    payment_reference = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    is_canceled = models.BooleanField(default=False)

    def __str__(self):
        return f"TX {self.id} - {self.total_amount} by {self.cashier}"


class TransactionLine(models.Model):
    PORTION_CHOICES = (('full', 'Full'), ('half', 'Half'))

    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='lines')
    food_item = models.ForeignKey(FoodItem, on_delete=models.PROTECT)
    portion_type = models.CharField(max_length=10, choices=PORTION_CHOICES)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.line_total = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class Receipt(models.Model):
    transaction = models.OneToOneField('Transaction', on_delete=models.CASCADE, related_name='receipt')
    token = models.CharField(max_length=50, unique=True)
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.token}"
