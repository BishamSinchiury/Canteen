from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.db.models import Sum
from .models import CashBookEntry, Expense
from .serializers import CashBookEntrySerializer, ExpenseSerializer
from accounts.permissions import IsCashierOrHigher, IsManagerOrAdmin
from audit.models import AuditLog


class CashBookFilter(filters.FilterSet):
    date = filters.DateFilter(field_name='date', lookup_expr='date')
    date_from = filters.DateFilter(field_name='date', lookup_expr='date__gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='date__lte')
    entry_type = filters.CharFilter(field_name='entry_type')
    
    class Meta:
        model = CashBookEntry
        fields = ['date', 'date_from', 'date_to', 'entry_type']


class CashBookViewSet(viewsets.ModelViewSet):
    queryset = CashBookEntry.objects.all().order_by('-date')
    serializer_class = CashBookEntrySerializer
    permission_classes = [IsCashierOrHigher]
    filterset_class = CashBookFilter
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAdmin()]
        return [IsCashierOrHigher()]
    
    def perform_create(self, serializer):
        entry = serializer.save(created_by=self.request.user)
        AuditLog.objects.create(
            who=self.request.user,
            action='create',
            model='CashBookEntry',
            new_data={'id': entry.id, 'type': entry.entry_type, 'amount': str(entry.amount)}
        )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get cashbook summary."""
        total_income = CashBookEntry.objects.filter(
            entry_type='income'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        total_expense = CashBookEntry.objects.filter(
            entry_type='expense'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'total_income': float(total_income),
            'total_expense': float(total_expense),
            'balance': float(total_income - total_expense)
        })


class ExpenseFilter(filters.FilterSet):
    date = filters.DateFilter(field_name='date', lookup_expr='date')
    date_from = filters.DateFilter(field_name='date', lookup_expr='date__gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='date__lte')
    category = filters.CharFilter(field_name='category', lookup_expr='icontains')
    paid_by = filters.CharFilter(field_name='paid_by')
    
    class Meta:
        model = Expense
        fields = ['date', 'date_from', 'date_to', 'category', 'paid_by']


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-date')
    serializer_class = ExpenseSerializer
    permission_classes = [IsManagerOrAdmin]
    filterset_class = ExpenseFilter
    
    def perform_create(self, serializer):
        expense = serializer.save()
        
        # If paid by cash, create cashbook entry
        if expense.paid_by == 'cash':
            CashBookEntry.objects.create(
                entry_type='expense',
                amount=expense.amount,
                description=f'Expense: {expense.description}',
                created_by=self.request.user
            )
        
        AuditLog.objects.create(
            who=self.request.user,
            action='create',
            model='Expense',
            new_data={
                'id': expense.id, 
                'amount': str(expense.amount),
                'category': expense.category
            }
        )
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get list of expense categories."""
        categories = Expense.objects.values_list('category', flat=True).distinct()
        return Response([c for c in categories if c])
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get expense summary by category."""
        by_category = Expense.objects.values('category').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        total = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'total': float(total),
            'by_category': list(by_category)
        })
