from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Allow access only to admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class IsFarmer(permissions.BasePermission):
    """
    Allow access only to users with farmer role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.role == 'farmer'


class IsConsumer(permissions.BasePermission):
    """
    Allow access only to users with consumer role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.role == 'consumer'


class FarmerCanCreateOrUpdate(permissions.BasePermission):
    """
    Only farmers and admins can create or update products.
    Everyone else can only read.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Write permissions are only allowed to farmers and admins
        return request.user and (request.user.role == 'farmer' or request.user.is_superuser)

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to farmers and admins
        return request.user.role == 'farmer' or request.user.is_superuser


class ConsumerCanCreateOrder(permissions.BasePermission):
    """
    Only consumers and admins can create orders.
    Everyone else can only read.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Write permissions are only allowed to consumers and admins
        return request.user and (request.user.role == 'consumer' or request.user.is_superuser)

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to consumers and admins
        return request.user.role == 'consumer' or request.user.is_superuser


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allow access to object's owner or admins.
    """
    def has_object_permission(self, request, view, obj):
        # Admin users have access to everything
        if request.user.is_superuser:
            return True
        
        # Check if the object has a user field
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Check if the object has a farmer field
        if hasattr(obj, 'farmer'):
            return obj.farmer == request.user
        
        # Check if the object has a consumer field
        if hasattr(obj, 'consumer'):
            return obj.consumer == request.user
        
        return False
