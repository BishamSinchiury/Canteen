from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from menu.models import FoodItem
from accounts.models import CreditAccount
from transactions.services import create_transaction_atomic
from ledger.models import CashBookEntry, Expense
from inventory.models import Vendor, Ingredient, Recipe, RecipeIngredient
from decimal import Decimal

class Command(BaseCommand):
    help = 'Seed database with comprehensive sample data for EECOHM Canteen'

    def handle(self, *args, **options):
        self.stdout.write('Seeding EECOHM Canteen database...')
        
        User = get_user_model()
        
        # Create Users
        self.stdout.write('Creating users...')
        admin, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@eecohm.edu.np',
                'full_name': 'Administrator',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True
            }
        )
        admin.set_password('adminpass')
        admin.save()
        
        manager, _ = User.objects.get_or_create(
            username='manager',
            defaults={
                'email': 'manager@eecohm.edu.np',
                'full_name': 'Canteen Manager',
                'role': 'manager'
            }
        )
        manager.set_password('managerpass')
        manager.save()
        
        cashier1, _ = User.objects.get_or_create(
            username='cashier',
            defaults={
                'email': 'cashier1@eecohm.edu.np',
                'full_name': 'Ram Sharma',
                'role': 'cashier'
            }
        )
        cashier1.set_password('cashierpass')
        cashier1.save()
        
        # Create Vendors
        self.stdout.write('Creating vendors...')
        vendors = [
            {'name': 'Metro Wholesalers', 'contact_name': 'Rajesh Gupta', 'phone': '9801234567'},
            {'name': 'Green Agri Farm', 'contact_name': 'Sita Rai', 'phone': '9812345678'},
            {'name': 'Milk Dairy Union', 'contact_name': 'Bikash Tamang', 'phone': '9845678901'}
        ]
        vendor_objs = {}
        for v in vendors:
            obj, _ = Vendor.objects.get_or_create(name=v['name'], defaults=v)
            vendor_objs[v['name']] = obj

        # Create Ingredients
        self.stdout.write('Creating ingredients...')
        ings = [
            {'name': 'Long Grain Rice', 'unit': 'kg', 'reorder_level': 50, 'current_quantity': 200},
            {'name': 'Red Lentils (Dal)', 'unit': 'kg', 'reorder_level': 20, 'current_quantity': 50},
            {'name': 'Fresh Milk', 'unit': 'l', 'reorder_level': 10, 'current_quantity': 30},
            {'name': 'Chicken Breast', 'unit': 'kg', 'reorder_level': 15, 'current_quantity': 40},
            {'name': 'Refined Oil', 'unit': 'l', 'reorder_level': 20, 'current_quantity': 60},
            {'name': 'Tea Leaves', 'unit': 'kg', 'reorder_level': 2, 'current_quantity': 5},
            {'name': 'Sugar', 'unit': 'kg', 'reorder_level': 10, 'current_quantity': 25},
        ]
        ing_objs = {}
        for i in ings:
            obj, _ = Ingredient.objects.get_or_create(name=i['name'], defaults=i)
            ing_objs[i['name']] = obj

        # Create Food Items with categories and remote images
        self.stdout.write('Creating food items...')
        food_items = [
            {'name': 'Dal Bhat (Veg)', 'description': 'Nepal\'s staple meal with rice and lentils', 'price_full': 120, 'price_half': 70, 'category': 'Main Course', 'image_url': 'https://images.unsplash.com/photo-1585932231552-29877e5f5da6?w=400'},
            {'name': 'Chicken Chowmein', 'description': 'Stir-fried noodles with chicken', 'price_full': 150, 'price_half': 80, 'category': 'Main Course', 'image_url': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400'},
            {'name': 'Chicken Momo', 'description': 'Steamed dumplings with chicken filling', 'price_full': 140, 'price_half': 80, 'category': 'Main Course', 'image_url': 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400'},
            {'name': 'Milk Tea', 'description': 'Traditional Nepali chiya', 'price_full': 25, 'category': 'Beverages', 'image_url': 'https://images.unsplash.com/photo-1544787210-2211d24cb348?w=400'},
            {'name': 'Samosa', 'description': 'Crispy potato-filled snacks', 'price_full': 25, 'category': 'Snacks', 'image_url': 'https://images.unsplash.com/photo-1601050638911-c3230d31aa49?w=400'},
        ]
        
        for item in food_items:
            f_obj, _ = FoodItem.objects.get_or_create(
                name=item['name'],
                defaults={
                    'description': item['description'],
                    'available_portions': ['full', 'half'] if item.get('price_half') else ['full'],
                    'price_full': item['price_full'],
                    'price_half': item.get('price_half'),
                    'category': item['category'],
                    'created_by': admin
                    # Not actually downloading image in seed to avoid timeouts, 
                    # but setting the URL path might work if we use it in frontend directly
                }
            )
            # For this seed, we'll store the URL string directly if we want, 
            # but since 'image' is an ImageField, we'd need to download it.
            # Instead, I'll just rely on the frontend to show a placeholder or handle the URL.
            # However, for a "WOW" effect, I'll update the frontend POS to handle these specific URLs or hardcode some logic.

        # Create Recipes
        self.stdout.write('Creating recipes...')
        tea_recipe, _ = Recipe.objects.get_or_create(food_item=FoodItem.objects.get(name='Milk Tea'))
        RecipeIngredient.objects.get_or_create(recipe=tea_recipe, ingredient=ing_objs['Fresh Milk'], defaults={'quantity': 0.1})
        RecipeIngredient.objects.get_or_create(recipe=tea_recipe, ingredient=ing_objs['Tea Leaves'], defaults={'quantity': 0.01})
        RecipeIngredient.objects.get_or_create(recipe=tea_recipe, ingredient=ing_objs['Sugar'], defaults={'quantity': 0.015})

        self.stdout.write(self.style.SUCCESS('✓ Database seeded successfully!'))
