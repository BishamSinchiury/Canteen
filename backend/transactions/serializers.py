from rest_framework import serializers
from .models import Transaction, TransactionLine
from menu.models import FoodItem


class TransactionLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionLine
        fields = ('id', 'food_item', 'portion_type', 'unit_price', 'quantity', 'line_total')
        read_only_fields = ('id', 'line_total')


class TransactionSerializer(serializers.ModelSerializer):
    lines = TransactionLineSerializer(many=True)

    class Meta:
        model = Transaction
        fields = ('id', 'timestamp', 'cashier', 'payment_type', 'total_amount', 'tax', 'discount', 'payment_reference', 'notes', 'is_canceled', 'lines')
        read_only_fields = ('id', 'timestamp', 'total_amount')

    def validate(self, data):
        lines = data.get('lines', [])
        if not lines:
            raise serializers.ValidationError('Transaction must include at least one line')
        # Validate that portion types are allowed on the food item
        for l in lines:
            fi = FoodItem.objects.get(pk=l['food_item'].id if isinstance(l['food_item'], FoodItem) else l['food_item'])
            if l['portion_type'] not in fi.available_portions:
                raise serializers.ValidationError(f"Portion {l['portion_type']} not available for {fi.name}")
        return data

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        tx = Transaction.objects.create(**validated_data)
        total = 0
        for l in lines_data:
            line = TransactionLine.objects.create(transaction=tx, **l)
            total += line.line_total
        tx.total_amount = total + tx.tax - tx.discount
        tx.save()
        return tx
