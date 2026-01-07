from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone
from .models import Vendor, Ingredient, StockMovement, Recipe, RecipeIngredient, PurchaseOrder, PurchaseOrderItem, VendorTransaction
from .serializers import (
    VendorSerializer, IngredientSerializer, StockMovementSerializer,
    RecipeSerializer, RecipeIngredientSerializer, PurchaseOrderSerializer, VendorTransactionSerializer
)

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all().order_by('-created_at')
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        ingredient = self.get_object()
        quantity = request.data.get('quantity')
        reason = request.data.get('reason')
        movement_type = request.data.get('movement_type')  # IN/OUT/ADJUST
        notes = request.data.get('notes', '')

        if quantity is None or reason is None or movement_type is None:
            return Response({'non_field_errors': ['quantity, reason, and movement_type are required']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quantity = Decimal(str(quantity))
        except (ValueError, TypeError):
            return Response({'quantity': ['Invalid quantity']}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Create movement
            StockMovement.objects.create(
                ingredient=ingredient,
                quantity=quantity,
                movement_type=movement_type,
                reason=reason,
                user=request.user if request.user.is_authenticated else None,
                notes=notes
            )
            # Update current quantity
            if movement_type == 'IN':
                ingredient.current_quantity += quantity
            elif movement_type == 'OUT':
                ingredient.current_quantity -= quantity
            elif movement_type == 'ADJUST':
                ingredient.current_quantity = quantity # Set absolute value for audit correction
            
            ingredient.save()

        return Response(IngredientSerializer(ingredient).data)

class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.all().order_by('-timestamp')
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['ingredient', 'movement_type', 'reason']

class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all()
    serializer_class = RecipeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=['post'])
    def set_ingredients(self, request, pk=None):
        recipe = self.get_object()
        ingredients_data = request.data.get('ingredients', [])
        
        with transaction.atomic():
            recipe.ingredients.all().delete()
            for item in ingredients_data:
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    ingredient_id=item['ingredient'],
                    quantity=item['quantity']
                )
        
        return Response(RecipeSerializer(recipe).data)

from .services import process_purchase_order, record_vendor_transaction
from django.http import HttpResponse
from decimal import Decimal
import csv

# ... (Keep existing viewsets)

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().order_by('-created_at')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def receive_stock(self, request, pk=None):
        po = self.get_object()
        if po.status == 'RECEIVED':
            return Response({'error': 'PO already received'}, status=status.HTTP_400_BAD_REQUEST)
        
        # We can still support optional partial receive override if needed, but for now let's rely on the service
        # The service currently trusts the PO struct or optional input logic. 
        # Ideally, we should update the PO items' received_quantity before calling the service if passed in request.
        
        items_data = request.data.get('items', [])
        if items_data:
            with transaction.atomic():
                for item_data in items_data:
                    try:
                        po_item = po.items.get(id=item_data['id'])
                        qty_val = item_data.get('received_quantity')
                        if qty_val is not None:
                             po_item.received_quantity = Decimal(str(qty_val))
                             po_item.save()
                    except (PurchaseOrderItem.DoesNotExist, ValueError, TypeError, KeyError):
                        continue
        
        try:
            # Pass user safely (handle AnonymousUser)
            user = request.user if request.user.is_authenticated else None
            process_purchase_order(po.id, user)
        except Exception as e:
            return Response({'error': f'Failed to process PO: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        po.refresh_from_db()

        return Response(PurchaseOrderSerializer(po).data)

class VendorTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VendorTransaction.objects.all().order_by('-date')
    serializer_class = VendorTransactionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['vendor', 'transaction_type']
    
    @action(detail=False, methods=['get'])
    def export_ledger(self, request):
        """Export vendor ledger as CSV"""
        vendor_id = request.query_params.get('vendor')
        queryset = self.filter_queryset(self.get_queryset())
        
        response = HttpResponse(content_type='text/csv')
        filename = f"vendor_ledger_{vendor_id if vendor_id else 'all'}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        writer.writerow(['Date', 'Vendor', 'Type', 'Amount', 'Reference', 'Balance After', 'Notes', 'Created By'])
        
        for tx in queryset:
            writer.writerow([
                tx.date.strftime('%Y-%m-%d %H:%M'),
                tx.vendor.name,
                tx.transaction_type,
                tx.amount,
                tx.reference,
                tx.balance_after,
                tx.notes,
                tx.created_by.username if tx.created_by else 'System'
            ])
            
        return response

    @action(detail=False, methods=['post'])
    def record_payment(self, request):
        """Record a payment to a vendor (Debit)"""
        vendor_id = request.data.get('vendor_id')
        amount = request.data.get('amount')
        notes = request.data.get('notes', '')
        reference = request.data.get('reference', '')
        
        if not vendor_id or not amount:
            return Response({'error': 'vendor_id and amount are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            vendor = Vendor.objects.get(id=vendor_id)
            record_vendor_transaction(
                vendor=vendor,
                amount=Decimal(str(amount)),
                transaction_type='DEBIT',
                reference=reference,
                user=request.user,
                notes=notes
            )
            return Response({'status': 'Payment recorded', 'new_balance': vendor.balance})
        except Vendor.DoesNotExist:
            return Response({'error': 'Vendor not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

