> **[English](./error-codes.md)** | [Español](./error-codes.es.md)

# Error Codes Reference

Every error response from the API includes an `errorCode` field that the frontend can use to display localized, user-friendly messages.

## Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message (English)",
  "errorCode": "PRODUCT_NOT_FOUND",
  "error": {
    "statusCode": 404,
    "timestamp": "2026-03-05T12:00:00.000Z",
    "path": "/products/abc123",
    "method": "GET",
    "details": {
      "productId": "abc123",
      "orgId": "org456"
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `false` | Always false for errors |
| `message` | `string` | English description (for logging/debugging) |
| `errorCode` | `string` | Machine-readable code for frontend i18n mapping |
| `error.statusCode` | `number` | HTTP status code |
| `error.details` | `object?` | Optional context (IDs, quantities, etc.) |

## Frontend Usage

Map `errorCode` to localized messages:

```typescript
// en.json
{
  "errors": {
    "PRODUCT_NOT_FOUND": "Product not found",
    "PRODUCT_SKU_CONFLICT": "A product with this SKU already exists",
    "SALE_INSUFFICIENT_STOCK": "Insufficient stock to confirm this sale",
    ...
  }
}

// In component
const t = useTranslations('errors');
const errorMessage = t(response.errorCode, response.error?.details);
```

---

## Error Codes by Module

### Authentication

| Code | HTTP | Description |
|------|------|-------------|
| `AUTHENTICATION_ERROR` | 401 | Login failed (wrong credentials, user not found, account locked) |
| `TOKEN_ERROR` | 401 | Invalid, expired, blacklisted, or revoked token |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests (login, refresh, logout, password reset) |
| `AUTH_PASSWORDS_MISMATCH` | 400 | New password and confirmation don't match |
| `AUTH_PASSWORD_REQUIREMENTS` | 400 | Password doesn't meet security requirements |
| `AUTH_PASSWORD_SAME_AS_CURRENT` | 400 | New password is same as current password |
| `AUTH_PASSWORD_INCORRECT` | 400 | Current password verification failed |
| `AUTH_PASSWORD_CHANGE_FAILED` | 400 | Unexpected error during password change |
| `AUTH_USER_NOT_FOUND` | 400 | User not found during password change |

> **Security note**: `AUTHENTICATION_ERROR` and `TOKEN_ERROR` use generic messages intentionally to prevent information disclosure. The specific reason is logged server-side only.

### Users

| Code | HTTP | Description |
|------|------|-------------|
| `USER_NOT_FOUND` | 404 | User with given ID doesn't exist |
| `USER_VALIDATION_FAILED` | 400 | User data validation failed |
| `USER_EMAIL_CONFLICT` | 409 | Email already in use by another user |
| `USER_USERNAME_CONFLICT` | 409 | Username already in use |
| `USER_INVALID_STATUS` | 400 | Invalid status value provided |
| `USER_STATUS_CHANGE_DENIED` | 400 | Business rule prevents status change |
| `USER_ROLE_NOT_FOUND` | 404 | Role to assign/remove not found |
| `USER_ROLE_ORG_MISMATCH` | 404 | Role not available for this organization |
| `USER_ASSIGNER_NOT_FOUND` | 404 | User performing the role operation not found |
| `USER_ROLE_ASSIGN_DENIED` | 400 | Business rule prevents role assignment/removal |
| `USER_ROLE_ALREADY_ASSIGNED` | 409 | User already has this role |
| `USER_ROLE_NOT_ASSIGNED` | 404 | User doesn't have the role to remove |

### Roles

| Code | HTTP | Description |
|------|------|-------------|
| `ROLE_NOT_FOUND` | 404 | Role with given ID doesn't exist |
| `ROLE_ORG_MISMATCH` | 404 | Role doesn't belong to this organization |
| `ROLE_NAME_TOO_SHORT` | 400 | Role name must be >= 3 characters |
| `ROLE_NAME_TOO_LONG` | 400 | Role name must be <= 50 characters |
| `ROLE_NAME_SYSTEM_CONFLICT` | 409 | Name conflicts with a system role |
| `ROLE_NAME_ORG_CONFLICT` | 409 | Name already exists in this organization |
| `ROLE_SYSTEM_IMMUTABLE` | 400 | Cannot modify system roles |
| `ROLE_DESCRIPTION_TOO_LONG` | 400 | Description must be <= 500 characters |
| `ROLE_DELETE_DENIED` | 400 | Business rule prevents deletion |
| `ROLE_ID_REQUIRED` | 400 | Role ID parameter is required |
| `ROLE_ORG_ID_REQUIRED` | 400 | Organization ID is required |
| `ROLE_PERMISSIONS_REQUIRED` | 400 | At least one permission ID is required |
| `ROLE_PERMISSIONS_NOT_FOUND` | 404 | One or more permission IDs not found |

### Products

| Code | HTTP | Description |
|------|------|-------------|
| `PRODUCT_NOT_FOUND` | 404 | Product with given ID doesn't exist |
| `PRODUCT_SKU_CONFLICT` | 409 | SKU already exists in this organization |
| `PRODUCT_CREATION_ERROR` | 400 | Unexpected error during product creation |
| `PRODUCT_UPDATE_ERROR` | 400 | Unexpected error during product update |
| `PRODUCT_STATUS_CHANGE_DENIED` | 400 | Cannot change status (e.g., discontinued product) |
| `PRODUCT_COST_METHOD_IMMUTABLE` | 400 | Cost method cannot be changed after creation |

### Categories

| Code | HTTP | Description |
|------|------|-------------|
| `CATEGORY_NOT_FOUND` | 404 | Category with given ID doesn't exist |
| `CATEGORY_PARENT_NOT_FOUND` | 404 | Parent category doesn't exist |
| `CATEGORY_SELF_PARENT` | 400 | Category cannot be its own parent |
| `CATEGORY_NAME_CONFLICT` | 409 | Category name already exists in organization |
| `CATEGORY_HAS_CHILDREN` | 400 | Cannot delete: has subcategories |
| `CATEGORY_HAS_PRODUCTS` | 400 | Cannot delete: has associated products |
| `CATEGORY_DELETE_ERROR` | 400 | Unexpected error during deletion |
| `CATEGORY_CREATION_ERROR` | 400 | Unexpected error during creation |
| `CATEGORY_INVALID_PARENT_REF` | 400 | Invalid parent category reference |
| `CATEGORY_REFERENCED_NOT_FOUND` | 404 | Referenced record not found |

### Warehouses

| Code | HTTP | Description |
|------|------|-------------|
| `WAREHOUSE_NOT_FOUND` | 404 | Warehouse with given ID doesn't exist |

### Stock

| Code | HTTP | Description |
|------|------|-------------|
| `STOCK_NOT_FOUND` | 404 | Stock record doesn't exist for product/warehouse |
| `INSUFFICIENT_STOCK` | 400 | Not enough stock. `details`: `{ productId, warehouseId, requestedQuantity, availableQuantity }` |

### Movements

| Code | HTTP | Description |
|------|------|-------------|
| `MOVEMENT_NOT_FOUND` | 404 | Movement with given ID doesn't exist |
| `MOVEMENT_CANNOT_POST` | 400 | Movement is not in DRAFT status |
| `MOVEMENT_CREATION_ERROR` | 400 | Unexpected error during creation |

### Transfers

| Code | HTTP | Description |
|------|------|-------------|
| `TRANSFER_NOT_FOUND` | 404 | Transfer with given ID doesn't exist |
| `TRANSFER_VALIDATION_FAILED` | 400 | Transfer data validation failed |
| `TRANSFER_LINES_INVALID` | 400 | Transfer lines validation failed |
| `TRANSFER_INSUFFICIENT_STOCK` | 400 | Not enough stock for transfer |
| `TRANSFER_LOCATION_INVALID` | 400 | Location validation failed |

### Sales

| Code | HTTP | Description |
|------|------|-------------|
| `SALE_NOT_FOUND` | 404 | Sale with given ID doesn't exist |
| `SALE_CREATION_ERROR` | 400 | Unexpected error during sale creation |
| `SALE_INSUFFICIENT_STOCK` | 400 | Not enough stock to confirm sale |
| `SALE_LINE_PRODUCT_NOT_FOUND` | 400 | Product for sale line not found |
| `SALE_SWAP_PRICE_REQUIRED` | 400 | New price required for swap with NEW_PRICE strategy |
| `SALE_SWAP_DENIED` | 400 | Business rule prevents product swap |
| `SALE_PICKING_NOT_ENABLED` | 400 | Picking not enabled for this organization |
| `SALE_SHIPPING_NOT_ENABLED` | 400 | Shipping not enabled for this organization |

### Returns

| Code | HTTP | Description |
|------|------|-------------|
| `RETURN_NOT_FOUND` | 404 | Return with given ID doesn't exist |
| `RETURN_WAREHOUSE_NOT_FOUND` | 404 | Warehouse for return not found |
| `RETURN_SALE_ID_REQUIRED` | 400 | Sale ID required for customer returns |
| `RETURN_MOVEMENT_ID_REQUIRED` | 400 | Source movement ID required for supplier returns |
| `RETURN_PRODUCT_NOT_FOUND` | 400 | Product for return line not found |
| `RETURN_SALE_NOT_FOUND` | 404 | Original sale not found |

### Reports

| Code | HTTP | Description |
|------|------|-------------|
| `REPORT_INVALID_TYPE` | 400 | Unknown report type |
| `REPORT_TEMPLATE_NOT_FOUND` | 404 | Report template doesn't exist |
| `REPORT_TEMPLATE_NAME_TOO_SHORT` | 400 | Template name must be >= 3 characters |
| `REPORT_TEMPLATE_NAME_TOO_LONG` | 400 | Template name must be <= 100 characters |
| `REPORT_TEMPLATE_NAME_CONFLICT` | 409 | Template name already exists |

### Companies

| Code | HTTP | Description |
|------|------|-------------|
| `COMPANY_NOT_FOUND` | 404 | Company with given ID doesn't exist |
| `COMPANY_DELETE_ERROR` | 400 | Unexpected error during deletion |

### Organizations

| Code | HTTP | Description |
|------|------|-------------|
| `ORG_NOT_FOUND` | 404 | Organization not found |
| `ORG_SLUG_INVALID` | 400 | Slug must be 3-50 characters |

### Imports

| Code | HTTP | Description |
|------|------|-------------|
| `IMPORT_BATCH_NOT_FOUND` | 404 | Import batch doesn't exist |
| `IMPORT_INVALID_TYPE` | 400 | Invalid import type |
| `IMPORT_FILE_VALIDATION_FAILED` | 400 | File validation errors |
| `IMPORT_STRUCTURE_INVALID` | 400 | File structure doesn't match expected format |
| `IMPORT_NOT_VALIDATED` | 400 | Import batch hasn't been validated yet |
| `IMPORT_FILE_NAME_REQUIRED` | 400 | File name is required |
| `IMPORT_BATCH_CREATION_FAILED` | 400 | Failed to create import batch |
| `IMPORT_TEMPLATE_FAILED` | 400 | Failed to generate template |
| `IMPORT_ERROR_REPORT_FAILED` | 400 | Failed to generate error report |
| `IMPORT_EXECUTION_FAILED` | 400 | Import execution failed |

### Dashboard

| Code | HTTP | Description |
|------|------|-------------|
| `DASHBOARD_METRICS_FAILED` | 400 | Failed to retrieve dashboard metrics |

### Audit

| Code | HTTP | Description |
|------|------|-------------|
| `AUDIT_LOG_NOT_FOUND` | 404 | Audit log entry not found |

### Reorder Rules

| Code | HTTP | Description |
|------|------|-------------|
| `REORDER_RULE_NOT_FOUND` | 404 | Reorder rule doesn't exist |

### Contacts

| Code | HTTP | Description |
|------|------|-------------|
| `CONTACT_NOT_FOUND` | 404 | Contact with given ID doesn't exist |
| `CONTACT_IDENTIFICATION_CONFLICT` | 409 | A contact with this identification already exists |
| `CONTACT_CONFLICT` | 409 | Contact unique constraint violation |
| `CONTACT_CREATION_ERROR` | 400 | Unexpected error during contact creation |
| `CONTACT_UPDATE_ERROR` | 400 | Unexpected error during contact update |
| `CONTACT_HAS_SALES` | 400 | Cannot delete contact because it has associated sales |

### Integrations

| Code | HTTP | Description |
|------|------|-------------|
| `INTEGRATION_CONNECTION_NOT_FOUND` | 404 | Integration connection doesn't exist |
| `INTEGRATION_CONNECTION_CONFLICT` | 409 | Connection with this provider and account already exists |
| `INTEGRATION_CONNECTION_CREATION_ERROR` | 400 | Unexpected error during connection creation |
| `INTEGRATION_CONNECTION_UPDATE_ERROR` | 400 | Unexpected error during connection update |
| `SKU_MAPPING_NOT_FOUND` | 404 | SKU mapping record doesn't exist |
| `SKU_MAPPING_CONFLICT` | 409 | SKU mapping conflict detected |
| `SKU_MAPPING_CREATION_ERROR` | 400 | Unexpected error during SKU mapping creation |
| `SYNC_LOG_NOT_FOUND` | 404 | Sync log entry doesn't exist |
| `SYNC_RETRY_ERROR` | 400 | Error retrying failed sync operation |

### VTEX Integration

| Code | HTTP | Description |
|------|------|-------------|
| `VTEX_ORDER_FETCH_ERROR` | 400 | Failed to fetch order from VTEX API |
| `VTEX_SKU_MISMATCH` | 400 | Unmatched SKUs between local system and VTEX |
| `VTEX_OUTBOUND_SYNC_ERROR` | 400 | Error during outbound sync operation |
| `VTEX_POLL_ERROR` | 400 | Error polling orders from VTEX |
| `VTEX_WEBHOOK_REGISTRATION_ERROR` | 400 | Error registering webhook with VTEX |
| `VTEX_SYNC_ORDER_ERROR` | 400 | Generic error during order sync |
| `VTEX_TEST_CONNECTION_ERROR` | 400 | Error testing VTEX connection |

### Generic

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Generic validation error (DTO, Zod, class-validator) |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server error |
| `UNKNOWN_ERROR` | 400 | Error without specific code |
