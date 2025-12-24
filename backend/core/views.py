from rest_framework import viewsets, permissions, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from .models import Organization
from .serializers import OrganizationSerializer

User = get_user_model()

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'get_public_info']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def list(self, request, *args, **kwargs):
        instance = Organization.get_instance()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def get_public_info(self, request):
        instance = Organization.get_instance()
        return Response({
            'name': instance.name,
            'address': instance.address,
            'phone': instance.phone
        })


class SetupView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Check if system is already setup"""
        is_setup = User.objects.filter(role='admin').exists()
        return Response({'is_setup': is_setup})

    def post(self, request):
        """Initial Setup: Create Admin and Org Details"""
        if User.objects.filter(role='admin').exists():
            return Response(
                {'error': 'System is already set up. Please login as admin to make changes.'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data
        
        # 1. Update Organization
        org = Organization.get_instance()
        org.name = data.get('org_name', org.name)
        org.address = data.get('org_address', org.address)
        org.phone = data.get('org_phone', org.phone)
        org.email = data.get('org_email', org.email)
        org.save()

        # 2. Create Admin User
        username = data.get('admin_username')
        password = data.get('admin_password')
        
        if not username or not password:
            return Response({'error': 'Admin username and password required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
             return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        admin = User.objects.create_user(
            username=username,
            password=password,
            email=data.get('admin_email', ''),
            role='admin',
            is_staff=True,
            is_superuser=True
        )

        return Response({'status': 'Setup complete', 'admin_id': admin.id})
