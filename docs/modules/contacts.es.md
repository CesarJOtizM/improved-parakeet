> [English](./contacts.md) | **[Español](./contacts.es.md)**

# Modulo de Contactos

## Descripcion General

El modulo de Contactos gestiona clientes y proveedores dentro del sistema. Sigue un patron de arquitectura limpia con entidades de dominio, puertos de repositorio, DTOs para validacion de entrada, casos de uso para logica de negocio, y un controlador HTTP para exposicion via API. Todas las operaciones estan delimitadas por organizacion (`orgId`) para aislamiento multi-inquilino.

---

## Entidades

### Contact (`src/contacts/domain/entities/contact.entity.ts`)

La entidad de dominio principal que representa un cliente o proveedor.

**Propiedades:**

| Propiedad | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `name` | `string` | Si | Nombre del contacto |
| `identification` | `string` | Si | Identificacion unica como NIT, CC |
| `type` | `string` | Si | `CUSTOMER` o `SUPPLIER` |
| `email` | `string` | No | Correo electronico |
| `phone` | `string` | No | Numero de telefono |
| `address` | `string` | No | Direccion fisica |
| `notes` | `string` | No | Notas de texto libre |
| `isActive` | `boolean` | Si | Estado activo (por defecto `true`) |

**Reglas de Negocio:**
- La identificacion debe ser unica dentro de una organizacion.
- Los contactos con ventas asociadas no pueden eliminarse; deben desactivarse en su lugar.
- El tipo por defecto es `CUSTOMER` cuando no se especifica.

---

## Casos de Uso

Todos los casos de uso se encuentran en `src/application/contactUseCases/`.

### 1. CreateContactUseCase (`createContactUseCase.ts`)

Crea un nuevo contacto despues de verificar que no existe otro contacto con la misma identificacion en la organizacion.

- **Entrada:** `name`, `identification`, `type?`, `email?`, `phone?`, `address?`, `notes?`, `orgId`
- **Errores:** `CONTACT_IDENTIFICATION_CONFLICT` (409), `CONTACT_CREATION_ERROR`

### 2. GetContactsUseCase (`getContactsUseCase.ts`)

Obtiene una lista paginada, filtrable y ordenable de contactos. Incluye el numero de ventas asociadas por contacto.

- **Filtros:** `search`, `type`, `isActive`
- **Ordenar por:** `name`, `identification`, `type`, `isActive`, `createdAt`, `updatedAt`
- **Paginacion:** `page`, `limit`

### 3. GetContactByIdUseCase (`getContactByIdUseCase.ts`)

Obtiene un contacto individual por su ID, incluyendo el conteo de ventas.

- **Errores:** `CONTACT_NOT_FOUND` (404)

### 4. UpdateContactUseCase (`updateContactUseCase.ts`)

Actualiza parcialmente los campos de un contacto. Si la identificacion cambia, se re-valida la unicidad.

- **Errores:** `CONTACT_NOT_FOUND` (404), `CONTACT_IDENTIFICATION_CONFLICT` (409)

### 5. DeleteContactUseCase (`deleteContactUseCase.ts`)

Elimina un contacto solo si tiene cero ventas asociadas. De lo contrario, retorna un error de regla de negocio.

- **Errores:** `CONTACT_NOT_FOUND` (404), `CONTACT_HAS_SALES` (400)

---

## Endpoints de la API

**Ruta base:** `/contacts`
**Controlador:** `src/interfaces/http/contacts/contacts.controller.ts`
**Modulo HTTP:** `src/interfaces/http/contacts/contactsHttp.module.ts`

Todos los endpoints requieren autenticacion JWT y autorizacion basada en roles mediante `JwtAuthGuard`, `RoleBasedAuthGuard` y `PermissionGuard`. Un `AuditInterceptor` registra todas las operaciones.

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| `GET` | `/contacts` | `CONTACTS_READ` | Listar contactos con paginacion, filtros y ordenamiento |
| `GET` | `/contacts/:id` | `CONTACTS_READ` | Obtener un contacto por ID |
| `POST` | `/contacts` | `CONTACTS_CREATE` | Crear un nuevo contacto |
| `PUT` | `/contacts/:id` | `CONTACTS_UPDATE` | Actualizar un contacto existente |
| `DELETE` | `/contacts/:id` | `CONTACTS_DELETE` | Eliminar un contacto (solo si no tiene ventas) |

### Parametros de consulta para GET `/contacts`

| Parametro | Tipo | Descripcion |
|---|---|---|
| `search` | `string` | Buscar por nombre, identificacion, direccion o notas |
| `type` | `CUSTOMER` \| `SUPPLIER` | Filtrar por tipo de contacto |
| `isActive` | `boolean` | Filtrar por estado activo |
| `page` | `number` | Numero de pagina (por defecto: 1) |
| `limit` | `number` | Elementos por pagina (por defecto: 10) |
| `sortBy` | `string` | Campo de ordenamiento |
| `sortOrder` | `asc` \| `desc` | Direccion de ordenamiento |

---

## Referencia de Archivos

| Capa | Ruta |
|---|---|
| Entidad | `src/contacts/domain/entities/contact.entity.ts` |
| Puerto de Repositorio | `src/contacts/domain/ports/repositories/iContactRepository.port.ts` |
| DTOs | `src/contacts/dto/createContact.dto.ts`, `updateContact.dto.ts`, `getContacts.dto.ts` |
| Casos de Uso | `src/application/contactUseCases/*.ts` |
| Controlador | `src/interfaces/http/contacts/contacts.controller.ts` |
| Modulo | `src/contacts/contacts.module.ts` |
| Modulo HTTP | `src/interfaces/http/contacts/contactsHttp.module.ts` |
| Implementacion de Repositorio | `src/infrastructure/database/repositories/contact.repository.ts` |
