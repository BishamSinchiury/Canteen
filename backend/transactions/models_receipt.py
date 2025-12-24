from django.db import models
from django.utils import timezone


class Receipt(models.Model):
    transaction = models.OneToOneField('transactions.Transaction', on_delete=models.CASCADE, related_name='receipt')
    token = models.CharField(max_length=50, unique=True)
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.token}"
