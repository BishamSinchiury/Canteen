from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.http import HttpResponse
from django.db import transaction as db_transaction
from decimal import Decimal
import csv
from .models import Transaction, TransactionLine
from .serializers import TransactionSerializer
from .services import create_transaction_atomic, cancel_transaction_atomic
from .serializers_receipt import ReceiptSerializer
from accounts.permissions import IsCashierOrHigher, IsAdmin


class TransactionFilter(filters.FilterSet):
    date = filters.DateFilter(field_name='timestamp', lookup_expr='date')
    date_from = filters.DateFilter(field_name='timestamp', lookup_expr='date__gte')
    date_to = filters.DateFilter(field_name='timestamp', lookup_expr='date__lte')
    month = filters.NumberFilter(field_name='timestamp', lookup_expr='month')
    year = filters.NumberFilter(field_name='timestamp', lookup_expr='year')
    cashier = filters.NumberFilter(field_name='cashier__id')
    payment_type = filters.CharFilter(field_name='payment_type')
    is_canceled = filters.BooleanFilter(field_name='is_canceled')
    food_item = filters.NumberFilter(method='filter_by_food_item')
    min_amount = filters.NumberFilter(field_name='total_amount', lookup_expr='gte')
    max_amount = filters.NumberFilter(field_name='total_amount', lookup_expr='lte')
    
    def filter_by_food_item(self, queryset, name, value):
        return queryset.filter(lines__food_item__id=value).distinct()
    
    class Meta:
        model = Transaction
        fields = ['date', 'date_from', 'date_to', 'month', 'year', 'cashier', 
                  'payment_type', 'is_canceled', 'food_item', 'min_amount', 'max_amount']


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().prefetch_related('lines', 'lines__food_item').select_related('cashier')
    serializer_class = TransactionSerializer
    permission_classes = [IsCashierOrHigher]
    filterset_class = TransactionFilter
    
    def get_queryset(self):
        return super().get_queryset().order_by('-timestamp')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        lines = data.pop('lines')
        
        tx = create_transaction_atomic(
            cashier=request.user,
            payment_type=data.get('payment_type'),
            lines_data=lines,
            tax=data.get('tax') or 0,
            discount=data.get('discount') or 0,
            linked_account_id=request.data.get('linked_account'),
            cash_amount=request.data.get('cash_amount'),
            credit_amount=request.data.get('credit_amount'),
            payment_reference=request.data.get('payment_reference'),
            notes=data.get('notes', '')
        )
        return Response(TransactionSerializer(tx).data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        # Only admin can delete (cancel)
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can cancel transactions'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)
    
    def perform_destroy(self, instance):
        cancel_transaction_atomic(instance, self.request.user)
    
    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        tx = self.get_object()
        if hasattr(tx, 'receipt'):
            return Response(ReceiptSerializer(tx.receipt).data)
        return Response({'detail': 'No receipt found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a transaction and reverse balances."""
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can cancel transactions'}, status=status.HTTP_403_FORBIDDEN)
        
        tx = self.get_object()
        if tx.is_canceled:
            return Response({'error': 'Transaction already canceled'}, status=status.HTTP_400_BAD_REQUEST)
        
        cancel_transaction_atomic(tx, request.user)
        return Response({'status': 'Transaction canceled', 'id': tx.id})
    
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export transactions as CSV."""
        queryset = self.filter_queryset(self.get_queryset())
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="transactions.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Date', 'Cashier', 'Payment Type', 'Total', 'Tax', 'Discount', 'Items', 'Status'])
        
        for tx in queryset[:1000]:  # Limit to 1000 for export
            items_str = '; '.join([
                f"{line.food_item.name} ({line.portion_type}) x{line.quantity}" 
                for line in tx.lines.all()
            ])
            writer.writerow([
                tx.id,
                tx.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                tx.cashier.username if tx.cashier else 'N/A',
                tx.payment_type,
                str(tx.total_amount),
                str(tx.tax),
                str(tx.discount),
                items_str,
                'Canceled' if tx.is_canceled else 'Active'
            ])
        
        return response
    
    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Export transactions as Excel."""
        from reports.excel_utils import generate_transactions_excel
        
        queryset = self.filter_queryset(self.get_queryset())[:1000]
        
        # Build filters dict for subtitle
        filters = {}
        if request.query_params.get('date_from'):
            filters['start_date'] = request.query_params.get('date_from')
        if request.query_params.get('date_to'):
            filters['end_date'] = request.query_params.get('date_to')
        if request.query_params.get('payment_type'):
            filters['payment_type'] = request.query_params.get('payment_type')
        
        return generate_transactions_excel(queryset, filters)
