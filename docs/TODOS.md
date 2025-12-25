# 📋 TODOs del Proyecto

Este documento contiene todos los TODOs identificados en el código hasta el momento.

**Última actualización**: Generado automáticamente

---

## 📧 Notificaciones

### `src/infrastructure/externalServices/notificationService.ts`

#### TODO: Implementar envío de emails para alertas de stock bajo
- **Línea**: 53
- **Descripción**: Implementar envío real de emails cuando el sistema de gestión de usuarios esté listo
- **Contexto**: Actualmente solo se registran las alertas en los logs
- **Código**:
```typescript
// TODO: Implement actual email sending when user management is ready
// await this.emailService.sendEmail({
//   to: adminEmails,
//   subject,
//   template: 'low-stock-alert',
//   variables: { ... },
//   orgId: notification.orgId,
// });
```

#### TODO: Implementar envío de emails para alertas de exceso de stock
- **Línea**: 100
- **Descripción**: Implementar envío real de emails cuando el sistema de gestión de usuarios esté listo
- **Contexto**: Actualmente solo se registran las alertas en los logs

---

## 📊 Validación de Stock

### `src/infrastructure/jobs/stockValidationJob.ts`

#### TODO: Mejorar obtención de min/max/safety stock desde tabla de reglas de reorden
- **Línea**: 177
- **Descripción**: Este método debe mejorarse para obtener min/max/safety stock desde una tabla de reglas de reorden
- **Contexto**: Actualmente retorna `undefined` para estos valores

#### TODO: Obtener min/max/safety stock desde tabla reorder_rules
- **Línea**: 192
- **Descripción**: Obtener min/max/safety stock desde la tabla `reorder_rules`
- **Contexto**: Actualmente se retorna `undefined` para estos valores. En una implementación real se consultaría:
  ```typescript
  const reorderRule = await reorderRuleRepository.findByProductAndWarehouse(productId, warehouseId, orgId);
  const minQuantity = reorderRule ? MinQuantity.create(reorderRule.minQty) : undefined;
  const maxQuantity = reorderRule ? MaxQuantity.create(reorderRule.maxQty) : undefined;
  const safetyStock = reorderRule ? SafetyStock.create(reorderRule.safetyQty) : undefined;
  ```

#### TODO: Obtener minQuantity desde reglas de reorden
- **Línea**: 204
- **Descripción**: Obtener `minQuantity` desde reglas de reorden
- **Contexto**: Actualmente se retorna `undefined`

#### TODO: Obtener maxQuantity desde reglas de reorden
- **Línea**: 205
- **Descripción**: Obtener `maxQuantity` desde reglas de reorden
- **Contexto**: Actualmente se retorna `undefined`

#### TODO: Obtener safetyStock desde reglas de reorden
- **Línea**: 206
- **Descripción**: Obtener `safetyStock` desde reglas de reorden
- **Contexto**: Actualmente se retorna `undefined`

#### TODO: Obtener IDs de organizaciones desde un servicio de organizaciones
- **Línea**: 225
- **Descripción**: Esto debería venir de un servicio de organizaciones
- **Contexto**: Actualmente retorna un array con `['default']`. En una implementación real se consultaría el repositorio de organizaciones

---

## 🏢 Multi-Tenancy

### `src/shared/decorators/orgId.decorator.ts`

#### TODO: Implementar lógica real de mapeo subdominio -> orgId
- **Línea**: 23
- **Descripción**: Implementar lógica real de mapeo de subdominio a orgId
- **Contexto**: Actualmente se usa el subdominio directamente como orgId si no es 'localhost' o '127.0.0.1'

---

## 👥 Gestión de Usuarios

### `src/infrastructure/database/repositories/user.repository.ts`

#### TODO: Agregar campo failedLoginAttempts a la base de datos
- **Líneas**: 48, 100, 152, 204, 264, 378
- **Descripción**: Agregar campo `failedLoginAttempts` a la base de datos
- **Contexto**: Actualmente se está usando un valor por defecto `0` en múltiples métodos del repositorio:
  - `toDomain()` (línea 48)
  - `findByEmail()` (línea 100)
  - `findById()` (línea 152)
  - `findByOrganizationId()` (línea 204)
  - `findByRole()` (línea 264)
  - `findAll()` (línea 378)

#### TODO: Agregar campo lockedUntil a la base de datos
- **Líneas**: 49, 101, 153, 205, 265, 379
- **Descripción**: Agregar campo `lockedUntil` a la base de datos
- **Contexto**: Actualmente se está usando `undefined` en múltiples métodos del repositorio:
  - `toDomain()` (línea 49)
  - `findByEmail()` (línea 101)
  - `findById()` (línea 153)
  - `findByOrganizationId()` (línea 205)
  - `findByRole()` (línea 265)
  - `findAll()` (línea 379)

---

## 🔐 Sesiones

### `src/infrastructure/database/repositories/session.repository.ts`

#### TODO: Obtener orgId real
- **Línea**: 205
- **Descripción**: Obtener orgId real en lugar de usar 'unknown'
- **Contexto**: En el método `toDomain()`, se está usando `'unknown'` como orgId al reconstituir la entidad Session

---

## 📝 Notas Adicionales

### `test/interfaces/http/inventory/transfers.controller.e2e-spec.ts`

#### Nota: Modelos Transfer y TransferLine pueden no existir aún en el esquema de Prisma
- **Línea**: 289
- **Descripción**: Nota sobre que los modelos Transfer y TransferLine pueden no existir aún en el esquema de Prisma
- **Tipo**: Nota informativa, no es un TODO

---

## 📊 Resumen

### Por Categoría

- **Notificaciones**: 2 TODOs
- **Validación de Stock**: 6 TODOs
- **Multi-Tenancy**: 1 TODO
- **Gestión de Usuarios**: 12 TODOs (6 para `failedLoginAttempts`, 6 para `lockedUntil`)
- **Sesiones**: 1 TODO

### Total: 22 TODOs

### Por Prioridad Sugerida

#### 🔴 Alta Prioridad
1. Agregar campos `failedLoginAttempts` y `lockedUntil` a la base de datos (12 TODOs relacionados)
2. Obtener orgId real en sesiones (1 TODO)

#### 🟡 Media Prioridad
3. Implementar lógica de mapeo subdominio -> orgId (1 TODO)
4. Obtener min/max/safety stock desde tabla de reglas de reorden (4 TODOs relacionados)
5. Obtener IDs de organizaciones desde servicio de organizaciones (1 TODO)

#### 🟢 Baja Prioridad
6. Implementar envío de emails para notificaciones (2 TODOs relacionados)
7. Mejorar documentación del método `getProductStockInfo` (1 TODO)

---

## 🔄 Siguientes Pasos

1. **Crear migración de base de datos** para agregar campos `failedLoginAttempts` y `lockedUntil` a la tabla `User`
2. **Actualizar esquema de Prisma** con los nuevos campos
3. **Implementar servicio de organizaciones** para obtener lista de organizaciones
4. **Crear tabla `reorder_rules`** en Prisma schema si no existe
5. **Implementar repositorio de reglas de reorden** para obtener min/max/safety stock
6. **Implementar lógica de mapeo subdominio -> orgId** en el decorador `@OrgId`
7. **Integrar servicio de emails** cuando el sistema de gestión de usuarios esté completo

