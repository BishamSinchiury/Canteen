from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, SetupView

router = DefaultRouter()
router.register(r'organization', OrganizationViewSet, basename='organization')

urlpatterns = [
    path('', include(router.urls)),
    path('setup/', SetupView.as_view(), name='system-setup'),
]
