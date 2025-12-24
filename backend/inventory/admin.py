from django.contrib import admin
from .models import Vendor, Ingredient, StockMovement, Recipe, RecipeIngredient, PurchaseOrder, PurchaseOrderItem

class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1

@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    inlines = [RecipeIngredientInline]

class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    inlines = [PurchaseOrderItemInline]
    list_display = ('id', 'vendor', 'status', 'total_amount', 'created_at')
    list_filter = ('status', 'vendor')

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_name', 'phone', 'is_active')

@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'unit', 'current_quantity', 'reorder_level')

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('ingredient', 'movement_type', 'quantity', 'reason', 'timestamp')
    list_filter = ('movement_type', 'reason')
