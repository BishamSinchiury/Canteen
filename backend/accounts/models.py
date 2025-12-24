from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, username, email=None, password=None, **extra_fields):
        if not username:
            raise ValueError('username required')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('cashier', 'Cashier'),
    )

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(null=True, blank=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='cashier')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'username'

    def __str__(self):
        return f"{self.username} ({self.role})"


class CreditAccount(models.Model):
    ACCOUNT_TYPE = (('student', 'Student'), ('teacher', 'Teacher'))

    account_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE)
    class_or_department = models.CharField(max_length=100, blank=True)
    contact_info = models.CharField(max_length=255, blank=True)
    roll_no = models.CharField(max_length=50, blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def charge(self, amount):
        # increase balance (they owe more)
        from django.db import transaction
        from django.db.models import F
        with transaction.atomic():
            acct = CreditAccount.objects.select_for_update().get(pk=self.pk)
            acct.balance = F('balance') + amount
            acct.save()
            acct.refresh_from_db()
            return acct.balance

    def pay(self, amount):
        # decrease balance
        from django.db import transaction
        from django.db.models import F
        with transaction.atomic():
            acct = CreditAccount.objects.select_for_update().get(pk=self.pk)
            acct.balance = F('balance') - amount
            acct.save()
            acct.refresh_from_db()
            return acct.balance

