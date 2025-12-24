from django.db import transaction
from .models import Transaction, TransactionLine, Receipt
from accounts.models import CreditAccount
from ledger.models import CashBookEntry
from audit.models import AuditLog
from core.models import Organization
from django.utils import timezone
from decimal import Decimal


def _generate_token(tx: Transaction) -> str:
    """Generate unique transaction token."""
    year = tx.timestamp.year if tx.timestamp else timezone.now().year
    return f"EECOHM-{year}-{tx.id:06d}"


def _generate_receipt_payload(tx: Transaction, cashier, linked_account=None, cash_amount=None, credit_amount=None):
    """Generate immutable receipt payload."""
    items = []
    for line in tx.lines.all():
        items.append({
            'name': line.food_item.name,
            'portion': line.portion_type,
            'quantity': line.quantity,
            'unit_price': float(line.unit_price),
            'line_total': float(line.line_total),
        })

    total = float(tx.total_amount)
    if tx.payment_type == 'cash':
        paid = total
        credit = 0.0
    elif tx.payment_type == 'credit':
        paid = 0.0
        credit = total
    else:  # mixed
        paid = float(cash_amount or 0.0)
        credit = float(credit_amount if credit_amount is not None else (total - paid))

    account_info = None
    if linked_account:
        account_info = {
            'name': linked_account.name,
            'account_id': linked_account.account_id,
            'type': linked_account.account_type
        }

    org = Organization.get_instance()
    payload = {
        'institution': {'name': org.name, 'address': org.address},
        'transaction_id': tx.id,
        'token': _generate_token(tx),
        'date': tx.timestamp.isoformat(),
        'cashier': {'username': cashier.username, 'full_name': cashier.full_name},
        'items': items,
        'payment': {
            'type': tx.payment_type,
            'total_amount': total,
            'paid_amount': paid,
            'credit_amount': credit,
            'account': account_info,
        },
        'tax': float(tx.tax),
        'discount': float(tx.discount),
        'notes': tx.notes or '',
        'footer': 'Thank you for your purchase!'
    }
    return payload


def create_transaction_atomic(cashier, payment_type, lines_data, tax=0, discount=0, 
                               linked_account_id=None, cash_amount=None, credit_amount=None,
                               payment_reference=None, notes=''):
    """
    Create a transaction atomically with all related updates.
    This ensures balance updates, cashbook entries, and receipt creation all succeed or fail together.
    """
    with transaction.atomic():
        # Create the transaction
        tx = Transaction.objects.create(
            cashier=cashier,
            payment_type=payment_type,
            tax=tax,
            discount=discount,
            payment_reference=(payment_reference or ''),
            notes=(notes or ''),
            total_amount=0
        )
        
        # Create line items and calculate total
        total = Decimal('0.00')
        from inventory.services import deduct_stock_for_transaction
        for l in lines_data:
            line = TransactionLine.objects.create(transaction=tx, **l)
            total += Decimal(str(line.line_total))
            # New: Deduct stock based on recipe
            deduct_stock_for_transaction(line)
        
        tx.total_amount = total + Decimal(str(tx.tax)) - Decimal(str(tx.discount))
        tx.save()

        # Calculate payment splits
        if payment_type == 'cash':
            paid_amount = Decimal(str(tx.total_amount))
            credit_amt = Decimal('0.00')
        elif payment_type == 'credit':
            paid_amount = Decimal('0.00')
            credit_amt = Decimal(str(tx.total_amount))
        else:  # mixed
            paid_amount = Decimal(str(cash_amount or 0.0))
            credit_amt = Decimal(str(credit_amount if credit_amount is not None else (float(tx.total_amount) - float(paid_amount))))

        # Handle cash portion - add to cashbook
        if paid_amount > 0:
            CashBookEntry.objects.create(
                entry_type='income',
                amount=paid_amount,
                description=f'Transaction {tx.id} (cash portion)',
                related_transaction=tx,
                created_by=cashier
            )

        # Handle credit portion - update account balance
        linked_account = None
        if credit_amt > 0 and linked_account_id:
            acct = CreditAccount.objects.select_for_update().get(account_id=linked_account_id)
            acct.balance = acct.balance + Decimal(str(credit_amt))
            acct.save()
            linked_account = acct
            
            # Store reference for tracking
            tx.payment_reference = f"Credit: {acct.account_id}"
            tx.save()

        # Generate and persist receipt (immutable)
        payload = _generate_receipt_payload(
            tx, cashier, 
            linked_account=linked_account, 
            cash_amount=float(paid_amount), 
            credit_amount=float(credit_amt)
        )
        token = _generate_token(tx)
        Receipt.objects.create(transaction=tx, token=token, payload=payload)

        # Audit log
        AuditLog.objects.create(
            who=cashier,
            action='create',
            model='Transaction',
            new_data={
                'id': tx.id,
                'total': str(tx.total_amount),
                'payment_type': payment_type,
                'lines_count': len(lines_data)
            }
        )

        return tx


def cancel_transaction_atomic(tx: Transaction, user):
    """
    Cancel a transaction and reverse all related balance updates.
    Uses atomic transaction to ensure data integrity.
    """
    with transaction.atomic():
        if tx.is_canceled:
            return tx
        
        old_data = {
            'id': tx.id,
            'total': str(tx.total_amount),
            'payment_type': tx.payment_type
        }
        
        # Reverse cashbook entries
        cashbook_entries = CashBookEntry.objects.filter(related_transaction=tx)
        for entry in cashbook_entries:
            # Create reversal entry
            CashBookEntry.objects.create(
                entry_type='expense' if entry.entry_type == 'income' else 'income',
                amount=entry.amount,
                description=f'REVERSAL: Transaction {tx.id} canceled',
                related_transaction=tx,
                created_by=user
            )
        
        # Reverse credit account balance if applicable
        if tx.payment_type in ['credit', 'mixed'] and tx.payment_reference:
            # Try to find and update the linked account
            account_id = tx.payment_reference.replace('Credit: ', '').strip()
            try:
                if tx.payment_type == 'credit':
                    credit_amt = tx.total_amount
                else:
                    # For mixed, we need to figure out the credit portion
                    # Use the receipt payload if available
                    credit_amt = Decimal('0')
                    if hasattr(tx, 'receipt'):
                        credit_amt = Decimal(str(tx.receipt.payload.get('payment', {}).get('credit_amount', 0)))
                
                if credit_amt > 0:
                    acct = CreditAccount.objects.select_for_update().get(account_id=account_id)
                    acct.balance = acct.balance - credit_amt
                    acct.save()
            except CreditAccount.DoesNotExist:
                pass  # Account might have been deleted
        
        # Mark as canceled
        tx.is_canceled = True
        tx.notes = f"{tx.notes}\n[CANCELED by {user.username} at {timezone.now().isoformat()}]"
        tx.save()
        
        # New: Reverse stock deduction
        from inventory.services import reverse_stock_deduction
        reverse_stock_deduction(tx)
        
        # Audit log
        AuditLog.objects.create(
            who=user,
            action='cancel',
            model='Transaction',
            previous_data=old_data,
            new_data={'is_canceled': True}
        )
        
        return tx
