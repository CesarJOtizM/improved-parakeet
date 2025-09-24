# 🔄 Flujos de Creación de Usuarios

## 📋 **Resumen de Flujos Implementados**

El sistema maneja correctamente **dos flujos diferentes** para la creación de usuarios:

### **1. 🔐 Registro de Usuario (Self-Registration)**

**Endpoint**: `POST /register`
**Estado inicial**: `INACTIVE` (requiere activación por administrador)

#### **Características:**

- ✅ Usuario se registra con sus propios datos
- ✅ Estado inicial: `INACTIVE` por defecto
- ✅ Envío de email de bienvenida
- ✅ Notificación al administrador para activación
- ✅ Rate limiting aplicado
- ✅ Validaciones de seguridad completas

#### **Código relevante:**

```typescript
// En RegisterUserUseCase
const user = User.create(
  {
    // ... otros campos
    status: UserStatus.create('INACTIVE'), // Inactive by default
  },
  orgId
);
```

### **2. 👨‍💼 Creación por Administrador**

**Endpoint**: `POST /users`
**Estado inicial**: `ACTIVE` por defecto (configurable)

#### **Características:**

- ✅ Solo administradores pueden crear usuarios
- ✅ Estado inicial: `ACTIVE` por defecto (configurable)
- ✅ Asignación de roles durante la creación
- ✅ Validación de permisos requeridos
- ✅ Autenticación JWT obligatoria

#### **Código relevante:**

```typescript
// En CreateUserUseCase
const user = User.create(
  {
    // ... otros campos
    status: UserStatus.create(request.status || 'ACTIVE'), // Active by default
  },
  request.orgId
);
```

## 🎯 **Diferencias Clave**

| Aspecto            | Registro (`/register`) | Creación Admin (`/users`) |
| ------------------ | ---------------------- | ------------------------- |
| **Estado inicial** | `INACTIVE`             | `ACTIVE` (configurable)   |
| **Autenticación**  | No requerida           | JWT obligatorio           |
| **Permisos**       | Público                | Requiere permisos admin   |
| **Roles**          | No se asignan          | Se pueden asignar         |
| **Rate limiting**  | Aplicado               | No aplicado               |
| **Notificaciones** | Email + Admin          | Solo email                |

## 🔧 **Implementación Actual**

### **DTOs de Validación:**

- `RegisterUserDto` - Para registro público
- `CreateUserDto` - Para creación por admin (incluye `status` opcional)

### **Casos de Uso:**

- `RegisterUserUseCase` - Maneja registro público
- `CreateUserUseCase` - Maneja creación por admin

### **Controladores:**

- `RegisterController` - Endpoint público
- `UsersController` - Endpoint protegido

## ✅ **Validaciones Implementadas**

### **Registro Público:**

- ✅ Email único en la organización
- ✅ Username único en la organización
- ✅ Validación de contraseña robusta
- ✅ Rate limiting para prevenir spam
- ✅ Validación de organización

### **Creación por Admin:**

- ✅ Email único en la organización
- ✅ Username único en la organización
- ✅ Validación de roles existentes
- ✅ Validación de permisos del admin
- ✅ Estado configurable (ACTIVE/INACTIVE)

## 🚀 **Flujo de Activación**

### **Para usuarios registrados:**

1. Usuario se registra → Estado `INACTIVE`
2. Admin recibe notificación
3. Admin activa usuario via `PUT /users/:id` con `status: 'ACTIVE'`
4. Usuario puede iniciar sesión

### **Para usuarios creados por admin:**

1. Admin crea usuario → Estado `ACTIVE` por defecto
2. Usuario puede iniciar sesión inmediatamente

## 📝 **Recomendaciones de Mejora**

### **1. Endpoint de Activación Específico**

```typescript
// Sugerencia: Agregar endpoint específico para activación
@Put(':id/activate')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('users:activate')
async activateUser(@Param('id') userId: string) {
  // Lógica específica para activación
}
```

### **2. Notificación de Activación**

```typescript
// Enviar email cuando admin activa usuario
await this.emailService.sendActivationEmail(user.email, user.firstName);
```

### **3. Historial de Estados**

```typescript
// Agregar auditoría de cambios de estado
user.addDomainEvent(new UserStatusChangedEvent(user, 'INACTIVE', 'ACTIVE'));
```

### **4. Validación de Roles en Registro**

```typescript
// Permitir asignar roles por defecto en registro
const defaultRole = await this.roleRepository.findByName('USER', orgId);
if (defaultRole) {
  await this.assignRoleToUserUseCase.execute({
    userId: user.id,
    roleId: defaultRole.id,
    orgId: orgId,
  });
}
```

## 🎯 **Estado Actual: COMPLETADO**

✅ **Ambos flujos están correctamente implementados**
✅ **Validaciones de seguridad aplicadas**
✅ **Estados iniciales diferenciados**
✅ **Permisos y autenticación configurados**
✅ **Rate limiting en registro público**

El sistema maneja perfectamente los dos escenarios de creación de usuarios con las diferencias apropiadas en seguridad, estado inicial y permisos.
