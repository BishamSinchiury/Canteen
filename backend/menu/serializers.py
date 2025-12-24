from rest_framework import serializers
from .models import FoodItem


class FoodItemSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True, use_url=True)
    
    class Meta:
        model = FoodItem
        fields = '__all__'

    def validate(self, data):
        portions = data.get('available_portions', [])
        if 'full' in portions and not data.get('price_full'):
            raise serializers.ValidationError('price_full required if full portion available')
        if 'half' in portions and not data.get('price_half'):
            raise serializers.ValidationError('price_half required if half portion available')
        return data
