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
        
        # Check if trying to activate without recipe
        if item.is_active and not item.has_valid_recipe():
            item.is_active = False
            item.save()
            
        AuditLog.objects.create(
            who=self.request.user,
            action='create',
            model='FoodItem',
            new_data={'name': item.name, 'id': item.id, 'has_recipe': item.has_valid_recipe()}
        )
    
    def perform_update(self, serializer):
        old_data = FoodItemSerializer(self.get_object()).data
        item = serializer.save()
        
        # Prevent activation without valid recipe
        if item.is_active and not item.has_valid_recipe():
            item.is_active = False
            item.save()
            
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
        """Toggle active status of a food item with recipe validation."""
        item = self.get_object()
        
        # If trying to activate, check recipe
        if not item.is_active:
            if not item.has_valid_recipe():
                return Response({
                    'error': 'Menu item cannot be activated without a valid recipe (minimum 2 ingredients required).'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        item.is_active = not item.is_active
        item.save()
        AuditLog.objects.create(
            who=request.user,
            action='toggle_active',
            model='FoodItem',
            new_data={'id': item.id, 'is_active': item.is_active}
        )
        return Response({'id': item.id, 'is_active': item.is_active})

    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        """Get availability status for a menu item"""
        item = self.get_object()
        status_info = item.get_availability_status()
        status_info['has_recipe'] = item.has_valid_recipe()
        status_info['can_activate'] = item.can_activate()
        return Response(status_info)

    @action(detail=True, methods=['post'])
    def update_stock(self, request, pk=None):
        """
        Update stock for a food item.
        If action='produce', it deducts ingredients (Production).
        If action='correct', it manually adjusts the stock level.
        If action='sell', it deducts from menu item stock (for pre-made items).
        """
        item = self.get_object()
        quantity = request.data.get('quantity')
        action_type = request.data.get('action', 'correct')
        
        if quantity is None:
            return Response({'error': 'Quantity is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            quantity = int(quantity)
        except ValueError:
            return Response({'error': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)

        if action_type == 'produce':
            # Batch production - deduct ingredients, add to menu stock
            if not item.has_valid_recipe():
                return Response({
                    'error': 'Cannot produce item without a valid recipe (minimum 2 ingredients required)'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            from inventory.services import produce_food_item
            try:
                produce_food_item(item, quantity, request.user)
                return Response({
                    'status': 'Stock produced',
                    'stock_quantity': item.stock_quantity,
                    'is_active': item.is_active,
                    'can_make_more': item.calculate_max_available()
                })
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        elif action_type == 'sell':
            # Direct sale from pre-made stock
            if item.stock_quantity is None:
                return Response({
                    'error': 'This item does not track stock (made-to-order)'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if quantity > item.stock_quantity:
                return Response({
                    'error': f'Insufficient stock. Available: {item.stock_quantity}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            old_stock = item.stock_quantity
            item.stock_quantity -= quantity
            
            if item.stock_quantity <= 0:
                item.stock_quantity = 0
                item.is_active = False
                
            item.save()
            
            AuditLog.objects.create(
                who=request.user,
                action='stock_sale',
                model='FoodItem',
                previous_data={'stock': old_stock},
                new_data={'stock': item.stock_quantity, 'sold': quantity}
            )
            
            return Response({
                'stock_quantity': item.stock_quantity,
                'is_active': item.is_active
            })
        
        else: # correct
            # Manual correction (add/subtract) - typically used for audit
            old_stock = item.stock_quantity
            item.stock_quantity = (item.stock_quantity or 0) + quantity
            if item.stock_quantity <= 0:
                 item.stock_quantity = 0
                 item.is_active = False
            else:
                 # Only auto-activate if has valid recipe
                 if item.has_valid_recipe():
                     item.is_active = True
                 
            item.save()
             
            AuditLog.objects.create(
                who=request.user,
                action='stock_update',
                model='FoodItem',
                previous_data={'stock': old_stock},
                new_data={'stock': item.stock_quantity, 'reason': 'correction'}
            )
            return Response({'stock_quantity': item.stock_quantity, 'is_active': item.is_active})

