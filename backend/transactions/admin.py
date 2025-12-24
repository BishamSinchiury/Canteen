from django.contrib import admin
from .models import Transaction, TransactionLine, Receipt


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'timestamp', 'cashier', 'payment_type', 'total_amount', 'is_canceled')


@admin.register(TransactionLine)
class TransactionLineAdmin(admin.ModelAdmin):
    list_display = ('transaction', 'food_item', 'portion_type', 'quantity', 'line_total')


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('token', 'transaction', 'created_at')
