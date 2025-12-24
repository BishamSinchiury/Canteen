"""Custom permission classes for role-based access control."""
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Only Admin users can access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsManagerOrAdmin(permissions.BasePermission):
    """Managers and Admins can access."""
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ('manager', 'admin')
        )


class IsCashierOrHigher(permissions.BasePermission):
    """Cashiers, Managers, and Admins can access."""
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ('cashier', 'manager', 'admin')
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Admin for write operations, authenticated for read."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsManagerOrAdminForWrite(permissions.BasePermission):
    """Manager/Admin for write, authenticated for read."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ('manager', 'admin')
        )
