from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from .models import FoodItem
from .serializers import FoodItemSerializer
from accounts.permissions import IsManagerOrAdminForWrite
from audit.models import AuditLog


class FoodItemFilter(filters.FilterSet):
    name = filters.CharFilter(field_name='name', lookup_expr='icontains')
    category = filters.CharFilter(field_name='category', lookup_expr='icontains')
    is_active = filters.BooleanFilter(field_name='is_active')
    price_min = filters.NumberFilter(field_name='price_full', lookup_expr='gte')
    price_max = filters.NumberFilter(field_name='price_full', lookup_expr='lte')
    
    class Meta:
        model = FoodItem
        fields = ['name', 'category', 'is_active', 'price_min', 'price_max']


class FoodItemViewSet(viewsets.ModelViewSet):
    queryset = FoodItem.objects.all().order_by('name')
    serializer_class = FoodItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdminForWrite]
    filterset_class = FoodItemFilter
    
    def get_queryset(self):
        qs = super().get_queryset()
        # Cashiers should only see active items
        if self.request.user.role == 'cashier':
            qs = qs.filter(is_active=True)
        return qs
    
    def perform_create(self, serializer):
        item = serializer.save(created_by=self.request.user)
        AuditLog.objects.create(
            who=self.request.user,
            action='create',
            model='FoodItem',
            new_data={'name': item.name, 'id': item.id}
        )
    
    def perform_update(self, serializer):
        old_data = FoodItemSerializer(self.get_object()).data
        serializer.save()
        AuditLog.objects.create(
            who=self.request.user,
            action='update',
            model='FoodItem',
            previous_data=old_data,
            new_data=serializer.data
        )
    
    def perform_destroy(self, instance):
        # Instead of hard delete, deactivate
        old_data = FoodItemSerializer(instance).data
        instance.is_active = False
        instance.save()
        AuditLog.objects.create(
            who=self.request.user,
            action='deactivate',
            model='FoodItem',
            previous_data=old_data
        )
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get list of unique categories."""
        categories = FoodItem.objects.filter(is_active=True).values_list('category', flat=True).distinct()
        return Response([c for c in categories if c])
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle active status of a food item."""
        item = self.get_object()
        item.is_active = not item.is_active
        item.save()
        AuditLog.objects.create(
            who=request.user,
            action='toggle_active',
            model='FoodItem',
            new_data={'id': item.id, 'is_active': item.is_active}
        )
        return Response({'id': item.id, 'is_active': item.is_active})
