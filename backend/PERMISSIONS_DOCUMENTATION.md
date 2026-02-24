# Django REST Framework Custom Permissions - Documentation

## Overview

This document explains the custom permission system implemented in the Farmer-to-Consumer API. The system enforces role-based access control (RBAC) using Django's user roles: **farmer**, **consumer**, and **admin**.

---

## Permission Classes

### 1. **IsAdmin**
- **Purpose**: Restrict access to superuser/admin accounts only
- **Usage**: For admin-only endpoints
- **Example**:
  ```python
  permission_classes = [IsAdmin]
  ```

### 2. **IsFarmer**
- **Purpose**: Restrict access to users with the "farmer" role
- **Usage**: For farmer-specific operations
- **Example**:
  ```python
  permission_classes = [IsFarmer]
  ```

### 3. **IsConsumer**
- **Purpose**: Restrict access to users with the "consumer" role
- **Usage**: For consumer-specific operations
- **Example**:
  ```python
  permission_classes = [IsConsumer]
  ```

### 4. **FarmerCanCreateOrUpdate**
- **Purpose**: Allow farmers and admins to create/update products. Everyone can read products.
- **Read Access**: All authenticated users
- **Write Access**: Only farmers and admins
- **Usage**: Applied to `ProductViewSet`
- **Example**:
  ```python
  GET /api/products/ → All authenticated users can view
  POST /api/products/ → Only farmers and admins can create
  PUT /api/products/{id}/ → Only farmers and admins can update
  DELETE /api/products/{id}/ → Only farmers and admins can delete
  ```

### 5. **ConsumerCanCreateOrder**
- **Purpose**: Allow consumers and admins to create orders. Everyone can read orders.
- **Read Access**: All authenticated users
- **Write Access**: Only consumers and admins
- **Usage**: Applied to `OrderViewSet`
- **Example**:
  ```python
  GET /api/orders/ → All authenticated users can view
  POST /api/orders/ → Only consumers and admins can create
  PUT /api/orders/{id}/ → Only consumers and admins can update
  DELETE /api/orders/{id}/ → Only consumers and admins can delete
  ```

### 6. **IsOwnerOrAdmin**
- **Purpose**: Allow object owners or admins to access/modify objects
- **Usage**: For object-level permissions where users should only modify their own data
- **Supported Fields**: `user`, `farmer`, `consumer`

---

## ViewSet Implementation

### ProductViewSet
```python
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, FarmerCanCreateOrUpdate]
    
    def perform_create(self, serializer):
        # Automatically set the farmer to the current user
        serializer.save(farmer=self.request.user)
    
    def get_queryset(self):
        # Filter by farmer if specified in query params
        queryset = Product.objects.all()
        farmer = self.request.query_params.get('farmer', None)
        if farmer is not None:
            queryset = queryset.filter(farmer__username=farmer)
        return queryset
```

**Behavior:**
- ✅ Authenticated users can view all products
- ✅ Farmers can create products (automatically linked to them)
- ✅ Farmers can update/delete only their own products
- ✅ Admins can create/update/delete any product
- ❌ Consumers cannot create/update/delete products

### OrderViewSet
```python
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, ConsumerCanCreateOrder]
    
    def perform_create(self, serializer):
        # Automatically set the consumer to the current user
        serializer.save(consumer=self.request.user)
    
    def get_queryset(self):
        # Filter based on user role
        user = self.request.user
        
        if user.is_superuser:
            return Order.objects.all()
        elif user.role == 'consumer':
            return Order.objects.filter(consumer=user)
        elif user.role == 'farmer':
            return Order.objects.filter(product__farmer=user)
        else:
            return Order.objects.none()
```

**Behavior:**
- ✅ Authenticated users can view orders (filtered by role)
- ✅ Consumers can create orders (automatically linked to them)
- ✅ Consumers see only their own orders
- ✅ Farmers see orders for their products
- ✅ Admins see all orders
- ❌ Farmers cannot create/update orders

---

## Access Control Matrix

| Action | Farmer | Consumer | Admin | Anonymous |
|--------|--------|----------|-------|-----------|
| View Products | ✅ | ✅ | ✅ | ❌ |
| Create Product | ✅ | ❌ | ✅ | ❌ |
| Update Product | ✅* | ❌ | ✅ | ❌ |
| Delete Product | ✅* | ❌ | ✅ | ❌ |
| View Orders | ✅** | ✅*** | ✅ | ❌ |
| Create Order | ❌ | ✅ | ✅ | ❌ |
| Update Order | ❌ | ✅* | ✅ | ❌ |
| Delete Order | ❌ | ✅* | ✅ | ❌ |

*Only their own objects
**Orders for their products
***Only their own orders

---

## Testing the Permissions

### Test Case 1: Farmer Creates a Product
```bash
curl -X POST http://localhost:8000/api/products/ \
  -H "Authorization: Bearer <farmer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organic Tomatoes",
    "category": "Vegetables",
    "price": 50.0,
    "quantity": 100
  }'
```
**Expected**: ✅ 201 Created

### Test Case 2: Consumer Tries to Create a Product
```bash
curl -X POST http://localhost:8000/api/products/ \
  -H "Authorization: Bearer <consumer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organic Tomatoes",
    "category": "Vegetables",
    "price": 50.0,
    "quantity": 100
  }'
```
**Expected**: ❌ 403 Forbidden

### Test Case 3: Consumer Creates an Order
```bash
curl -X POST http://localhost:8000/api/orders/ \
  -H "Authorization: Bearer <consumer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product": 1,
    "quantity": 5,
    "total_price": 250.0
  }'
```
**Expected**: ✅ 201 Created

### Test Case 4: Farmer Tries to Create an Order
```bash
curl -X POST http://localhost:8000/api/orders/ \
  -H "Authorization: Bearer <farmer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product": 1,
    "quantity": 5,
    "total_price": 250.0
  }'
```
**Expected**: ❌ 403 Forbidden

### Test Case 5: Consumer Views Only Their Orders
```bash
curl -X GET http://localhost:8000/api/orders/ \
  -H "Authorization: Bearer <consumer_token>"
```
**Expected**: ✅ 200 OK - Only orders created by this consumer

### Test Case 6: Farmer Views Orders for Their Products
```bash
curl -X GET http://localhost:8000/api/orders/ \
  -H "Authorization: Bearer <farmer_token>"
```
**Expected**: ✅ 200 OK - Only orders for products they created

### Test Case 7: Admin Views All Orders
```bash
curl -X GET http://localhost:8000/api/orders/ \
  -H "Authorization: Bearer <admin_token>"
```
**Expected**: ✅ 200 OK - All orders in the system

---

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```
Occurs when trying to access protected endpoints without a token.

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```
Occurs when a user doesn't have the required role for the action.

---

## File Location

All permission classes are defined in:
```
backend/users/permissions.py
```

Applied to viewsets in:
```
backend/products/views.py
backend/orders/views.py
```

---

## Summary

The custom permission system provides:
- ✅ Role-based access control (RBAC)
- ✅ Automatic user/farmer/consumer assignment
- ✅ Query filtering by user role
- ✅ Admin access to all operations
- ✅ Prevents unauthorized operations
- ✅ Clear error messages for permission denials
