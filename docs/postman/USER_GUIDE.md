# Guía de Usuario - Testing con Postman

Esta guía te ayudará a configurar y usar Postman para probar el Sistema de Inventarios Multi-Tenant.

## 📋 Tabla de Contenidos

1. [Instalación y Configuración Inicial](#instalación-y-configuración-inicial)
2. [Importar Colecciones y Entornos](#importar-colecciones-y-entornos)
3. [Configurar Variables de Entorno](#configurar-variables-de-entorno)
4. [Flujo de Autenticación](#flujo-de-autenticación)
5. [Ejecutar Requests](#ejecutar-requests)
6. [Usar Smoke Tests](#usar-smoke-tests)
7. [Collection Runner](#collection-runner)
8. [Troubleshooting](#troubleshooting)

---

## Instalación y Configuración Inicial

### Requisitos Previos

- **Postman Desktop App** (versión 10.0 o superior)
  - Descarga desde: https://www.postman.com/downloads/
- **Acceso al servidor API**
  - Local: `http://localhost:3000`
  - Staging: `https://staging-api.inventory.com`
  - Production: `https://api.inventory.com`

### Instalar Postman

1. Descarga Postman desde el sitio oficial
2. Instala la aplicación
3. Crea una cuenta (opcional pero recomendado para sincronización)

---

## Importar Colecciones y Entornos

### Paso 1: Importar Colección Principal

1. Abre Postman
2. Haz clic en **"Import"** en la esquina superior izquierda
3. Selecciona el archivo: `docs/postman/postman_collection.json`
4. Haz clic en **"Import"**
5. La colección **"Inventory System API"** aparecerá en el panel izquierdo

### Paso 2: Importar Colección de Smoke Tests

1. Repite el proceso anterior
2. Selecciona: `docs/postman/smoke-tests.postman_collection.json`
3. La colección **"Smoke Tests"** aparecerá en el panel izquierdo

### Paso 3: Importar Entornos

1. Haz clic en **"Environments"** en el panel izquierdo (o usa el ícono de engranaje)
2. Haz clic en **"Import"**
3. Importa los siguientes archivos:
   - `docs/postman/environments/local.environment.json`
   - `docs/postman/environments/staging.environment.json`
   - `docs/postman/environments/production.environment.json`
4. Los entornos aparecerán en la lista de entornos

### Paso 4: Seleccionar Entorno

1. En la esquina superior derecha, haz clic en el selector de entorno
2. Selecciona el entorno que deseas usar (ej: **"Local Development"**)

---

## Configurar Variables de Entorno

### Variables Predefinidas

Cada entorno ya tiene variables predefinidas. Solo necesitas actualizar las siguientes:

#### Para Local Development:

1. Selecciona el entorno **"Local Development"**
2. Haz clic en el ícono de ojo (👁️) para ver las variables
3. Verifica que `baseUrl` sea `http://localhost:3000`
4. Verifica que `organizationId` sea `dev-org` (o tu organización de desarrollo)

#### Para Staging/Production:

1. Selecciona el entorno correspondiente
2. Actualiza `baseUrl` con la URL correcta
3. Actualiza `organizationId` con el ID de tu organización

### Variables que se Actualizan Automáticamente

Las siguientes variables se actualizan automáticamente cuando ejecutas requests:

- `accessToken`: Se actualiza al hacer login
- `refreshToken`: Se actualiza al hacer login
- `userId`: Se extrae de la respuesta de login
- `productId`, `warehouseId`, etc.: Se extraen de las respuestas

---

## Flujo de Autenticación

### Paso 1: Login

1. En la colección **"Inventory System API"**, expande **"Authentication"**
2. Selecciona **"POST Login"**
3. En el body, actualiza las credenciales:
   ```json
   {
     "email": "admin@example.com",
     "password": "admin123"
   }
   ```
4. Asegúrate de que el header `X-Organization-ID` tenga el valor correcto
5. Haz clic en **"Send"**
6. Si es exitoso, verás los tokens en la respuesta (formato estándar de la API):
   ```json
   {
     "success": true,
     "message": "Login successful",
     "data": {
       "accessToken": "eyJhbGci...",
       "refreshToken": "eyJhbGci...",
       "user": { ... },
       "accessTokenExpiresAt": "2024-12-31T23:59:59.000Z",
       "refreshTokenExpiresAt": "2025-01-31T23:59:59.000Z",
       "sessionId": "session-id"
     },
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```
   **Nota**: Los tokens se guardan automáticamente en las variables de la colección desde `data.accessToken` y `data.refreshToken`.

### Paso 2: Verificar Tokens Guardados

1. Los tokens se guardan automáticamente en las variables de entorno
2. Para verificar, haz clic en el ícono de ojo (👁️) en el entorno
3. Deberías ver `accessToken` y `refreshToken` con valores

### Paso 3: Usar Endpoints Protegidos

1. Todos los endpoints protegidos usan automáticamente el `accessToken`
2. El header `Authorization: Bearer {{accessToken}}` se agrega automáticamente
3. Solo ejecuta el request normalmente

### Paso 4: Refresh Token (cuando expire)

1. Si recibes un error 401 (Unauthorized), el token probablemente expiró
2. Ve a **"POST Refresh Token"**
3. El `refreshToken` se usa automáticamente desde las variables
4. Ejecuta el request
5. El nuevo `accessToken` se guardará automáticamente

---

## Ejecutar Requests

### Request Básico

1. Selecciona un request de la colección
2. Verifica que el entorno correcto esté seleccionado
3. Haz clic en **"Send"**
4. Revisa la respuesta en el panel inferior

### Ver Tests Automáticos

1. Después de ejecutar un request, ve a la pestaña **"Test Results"**
2. Verás los tests automáticos que se ejecutaron
3. ✅ Verde = Test pasado
4. ❌ Rojo = Test fallido

### Modificar Requests

#### Cambiar Parámetros de Query

1. En la pestaña **"Params"**, agrega o modifica parámetros
2. Ejemplo: `page=1&limit=20`

#### Cambiar Body

1. En la pestaña **"Body"**, selecciona **"raw"** y **"JSON"**
2. Modifica el JSON según necesites
3. Usa variables: `{{organizationId}}`, `{{productId}}`, etc.

#### Cambiar Headers

1. En la pestaña **"Headers"**, agrega o modifica headers
2. Los headers de autenticación se agregan automáticamente

---

## Usar Smoke Tests

### ¿Qué son los Smoke Tests?

Los smoke tests son una suite rápida de tests que validan que los endpoints críticos funcionen correctamente. Úsalos después de despliegues o cambios importantes.

### Ejecutar Smoke Tests Manualmente

1. Abre la colección **"Smoke Tests"**
2. Ejecuta cada request en orden:
   - Health Check
   - Login
   - Get Products
   - Get Warehouses
   - Get Reports
3. Revisa los resultados en la pestaña **"Test Results"**

### Ejecutar Smoke Tests con Collection Runner

1. Haz clic derecho en la colección **"Smoke Tests"**
2. Selecciona **"Run collection"**
3. En el Collection Runner:
   - Selecciona el entorno correcto
   - Configura el orden de ejecución (si es necesario)
   - Haz clic en **"Run Smoke Tests"**
4. Revisa el resumen de resultados

### Interpretar Resultados

- **✅ Todos los tests pasan**: El sistema está funcionando correctamente
- **❌ Algunos tests fallan**: Revisa los errores específicos
  - Error 401: Problema de autenticación (verifica tokens)
  - Error 500: Error del servidor (revisa logs)
  - Timeout: Problema de conectividad o servidor lento

---

## Collection Runner

### ¿Qué es Collection Runner?

Collection Runner ejecuta múltiples requests de una colección en secuencia, útil para:
- Testing completo de funcionalidades
- Validación de flujos completos
- Testing de regresión

### Ejecutar una Colección Completa

1. Haz clic derecho en la colección **"Inventory System API"**
2. Selecciona **"Run collection"**
3. En el Collection Runner:
   - **Selecciona el entorno**: Elige el entorno correcto
   - **Configura iteraciones**: Cuántas veces ejecutar (1 por defecto)
   - **Selecciona requests**: Marca/desmarca requests específicos
   - **Configura delay**: Tiempo entre requests (opcional)
4. Haz clic en **"Run Inventory System API"**
5. Revisa el resumen de resultados

### Configurar Variables para Collection Runner

1. En el Collection Runner, ve a la pestaña **"Variables"**
2. Puedes sobrescribir variables de entorno aquí
3. Útil para testing con diferentes organizaciones o datos

### Ejecutar en Diferentes Entornos

1. Ejecuta la colección con el entorno **"Local Development"**
2. Luego ejecuta con **"Staging"**
3. Compara los resultados

---

## Troubleshooting

### Problema: "Invalid token" o Error 401

**Solución**:
1. Verifica que hayas hecho login recientemente
2. Ejecuta **"POST Refresh Token"** para renovar el token
3. Si persiste, vuelve a hacer login

### Problema: "Organization not found" o Error 404

**Solución**:
1. Verifica que `organizationId` en el entorno sea correcto
2. Verifica que el header `X-Organization-ID` esté presente
3. Asegúrate de que la organización exista en el sistema

### Problema: Timeout o Error de Conexión

**Solución**:
1. Verifica que el servidor esté corriendo
2. Verifica que `baseUrl` en el entorno sea correcto
3. Verifica tu conexión a internet
4. Revisa si hay un firewall bloqueando

### Problema: Variables no se actualizan

**Solución**:
1. Verifica que estés usando el entorno correcto
2. Algunas variables se actualizan solo en ciertos requests
3. Revisa los scripts de test en el request para ver qué variables se actualizan

### Problema: Tests fallan pero el request funciona

**Solución**:
1. Revisa el mensaje de error específico en **"Test Results"**
2. Puede ser que la estructura de la respuesta haya cambiado
3. Actualiza los tests en el request si es necesario

### Problema: No puedo importar la colección

**Solución**:
1. Verifica que el archivo JSON esté completo
2. Verifica que Postman esté actualizado (v10+)
3. Intenta importar desde archivo en lugar de copiar/pegar

---

## Mejores Prácticas

### 1. Usar Entornos Correctos

- **Local**: Para desarrollo local
- **Staging**: Para testing antes de producción
- **Production**: Solo para validación final (¡ten cuidado!)

### 2. Mantener Tokens Actualizados

- Los tokens expiran después de cierto tiempo
- Usa el endpoint de refresh antes de que expire
- No compartas tokens en producción

### 3. Organizar Requests

- Usa carpetas para organizar requests por funcionalidad
- Nombra requests de forma descriptiva
- Agrega descripciones a los requests

### 4. Documentar Cambios

- Si modificas un request, documenta el cambio
- Agrega notas en la descripción del request
- Comparte cambios con el equipo

### 5. Usar Variables

- Usa variables en lugar de valores hardcodeados
- Facilita cambiar entre entornos
- Hace los requests más mantenibles

### 6. Ejecutar Smoke Tests Regularmente

- Ejecuta smoke tests después de despliegues
- Ejecuta smoke tests antes de releases importantes
- Mantén los smoke tests actualizados

---

## Recursos Adicionales

- **Documentación de API**: `docs/technical-documentation.md`
- **README de Postman**: `docs/postman/README_POSTMAN.md`
- **Swagger UI**: `http://localhost:3000/api` (cuando el servidor está corriendo)

---

## Soporte

Si encuentras problemas o tienes preguntas:

1. Revisa esta guía primero
2. Revisa la documentación técnica
3. Revisa los logs del servidor
4. Contacta al equipo de desarrollo

---

**Última actualización**: Diciembre 2024  
**Versión de Postman**: 10.0+





