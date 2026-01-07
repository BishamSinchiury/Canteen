from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VendorViewSet, IngredientViewSet, StockMovementViewSet,
    RecipeViewSet, PurchaseOrderViewSet, VendorTransactionViewSet
)

router = DefaultRouter()
router.register(r'vendors', VendorViewSet)
router.register(r'ingredients', IngredientViewSet)
router.register(r'movements', StockMovementViewSet)
router.register(r'recipes', RecipeViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'vendor-transactions', VendorTransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
