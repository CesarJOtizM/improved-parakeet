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

### Total: 2 TODOs

### Por Prioridad Sugerida

#### 🟢 Baja Prioridad
1. Implementar envío de emails para notificaciones (2 TODOs relacionados)

---

## 🔄 Siguientes Pasos

1. **Integrar servicio de emails** cuando el sistema de gestión de usuarios esté completo

