> **[English](./contacts.md)** | [Español](./contacts.es.md)

# Contacts Module

## Overview

The Contacts module manages customers and suppliers within the system. It follows a clean architecture pattern with domain entities, repository ports, DTOs for input validation, use cases for business logic, and an HTTP controller for API exposure. All operations are scoped to an organization (`orgId`) for multi-tenant isolation.

---

## Entities

### Contact (`src/contacts/domain/entities/contact.entity.ts`)

The core domain entity representing a customer or supplier.

**Properties:**

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Contact name |
| `identification` | `string` | Yes | Unique ID such as NIT, CC |
| `type` | `string` | Yes | `CUSTOMER` or `SUPPLIER` |
| `email` | `string` | No | Email address |
| `phone` | `string` | No | Phone number |
| `address` | `string` | No | Physical address |
| `notes` | `string` | No | Free-text notes |
| `isActive` | `boolean` | Yes | Active status (defaults to `true`) |

**Business Rules:**
- Identification must be unique within an organization.
- Contacts with associated sales cannot be deleted; they should be deactivated instead.
- Default type is `CUSTOMER` when not specified.

---

## Use Cases

All use cases are located in `src/application/contactUseCases/`.

### 1. CreateContactUseCase (`createContactUseCase.ts`)

Creates a new contact after verifying that no other contact with the same identification exists in the organization.

- **Input:** `name`, `identification`, `type?`, `email?`, `phone?`, `address?`, `notes?`, `orgId`
- **Errors:** `CONTACT_IDENTIFICATION_CONFLICT` (409), `CONTACT_CREATION_ERROR`

### 2. GetContactsUseCase (`getContactsUseCase.ts`)

Retrieves a paginated, filterable, and sortable list of contacts. Includes the number of associated sales per contact.

- **Filters:** `search`, `type`, `isActive`
- **Sort:** `name`, `identification`, `type`, `isActive`, `createdAt`, `updatedAt`
- **Pagination:** `page`, `limit`

### 3. GetContactByIdUseCase (`getContactByIdUseCase.ts`)

Retrieves a single contact by its ID, including the sales count.

- **Errors:** `CONTACT_NOT_FOUND` (404)

### 4. UpdateContactUseCase (`updateContactUseCase.ts`)

Partially updates a contact's fields. If the identification changes, uniqueness is re-validated.

- **Errors:** `CONTACT_NOT_FOUND` (404), `CONTACT_IDENTIFICATION_CONFLICT` (409)

### 5. DeleteContactUseCase (`deleteContactUseCase.ts`)

Deletes a contact only if it has zero associated sales. Otherwise returns a business rule error.

- **Errors:** `CONTACT_NOT_FOUND` (404), `CONTACT_HAS_SALES` (400)

---

## API Endpoints

**Base path:** `/contacts`
**Controller:** `src/interfaces/http/contacts/contacts.controller.ts`
**HTTP Module:** `src/interfaces/http/contacts/contactsHttp.module.ts`

All endpoints require JWT authentication and role-based authorization via `JwtAuthGuard`, `RoleBasedAuthGuard`, and `PermissionGuard`. An `AuditInterceptor` logs all operations.

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/contacts` | `CONTACTS_READ` | List contacts with pagination, filters, and sorting |
| `GET` | `/contacts/:id` | `CONTACTS_READ` | Get a single contact by ID |
| `POST` | `/contacts` | `CONTACTS_CREATE` | Create a new contact |
| `PUT` | `/contacts/:id` | `CONTACTS_UPDATE` | Update an existing contact |
| `DELETE` | `/contacts/:id` | `CONTACTS_DELETE` | Delete a contact (only if no sales) |

### Query Parameters for GET `/contacts`

| Parameter | Type | Description |
|---|---|---|
| `search` | `string` | Search by name, identification, address, or notes |
| `type` | `CUSTOMER` \| `SUPPLIER` | Filter by contact type |
| `isActive` | `boolean` | Filter by active status |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page (default: 10) |
| `sortBy` | `string` | Sort field |
| `sortOrder` | `asc` \| `desc` | Sort direction |

---

## File Reference

| Layer | Path |
|---|---|
| Entity | `src/contacts/domain/entities/contact.entity.ts` |
| Repository Port | `src/contacts/domain/ports/repositories/iContactRepository.port.ts` |
| DTOs | `src/contacts/dto/createContact.dto.ts`, `updateContact.dto.ts`, `getContacts.dto.ts` |
| Use Cases | `src/application/contactUseCases/*.ts` |
| Controller | `src/interfaces/http/contacts/contacts.controller.ts` |
| Module | `src/contacts/contacts.module.ts` |
| HTTP Module | `src/interfaces/http/contacts/contactsHttp.module.ts` |
| Repository Implementation | `src/infrastructure/database/repositories/contact.repository.ts` |
