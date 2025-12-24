from rest_framework import serializers
from .models import CashBookEntry, Expense


class CashBookEntrySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = CashBookEntry
        fields = [
            'id', 'date', 'entry_type', 'amount', 'description',
            'related_transaction', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'date', 'created_by', 'created_by_name']


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            'id', 'date', 'description', 'amount', 'category',
            'paid_by', 'attached_receipt'
        ]
        read_only_fields = ['id', 'date']
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be positive')
        return value
