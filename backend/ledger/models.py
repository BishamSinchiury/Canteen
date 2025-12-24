from django.db import models
from django.conf import settings
from transactions.models import Transaction


class CashBookEntry(models.Model):
    ENTRY_TYPE = (('income', 'Income'), ('expense', 'Expense'))

    date = models.DateTimeField(auto_now_add=True)
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    related_transaction = models.ForeignKey(Transaction, null=True, blank=True, on_delete=models.SET_NULL)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.entry_type} {self.amount}"


class Expense(models.Model):
    date = models.DateTimeField(auto_now_add=True)
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100, blank=True)
    paid_by = models.CharField(max_length=50, default='cash')
    attached_receipt = models.FileField(upload_to='receipts/', null=True, blank=True)
