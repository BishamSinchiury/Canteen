from django.test import TestCase
from django.contrib.auth import get_user_model
from menu.models import FoodItem
from accounts.models import CreditAccount
from transactions.models import Transaction, TransactionLine, Receipt
from ledger.models import CashBookEntry
from transactions.services import create_transaction_atomic
from decimal import Decimal

User = get_user_model()

class TransactionServiceTests(TestCase):
    def setUp(self):
        self.cashier = User.objects.create_user(username='cashier', password='password', role='cashier')
        self.item = FoodItem.objects.create(name='Test Item', price_full=100, available_portions=['full'])
        self.student = CreditAccount.objects.create(
            account_id='S100', name='Test Student', account_type='student'
        )

    def test_create_cash_transaction(self):
        lines = [{
            'food_item': self.item,
            'portion_type': 'full',
            'unit_price': Decimal('100.00'),
            'quantity': 2,
            'line_total': Decimal('200.00')
        }]
        
        tx = create_transaction_atomic(
            cashier=self.cashier,
            payment_type='cash',
            lines_data=lines
        )
        
        # Check transaction
        self.assertEqual(tx.total_amount, Decimal('200.00'))
        self.assertEqual(tx.payment_type, 'cash')
        
        # Check cashbook
        entry = CashBookEntry.objects.filter(related_transaction=tx).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.amount, Decimal('200.00'))
        self.assertEqual(entry.entry_type, 'income')
        
        # Check receipt
        self.assertTrue(hasattr(tx, 'receipt'))
        print(f"Token generated: {tx.receipt.token}")

    def test_create_credit_transaction(self):
        lines = [{
            'food_item': self.item,
            'portion_type': 'full',
            'unit_price': Decimal('100.00'),
            'quantity': 1,
            'line_total': Decimal('100.00')
        }]
        
        tx = create_transaction_atomic(
            cashier=self.cashier,
            payment_type='credit',
            lines_data=lines,
            linked_account_id=self.student.account_id
        )
        
        # Check transaction
        self.assertEqual(tx.total_amount, Decimal('100.00'))
        
        # Check account balance
        self.student.refresh_from_db()
        self.assertEqual(self.student.balance, Decimal('100.00'))
        
        # Check NO cashbook entry
        entry = CashBookEntry.objects.filter(related_transaction=tx).first()
        self.assertIsNone(entry)
