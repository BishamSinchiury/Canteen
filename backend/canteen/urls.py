from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers
from accounts.views import UserViewSet, CreditAccountViewSet, CustomTokenObtainPairView
from menu.views import FoodItemViewSet
from transactions.views import TransactionViewSet
from ledger.views import CashBookViewSet, ExpenseViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from reports.views import (
    DailySummaryView, MonthlySummaryView, CustomRangeReportView,
    OutstandingCreditView, CashOnHandView, ExportAccountStatementView
)

# API Router
router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'food-items', FoodItemViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'accounts', CreditAccountViewSet)
router.register(r'cashbook', CashBookViewSet)
router.register(r'expenses', ExpenseViewSet)

# Swagger/OpenAPI schema
schema_view = get_schema_view(
    openapi.Info(
        title="EECOHM Canteen API",
        default_version='v1',
        description="Complete API for EECOHM School Canteen Management System",
        contact=openapi.Contact(email="admin@eecohm.edu.np"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    
    # Authentication
    path("api/auth/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # API Router
    path("api/", include(router.urls)),
    
    # Reports
    path('api/reports/daily/', DailySummaryView.as_view(), name='daily-summary'),
    path('api/reports/monthly/', MonthlySummaryView.as_view(), name='monthly-summary'),
    path('api/reports/custom/', CustomRangeReportView.as_view(), name='custom-report'),
    path('api/reports/outstanding-credit/', OutstandingCreditView.as_view(), name='outstanding-credit'),
    path('api/reports/cash-on-hand/', CashOnHandView.as_view(), name='cash-on-hand'),
    path('api/reports/account-statement/<str:account_id>/', ExportAccountStatementView.as_view(), name='account-statement'),
    
    # Swagger/OpenAPI
    path('api/core/', include('core.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('swagger<format>/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
