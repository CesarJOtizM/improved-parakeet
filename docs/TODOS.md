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
- **Gestión de Usuarios**: 12 TODOs (6 para `failedLoginAttempts`, 6 para `lockedUntil`)
- **Sesiones**: 1 TODO

### Total: 15 TODOs

### Por Prioridad Sugerida

#### 🔴 Alta Prioridad
1. Agregar campos `failedLoginAttempts` y `lockedUntil` a la base de datos (12 TODOs relacionados)
2. Obtener orgId real en sesiones (1 TODO)

#### 🟢 Baja Prioridad
3. Implementar envío de emails para notificaciones (2 TODOs relacionados)

---

## 🔄 Siguientes Pasos

1. **Crear migración de base de datos** para agregar campos `failedLoginAttempts` y `lockedUntil` a la tabla `User`
2. **Actualizar esquema de Prisma** con los nuevos campos
3. **Integrar servicio de emails** cuando el sistema de gestión de usuarios esté completo

