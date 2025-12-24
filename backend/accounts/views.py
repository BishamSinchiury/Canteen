from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction as db_transaction
from django.db.models import F
from decimal import Decimal
from .models import User, CreditAccount
from .serializers import UserSerializer, CustomTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers_account import CreditAccountSerializer
from .permissions import IsAdmin, IsManagerOrAdmin, IsCashierOrHigher
from audit.models import AuditLog
from django_filters import rest_framework as filters


class UserFilter(filters.FilterSet):
    role = filters.CharFilter(field_name='role')
    is_active = filters.BooleanFilter(field_name='is_active')
    
    class Meta:
        model = User
        fields = ['role', 'is_active']


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filterset_class = UserFilter
    
    def perform_create(self, serializer):
        password = self.request.data.get('password')
        user = serializer.save()
        if password:
            user.set_password(password)
            user.save()
        # Audit log
        AuditLog.objects.create(
            who=self.request.user,
            action='create',
            model='User',
            new_data={'username': user.username, 'role': user.role}
        )
    
    def perform_update(self, serializer):
        old_data = UserSerializer(self.get_object()).data
        password = self.request.data.get('password')
        user = serializer.save()
        if password:
            user.set_password(password)
            user.save()
        # Audit log
        AuditLog.objects.create(
            who=self.request.user,
            action='update',
            model='User',
            previous_data=old_data,
            new_data=serializer.data
        )
    
    def perform_destroy(self, instance):
        # Instead of deleting, deactivate
        old_data = UserSerializer(instance).data
        instance.is_active = False
        instance.save()
        AuditLog.objects.create(
            who=self.request.user,
            action='deactivate',
            model='User',
            previous_data=old_data
        )


class CreditAccountFilter(filters.FilterSet):
    account_type = filters.CharFilter(field_name='account_type')
    name = filters.CharFilter(field_name='name', lookup_expr='icontains')
    account_id = filters.CharFilter(field_name='account_id', lookup_expr='icontains')
    balance_min = filters.NumberFilter(field_name='balance', lookup_expr='gte')
    balance_max = filters.NumberFilter(field_name='balance', lookup_expr='lte')
    class_or_department = filters.CharFilter(field_name='class_or_department', lookup_expr='icontains')
    
    class Meta:
        model = CreditAccount
        fields = ['account_type', 'name', 'account_id', 'balance_min', 'balance_max', 'class_or_department']


class CreditAccountViewSet(viewsets.ModelViewSet):
    queryset = CreditAccount.objects.all().order_by('name')
    serializer_class = CreditAccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = CreditAccountFilter
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAdmin()]
        return [IsCashierOrHigher()]
    
    def perform_create(self, serializer):
        account = serializer.save()
        AuditLog.objects.create(
            who=self.request.user,
            action='create',
            model='CreditAccount',
            new_data={'account_id': account.account_id, 'name': account.name}
        )
    
    def perform_update(self, serializer):
        old_data = CreditAccountSerializer(self.get_object()).data
        serializer.save()
        AuditLog.objects.create(
            who=self.request.user,
            action='update',
            model='CreditAccount',
            previous_data=old_data,
            new_data=serializer.data
        )
    
    @action(detail=True, methods=['post'])
    def charge(self, request, pk=None):
        """Add charge to account (increase balance - they owe more)."""
        account = self.get_object()
        amount = request.data.get('amount')
        description = request.data.get('description', '')
        
        if not amount or Decimal(str(amount)) <= 0:
            return Response({'error': 'Valid positive amount required'}, status=status.HTTP_400_BAD_REQUEST)
        
        amount = Decimal(str(amount))
        old_balance = account.balance
        
        with db_transaction.atomic():
            acct = CreditAccount.objects.select_for_update().get(pk=account.pk)
            acct.balance = F('balance') + amount
            acct.save()
            acct.refresh_from_db()
        
        AuditLog.objects.create(
            who=request.user,
            action='charge',
            model='CreditAccount',
            previous_data={'balance': str(old_balance)},
            new_data={'balance': str(acct.balance), 'charged': str(amount), 'description': description}
        )
        
        return Response({
            'account_id': acct.account_id,
            'name': acct.name,
            'old_balance': str(old_balance),
            'charged': str(amount),
            'new_balance': str(acct.balance)
        })
    
    @action(detail=True, methods=['post'])
    def payment(self, request, pk=None):
        """Record payment received (decrease balance - they owe less)."""
        account = self.get_object()
        amount = request.data.get('amount')
        description = request.data.get('description', '')
        
        if not amount or Decimal(str(amount)) <= 0:
            return Response({'error': 'Valid positive amount required'}, status=status.HTTP_400_BAD_REQUEST)
        
        amount = Decimal(str(amount))
        old_balance = account.balance
        
        with db_transaction.atomic():
            acct = CreditAccount.objects.select_for_update().get(pk=account.pk)
            acct.balance = F('balance') - amount
            acct.save()
            acct.refresh_from_db()
            
            # Create cashbook entry for the payment
            from ledger.models import CashBookEntry
            CashBookEntry.objects.create(
                entry_type='income',
                amount=amount,
                description=f'Credit payment from {acct.name} ({acct.account_id}). {description}',
                created_by=request.user
            )
        
        AuditLog.objects.create(
            who=request.user,
            action='payment',
            model='CreditAccount',
            previous_data={'balance': str(old_balance)},
            new_data={'balance': str(acct.balance), 'paid': str(amount), 'description': description}
        )
        
        return Response({
            'account_id': acct.account_id,
            'name': acct.name,
            'old_balance': str(old_balance),
            'paid': str(amount),
            'new_balance': str(acct.balance)
        })
    
    @action(detail=True, methods=['get'])
    def statement(self, request, pk=None):
        """Get account statement with transaction history."""
        account = self.get_object()
        
        # Get all transactions linked to this account
        from transactions.models import Transaction
        from transactions.serializers import TransactionSerializer
        
        transactions = Transaction.objects.filter(
            payment_reference__icontains=account.account_id
        ).order_by('-timestamp')[:50]
        
        # Also get payments from cashbook
        from ledger.models import CashBookEntry
        payments = CashBookEntry.objects.filter(
            description__icontains=account.account_id
        ).order_by('-date')[:50]
        
        return Response({
            'account': CreditAccountSerializer(account).data,
            'transactions': TransactionSerializer(transactions, many=True).data,
            'payments': [
                {
                    'date': p.date,
                    'type': p.entry_type,
                    'amount': str(p.amount),
                    'description': p.description
                } for p in payments
            ]
        })
