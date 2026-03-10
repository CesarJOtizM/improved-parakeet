> [English](./error-codes.md) | **[Español](./error-codes.es.md)**

# Referencia de Codigos de Error

Cada respuesta de error de la API incluye un campo `errorCode` que el frontend puede usar para mostrar mensajes localizados y amigables al usuario.

## Formato de Respuesta de Error

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

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `success` | `false` | Siempre false para errores |
| `message` | `string` | Descripcion en ingles (para logging/depuracion) |
| `errorCode` | `string` | Codigo legible por maquina para mapeo i18n del frontend |
| `error.statusCode` | `number` | Codigo de estado HTTP |
| `error.details` | `object?` | Contexto opcional (IDs, cantidades, etc.) |

## Uso en el Frontend

Mapear `errorCode` a mensajes localizados:

```typescript
// es.json
{
  "errors": {
    "PRODUCT_NOT_FOUND": "Producto no encontrado",
    "PRODUCT_SKU_CONFLICT": "Ya existe un producto con este SKU",
    "SALE_INSUFFICIENT_STOCK": "Stock insuficiente para confirmar esta venta",
    ...
  }
}

// En el componente
const t = useTranslations('errors');
const errorMessage = t(response.errorCode, response.error?.details);
```

---

## Codigos de Error por Modulo

### Autenticacion

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `AUTHENTICATION_ERROR` | 401 | Fallo de login (credenciales incorrectas, usuario no encontrado, cuenta bloqueada) |
| `TOKEN_ERROR` | 401 | Token invalido, expirado, en lista negra o revocado |
| `RATE_LIMIT_EXCEEDED` | 429 | Demasiadas solicitudes (login, refresh, logout, reset de password) |
| `AUTH_PASSWORDS_MISMATCH` | 400 | La nueva password y la confirmacion no coinciden |
| `AUTH_PASSWORD_REQUIREMENTS` | 400 | La password no cumple los requisitos de seguridad |
| `AUTH_PASSWORD_SAME_AS_CURRENT` | 400 | La nueva password es igual a la actual |
| `AUTH_PASSWORD_INCORRECT` | 400 | Fallo en la verificacion de la password actual |
| `AUTH_PASSWORD_CHANGE_FAILED` | 400 | Error inesperado durante el cambio de password |
| `AUTH_USER_NOT_FOUND` | 400 | Usuario no encontrado durante el cambio de password |

> **Nota de seguridad**: `AUTHENTICATION_ERROR` y `TOKEN_ERROR` usan mensajes genericos intencionalmente para evitar divulgacion de informacion. La razon especifica solo se registra en el servidor.

### Usuarios

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `USER_NOT_FOUND` | 404 | El usuario con el ID dado no existe |
| `USER_VALIDATION_FAILED` | 400 | Fallo en la validacion de datos del usuario |
| `USER_EMAIL_CONFLICT` | 409 | Email ya en uso por otro usuario |
| `USER_USERNAME_CONFLICT` | 409 | Nombre de usuario ya en uso |
| `USER_INVALID_STATUS` | 400 | Valor de estado invalido proporcionado |
| `USER_STATUS_CHANGE_DENIED` | 400 | Regla de negocio impide el cambio de estado |
| `USER_ROLE_NOT_FOUND` | 404 | Rol a asignar/remover no encontrado |
| `USER_ROLE_ORG_MISMATCH` | 404 | Rol no disponible para esta organizacion |
| `USER_ASSIGNER_NOT_FOUND` | 404 | Usuario que realiza la operacion de rol no encontrado |
| `USER_ROLE_ASSIGN_DENIED` | 400 | Regla de negocio impide la asignacion/remocion del rol |
| `USER_ROLE_ALREADY_ASSIGNED` | 409 | El usuario ya tiene este rol |
| `USER_ROLE_NOT_ASSIGNED` | 404 | El usuario no tiene el rol a remover |

### Roles

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `ROLE_NOT_FOUND` | 404 | El rol con el ID dado no existe |
| `ROLE_ORG_MISMATCH` | 404 | El rol no pertenece a esta organizacion |
| `ROLE_NAME_TOO_SHORT` | 400 | El nombre del rol debe tener >= 3 caracteres |
| `ROLE_NAME_TOO_LONG` | 400 | El nombre del rol debe tener <= 50 caracteres |
| `ROLE_NAME_SYSTEM_CONFLICT` | 409 | El nombre entra en conflicto con un rol del sistema |
| `ROLE_NAME_ORG_CONFLICT` | 409 | El nombre ya existe en esta organizacion |
| `ROLE_SYSTEM_IMMUTABLE` | 400 | No se pueden modificar roles del sistema |
| `ROLE_DESCRIPTION_TOO_LONG` | 400 | La descripcion debe tener <= 500 caracteres |
| `ROLE_DELETE_DENIED` | 400 | Regla de negocio impide la eliminacion |
| `ROLE_ID_REQUIRED` | 400 | El parametro ID del rol es requerido |
| `ROLE_ORG_ID_REQUIRED` | 400 | El ID de organizacion es requerido |
| `ROLE_PERMISSIONS_REQUIRED` | 400 | Se requiere al menos un ID de permiso |
| `ROLE_PERMISSIONS_NOT_FOUND` | 404 | Uno o mas IDs de permiso no encontrados |

### Productos

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `PRODUCT_NOT_FOUND` | 404 | El producto con el ID dado no existe |
| `PRODUCT_SKU_CONFLICT` | 409 | El SKU ya existe en esta organizacion |
| `PRODUCT_CREATION_ERROR` | 400 | Error inesperado durante la creacion del producto |
| `PRODUCT_UPDATE_ERROR` | 400 | Error inesperado durante la actualizacion del producto |
| `PRODUCT_STATUS_CHANGE_DENIED` | 400 | No se puede cambiar el estado (ej., producto descontinuado) |
| `PRODUCT_COST_METHOD_IMMUTABLE` | 400 | El metodo de costeo no se puede cambiar despues de la creacion |

### Categorias

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `CATEGORY_NOT_FOUND` | 404 | La categoria con el ID dado no existe |
| `CATEGORY_PARENT_NOT_FOUND` | 404 | La categoria padre no existe |
| `CATEGORY_SELF_PARENT` | 400 | Una categoria no puede ser su propio padre |
| `CATEGORY_NAME_CONFLICT` | 409 | El nombre de categoria ya existe en la organizacion |
| `CATEGORY_HAS_CHILDREN` | 400 | No se puede eliminar: tiene subcategorias |
| `CATEGORY_HAS_PRODUCTS` | 400 | No se puede eliminar: tiene productos asociados |
| `CATEGORY_DELETE_ERROR` | 400 | Error inesperado durante la eliminacion |
| `CATEGORY_CREATION_ERROR` | 400 | Error inesperado durante la creacion |
| `CATEGORY_INVALID_PARENT_REF` | 400 | Referencia de categoria padre invalida |
| `CATEGORY_REFERENCED_NOT_FOUND` | 404 | Registro referenciado no encontrado |

### Bodegas

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `WAREHOUSE_NOT_FOUND` | 404 | La bodega con el ID dado no existe |

### Stock

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `STOCK_NOT_FOUND` | 404 | El registro de stock no existe para el producto/bodega |
| `INSUFFICIENT_STOCK` | 400 | Stock insuficiente. `details`: `{ productId, warehouseId, requestedQuantity, availableQuantity }` |

### Movimientos

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `MOVEMENT_NOT_FOUND` | 404 | El movimiento con el ID dado no existe |
| `MOVEMENT_CANNOT_POST` | 400 | El movimiento no esta en estado DRAFT |
| `MOVEMENT_CREATION_ERROR` | 400 | Error inesperado durante la creacion |

### Transferencias

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `TRANSFER_NOT_FOUND` | 404 | La transferencia con el ID dado no existe |
| `TRANSFER_VALIDATION_FAILED` | 400 | Fallo en la validacion de datos de la transferencia |
| `TRANSFER_LINES_INVALID` | 400 | Fallo en la validacion de lineas de la transferencia |
| `TRANSFER_INSUFFICIENT_STOCK` | 400 | Stock insuficiente para la transferencia |
| `TRANSFER_LOCATION_INVALID` | 400 | Fallo en la validacion de ubicacion |

### Ventas

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `SALE_NOT_FOUND` | 404 | La venta con el ID dado no existe |
| `SALE_CREATION_ERROR` | 400 | Error inesperado durante la creacion de la venta |
| `SALE_INSUFFICIENT_STOCK` | 400 | Stock insuficiente para confirmar la venta |
| `SALE_LINE_PRODUCT_NOT_FOUND` | 400 | Producto de la linea de venta no encontrado |
| `SALE_SWAP_PRICE_REQUIRED` | 400 | Se requiere nuevo precio para intercambio con estrategia NEW_PRICE |
| `SALE_SWAP_DENIED` | 400 | Regla de negocio impide el intercambio de producto |
| `SALE_PICKING_NOT_ENABLED` | 400 | El picking no esta habilitado para esta organizacion |
| `SALE_SHIPPING_NOT_ENABLED` | 400 | El envio no esta habilitado para esta organizacion |

### Devoluciones

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `RETURN_NOT_FOUND` | 404 | La devolucion con el ID dado no existe |
| `RETURN_WAREHOUSE_NOT_FOUND` | 404 | Bodega para la devolucion no encontrada |
| `RETURN_SALE_ID_REQUIRED` | 400 | Se requiere ID de venta para devoluciones de clientes |
| `RETURN_MOVEMENT_ID_REQUIRED` | 400 | Se requiere ID del movimiento origen para devoluciones a proveedores |
| `RETURN_PRODUCT_NOT_FOUND` | 400 | Producto de la linea de devolucion no encontrado |
| `RETURN_SALE_NOT_FOUND` | 404 | Venta original no encontrada |

### Reportes

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `REPORT_INVALID_TYPE` | 400 | Tipo de reporte desconocido |
| `REPORT_TEMPLATE_NOT_FOUND` | 404 | La plantilla de reporte no existe |
| `REPORT_TEMPLATE_NAME_TOO_SHORT` | 400 | El nombre de la plantilla debe tener >= 3 caracteres |
| `REPORT_TEMPLATE_NAME_TOO_LONG` | 400 | El nombre de la plantilla debe tener <= 100 caracteres |
| `REPORT_TEMPLATE_NAME_CONFLICT` | 409 | El nombre de la plantilla ya existe |

### Empresas

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `COMPANY_NOT_FOUND` | 404 | La empresa con el ID dado no existe |
| `COMPANY_DELETE_ERROR` | 400 | Error inesperado durante la eliminacion |

### Organizaciones

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `ORG_NOT_FOUND` | 404 | Organizacion no encontrada |
| `ORG_SLUG_INVALID` | 400 | El slug debe tener entre 3 y 50 caracteres |

### Importaciones

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `IMPORT_BATCH_NOT_FOUND` | 404 | El lote de importacion no existe |
| `IMPORT_INVALID_TYPE` | 400 | Tipo de importacion invalido |
| `IMPORT_FILE_VALIDATION_FAILED` | 400 | Errores de validacion del archivo |
| `IMPORT_STRUCTURE_INVALID` | 400 | La estructura del archivo no coincide con el formato esperado |
| `IMPORT_NOT_VALIDATED` | 400 | El lote de importacion aun no ha sido validado |
| `IMPORT_FILE_NAME_REQUIRED` | 400 | Se requiere el nombre del archivo |
| `IMPORT_BATCH_CREATION_FAILED` | 400 | Fallo al crear el lote de importacion |
| `IMPORT_TEMPLATE_FAILED` | 400 | Fallo al generar la plantilla |
| `IMPORT_ERROR_REPORT_FAILED` | 400 | Fallo al generar el reporte de errores |
| `IMPORT_EXECUTION_FAILED` | 400 | Fallo en la ejecucion de la importacion |

### Dashboard

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `DASHBOARD_METRICS_FAILED` | 400 | Fallo al obtener las metricas del dashboard |

### Auditoria

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `AUDIT_LOG_NOT_FOUND` | 404 | Entrada del log de auditoria no encontrada |

### Reglas de Reorden

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `REORDER_RULE_NOT_FOUND` | 404 | La regla de reorden no existe |

### Contactos

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `CONTACT_NOT_FOUND` | 404 | El contacto con el ID dado no existe |
| `CONTACT_IDENTIFICATION_CONFLICT` | 409 | Ya existe un contacto con esta identificacion |
| `CONTACT_CONFLICT` | 409 | Violacion de restriccion unica del contacto |
| `CONTACT_CREATION_ERROR` | 400 | Error inesperado durante la creacion del contacto |
| `CONTACT_UPDATE_ERROR` | 400 | Error inesperado durante la actualizacion del contacto |
| `CONTACT_HAS_SALES` | 400 | No se puede eliminar el contacto porque tiene ventas asociadas |

### Integraciones

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `INTEGRATION_CONNECTION_NOT_FOUND` | 404 | La conexion de integracion no existe |
| `INTEGRATION_CONNECTION_CONFLICT` | 409 | Ya existe una conexion con este proveedor y cuenta |
| `INTEGRATION_CONNECTION_CREATION_ERROR` | 400 | Error inesperado durante la creacion de la conexion |
| `INTEGRATION_CONNECTION_UPDATE_ERROR` | 400 | Error inesperado durante la actualizacion de la conexion |
| `SKU_MAPPING_NOT_FOUND` | 404 | El registro de mapeo de SKU no existe |
| `SKU_MAPPING_CONFLICT` | 409 | Conflicto de mapeo de SKU detectado |
| `SKU_MAPPING_CREATION_ERROR` | 400 | Error inesperado durante la creacion del mapeo de SKU |
| `SYNC_LOG_NOT_FOUND` | 404 | La entrada del log de sincronizacion no existe |
| `SYNC_RETRY_ERROR` | 400 | Error al reintentar operacion de sincronizacion fallida |

### Integracion VTEX

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `VTEX_ORDER_FETCH_ERROR` | 400 | Fallo al obtener orden de la API de VTEX |
| `VTEX_SKU_MISMATCH` | 400 | SKUs sin coincidencia entre el sistema local y VTEX |
| `VTEX_OUTBOUND_SYNC_ERROR` | 400 | Error durante la operacion de sincronizacion saliente |
| `VTEX_POLL_ERROR` | 400 | Error al consultar ordenes de VTEX |
| `VTEX_WEBHOOK_REGISTRATION_ERROR` | 400 | Error al registrar webhook con VTEX |
| `VTEX_SYNC_ORDER_ERROR` | 400 | Error generico durante la sincronizacion de orden |
| `VTEX_TEST_CONNECTION_ERROR` | 400 | Error al probar la conexion con VTEX |

### Genericos

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| `VALIDATION_ERROR` | 400 | Error de validacion generico (DTO, Zod, class-validator) |
| `INTERNAL_SERVER_ERROR` | 500 | Error no manejado del servidor |
| `UNKNOWN_ERROR` | 400 | Error sin codigo especifico |
