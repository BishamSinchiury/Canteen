from rest_framework.views import APIView
from rest_framework import permissions, status
from rest_framework.response import Response
from django.http import HttpResponse
from transactions.models import Transaction, TransactionLine
from ledger.models import CashBookEntry, Expense
from accounts.models import CreditAccount
from django.utils import timezone
from django.db.models import Sum, Count, F
from datetime import datetime, timedelta
import csv


class IsManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ('manager', 'admin')


class DailySummaryView(APIView):
    permission_classes = [IsManagerOrAdmin]
    
    def get(self, request):
        # Check if export requested
        export_format = request.query_params.get('export')
        
        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = timezone.now().date()
        
        txs = Transaction.objects.filter(timestamp__date=target_date, is_canceled=False)
        
        total_sales = txs.aggregate(total=Sum('total_amount'))['total'] or 0
        total_count = txs.aggregate(count=Count('id'))['count'] or 0
        
        # Cash vs credit breakdown
        cash_total = txs.filter(payment_type='cash').aggregate(total=Sum('total_amount'))['total'] or 0
        credit_total = txs.filter(payment_type='credit').aggregate(total=Sum('total_amount'))['total'] or 0
        mixed_total = txs.filter(payment_type='mixed').aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Top selling items
        top_items = TransactionLine.objects.filter(
            transaction__in=txs
        ).values('food_item__name').annotate(
            quantity_sold=Sum('quantity'),
            revenue=Sum('line_total')
        ).order_by('-quantity_sold')[:10]
        
        # Expenses for the day
        day_expenses = Expense.objects.filter(date__date=target_date).aggregate(total=Sum('amount'))['total'] or 0
        
        # Cashbook balance for the day
        cashbook_income = CashBookEntry.objects.filter(
            date__date=target_date, entry_type='income'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        cashbook_expense = CashBookEntry.objects.filter(
            date__date=target_date, entry_type='expense'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        summary_data = {
            'date': str(target_date),
            'total_sales': float(total_sales),
            'transaction_count': total_count,
            'cash_sales': float(cash_total),
            'credit_sales': float(credit_total),
            'mixed_sales': float(mixed_total),
            'top_items': list(top_items),
            'expenses': float(day_expenses),
            'cashbook_income': float(cashbook_income),
            'cashbook_expense': float(cashbook_expense),
            'net_cash': float(cashbook_income - cashbook_expense),
            'avg_transaction': float(total_sales / total_count) if total_count > 0 else 0
        }
        
        # Return Excel if requested
        if export_format == 'excel':
            from .excel_utils import generate_daily_summary_excel
            return generate_daily_summary_excel(str(target_date), summary_data)
        
        return Response(summary_data)


class MonthlySummaryView(APIView):
    permission_classes = [IsManagerOrAdmin]
    
    def get(self, request):
        # Check if export requested
        export_format = request.query_params.get('export')
        
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        
        txs = Transaction.objects.filter(
            timestamp__year=year,
            timestamp__month=month,
            is_canceled=False
        )
        
        total_sales = txs.aggregate(total=Sum('total_amount'))['total'] or 0
        total_count = txs.aggregate(count=Count('id'))['count'] or 0
        
        # Breakdown by payment type
        cash_total = txs.filter(payment_type='cash').aggregate(total=Sum('total_amount'))['total'] or 0
        credit_total = txs.filter(payment_type='credit').aggregate(total=Sum('total_amount'))['total'] or 0
        mixed_total = txs.filter(payment_type='mixed').aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Top selling items for month
        top_items = TransactionLine.objects.filter(
            transaction__in=txs
        ).values('food_item__name').annotate(
            quantity_sold=Sum('quantity'),
            revenue=Sum('line_total')
        ).order_by('-quantity_sold')[:10]
        
        # Daily breakdown
        daily_sales = txs.values('timestamp__date').annotate(
            total=Sum('total_amount'),
            count=Count('id')
        ).order_by('timestamp__date')
        
        # Expenses for the month
        month_expenses = Expense.objects.filter(
            date__year=year,
            date__month=month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        summary_data = {
            'year': year,
            'month': month,
            'total_sales': float(total_sales),
            'transaction_count': total_count,
            'cash_sales': float(cash_total),
            'credit_sales': float(credit_total),
            'mixed_sales': float(mixed_total),
            'top_items': list(top_items),
            'daily_breakdown': [
                {'date': str(d['timestamp__date']), 'total': float(d['total']), 'count': d['count']}
                for d in daily_sales
            ],
            'total_expenses': float(month_expenses),
            'net_profit': float(total_sales - month_expenses)
        }
        
        # Return Excel if requested
        if export_format == 'excel':
            from .excel_utils import generate_monthly_summary_excel
            return generate_monthly_summary_excel(year, month, summary_data)
        
        return Response(summary_data)


class CustomRangeReportView(APIView):
    permission_classes = [IsManagerOrAdmin]
    
    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        food_item = request.query_params.get('food_item')
        cashier = request.query_params.get('cashier')
        payment_type = request.query_params.get('payment_type')
        
        if not date_from or not date_to:
            return Response({'error': 'date_from and date_to required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from_date = datetime.strptime(date_from, '%Y-%m-%d').date()
            to_date = datetime.strptime(date_to, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        
        txs = Transaction.objects.filter(
            timestamp__date__gte=from_date,
            timestamp__date__lte=to_date,
            is_canceled=False
        )
        
        if cashier:
            txs = txs.filter(cashier__id=cashier)
        
        if payment_type:
            txs = txs.filter(payment_type=payment_type)
        
        if food_item:
            txs = txs.filter(lines__food_item__id=food_item).distinct()
        
        total_sales = txs.aggregate(total=Sum('total_amount'))['total'] or 0
        total_count = txs.aggregate(count=Count('id'))['count'] or 0
        
        cash_total = txs.filter(payment_type='cash').aggregate(total=Sum('total_amount'))['total'] or 0
        credit_total = txs.filter(payment_type='credit').aggregate(total=Sum('total_amount'))['total'] or 0
        mixed_total = txs.filter(payment_type='mixed').aggregate(total=Sum('total_amount'))['total'] or 0
        
        top_items = TransactionLine.objects.filter(
            transaction__in=txs
        ).values('food_item__name').annotate(
            quantity_sold=Sum('quantity'),
            revenue=Sum('line_total')
        ).order_by('-quantity_sold')[:15]
        
        return Response({
            'date_from': str(from_date),
            'date_to': str(to_date),
            'total_sales': float(total_sales),
            'transaction_count': total_count,
            'cash_sales': float(cash_total),
            'credit_sales': float(credit_total),
            'mixed_sales': float(mixed_total),
            'top_items': list(top_items)
        })


class OutstandingCreditView(APIView):
    """View outstanding credit balances."""
    permission_classes = [IsManagerOrAdmin]
    
    def get(self, request):
        students = CreditAccount.objects.filter(
            account_type='student',
            balance__gt=0
        ).order_by('-balance')[:50]
        
        teachers = CreditAccount.objects.filter(
            account_type='teacher',
            balance__gt=0
        ).order_by('-balance')[:50]
        
        total_student_credit = students.aggregate(total=Sum('balance'))['total'] or 0
        total_teacher_credit = teachers.aggregate(total=Sum('balance'))['total'] or 0
        
        return Response({
            'total_outstanding': float(total_student_credit + total_teacher_credit),
            'student_outstanding': float(total_student_credit),
            'teacher_outstanding': float(total_teacher_credit),
            'top_students': [
                {'account_id': a.account_id, 'name': a.name, 'balance': float(a.balance)}
                for a in students
            ],
            'top_teachers': [
                {'account_id': a.account_id, 'name': a.name, 'balance': float(a.balance)}
                for a in teachers
            ]
        })


class CashOnHandView(APIView):
    """View current cash on hand."""
    permission_classes = [IsManagerOrAdmin]
    
    def get(self, request):
        total_income = CashBookEntry.objects.filter(
            entry_type='income'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        total_expense = CashBookEntry.objects.filter(
            entry_type='expense'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Also add direct expenses
        direct_expenses = Expense.objects.filter(
            paid_by='cash'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        cash_on_hand = float(total_income) - float(total_expense) - float(direct_expenses)
        
        # Today's movement
        today = timezone.now().date()
        today_income = CashBookEntry.objects.filter(
            date__date=today,
            entry_type='income'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        today_expense = CashBookEntry.objects.filter(
            date__date=today,
            entry_type='expense'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'cash_on_hand': cash_on_hand,
            'total_income': float(total_income),
            'total_expense': float(total_expense),
            'direct_expenses': float(direct_expenses),
            'today_income': float(today_income),
            'today_expense': float(today_expense)
        })


class ExportAccountStatementView(APIView):
    """Export account statement as CSV."""
    permission_classes = [IsManagerOrAdmin]
    
    def get(self, request, account_id):
        try:
            account = CreditAccount.objects.get(account_id=account_id)
        except CreditAccount.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="statement_{account_id}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Account Statement'])
        writer.writerow(['Account ID', account.account_id])
        writer.writerow(['Name', account.name])
        writer.writerow(['Type', account.account_type])
        writer.writerow(['Current Balance', str(account.balance)])
        writer.writerow([])
        writer.writerow(['Date', 'Type', 'Amount', 'Description'])
        
        # Get transactions
        transactions = Transaction.objects.filter(
            payment_reference__icontains=account.account_id
        ).order_by('-timestamp')[:100]
        
        for tx in transactions:
            writer.writerow([
                tx.timestamp.strftime('%Y-%m-%d %H:%M'),
                'Charge',
                str(tx.total_amount),
                f'Transaction #{tx.id}'
            ])
        
        # Get payments
        payments = CashBookEntry.objects.filter(
            description__icontains=account.account_id
        ).order_by('-date')[:100]
        
        for p in payments:
            if 'payment' in p.description.lower():
                writer.writerow([
                    p.date.strftime('%Y-%m-%d %H:%M'),
                    'Payment',
                    str(p.amount),
                    p.description
                ])
        
        return response
