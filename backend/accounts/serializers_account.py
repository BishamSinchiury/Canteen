from rest_framework import serializers
from .models import CreditAccount


class CreditAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditAccount
        fields = '__all__'
