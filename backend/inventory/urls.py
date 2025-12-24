from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VendorViewSet, IngredientViewSet, StockMovementViewSet,
    RecipeViewSet, PurchaseOrderViewSet
)

router = DefaultRouter()
router.register(r'vendors', VendorViewSet)
router.register(r'ingredients', IngredientViewSet)
router.register(r'movements', StockMovementViewSet)
router.register(r'recipes', RecipeViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
