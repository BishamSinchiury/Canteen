from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import User


class ReportsPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cashier = User.objects.create_user(username='cash', password='pass', role='cashier')
        self.manager = User.objects.create_user(username='mgr', password='pass', role='manager')

    def test_cashier_cannot_access_daily(self):
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.get(reverse('daily-summary'))
        self.assertEqual(resp.status_code, 403)

    def test_manager_can_access_daily(self):
        self.client.force_authenticate(user=self.manager)
        resp = self.client.get(reverse('daily-summary'))
        self.assertEqual(resp.status_code, 200)
