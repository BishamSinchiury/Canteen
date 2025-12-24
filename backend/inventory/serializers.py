from rest_framework import serializers
from decimal import Decimal
from .models import Vendor, Ingredient, StockMovement, Recipe, RecipeIngredient, PurchaseOrder, PurchaseOrderItem
from menu.models import FoodItem

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = '__all__'

class IngredientSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True, use_url=True)
    
    class Meta:
        model = Ingredient
        fields = '__all__'

class StockMovementSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.ReadOnlyField(source='ingredient.name')
    user_name = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = StockMovement
        fields = '__all__'

class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.ReadOnlyField(source='ingredient.name')
    unit = serializers.ReadOnlyField(source='ingredient.unit')

    class Meta:
        model = RecipeIngredient
        fields = ['id', 'ingredient', 'ingredient_name', 'quantity', 'unit']

class RecipeSerializer(serializers.ModelSerializer):
    ingredients = RecipeIngredientSerializer(many=True, read_only=True)
    food_item_name = serializers.ReadOnlyField(source='food_item.name')

    class Meta:
        model = Recipe
        fields = ['id', 'food_item', 'food_item_name', 'instructions', 'ingredients']

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.ReadOnlyField(source='ingredient.name')
    unit = serializers.ReadOnlyField(source='ingredient.unit')

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'ingredient', 'ingredient_name', 'quantity', 'unit_price', 'received_quantity', 'unit']

class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, required=False)
    vendor_name = serializers.ReadOnlyField(source='vendor.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = PurchaseOrder
        fields = '__all__'

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        po = PurchaseOrder.objects.create(**validated_data)
        total_amount = 0
        for item_data in items_data:
            qty = Decimal(str(item_data.get('quantity', 0)))
            price = Decimal(str(item_data.get('unit_price', 0)))
            total_amount += qty * price
            PurchaseOrderItem.objects.create(purchase_order=po, **item_data)
        po.total_amount = total_amount
        po.save()
        return po
