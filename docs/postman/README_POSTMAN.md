# Colección de Postman - Sistema de Inventario

Esta colección de Postman contiene todos los endpoints disponibles del Sistema de Inventario Multi-Tenant con arquitectura DDD y Hexagonal.

## 📋 Contenido de la Colección

### 🔐 Authentication

- **POST** `/auth/login` - Iniciar sesión de usuario
- **POST** `/auth/logout` - Cerrar sesión del usuario
- **POST** `/auth/refresh` - Refrescar token de acceso
- **POST** `/auth/logout-all` - Cerrar todas las sesiones activas

### 🏥 Health Check

- **GET** `/health` - Verificación básica de salud del sistema
- **GET** `/health/detailed` - Verificación detallada con métricas
- **GET** `/health/full` - Verificación completa orquestada por dominio

### 📦 Inventory Management (Pendiente de implementación)

- **GET** `/inventory/products` - Obtener todos los productos
- **GET** `/inventory/products/:id` - Obtener producto por ID
- **POST** `/inventory/products` - Crear nuevo producto
- **GET** `/inventory/warehouses` - Obtener todas las bodegas
- **GET** `/inventory/stock` - Obtener stock actual
- **GET** `/inventory/movements` - Obtener movimientos de inventario
- **GET** `/inventory/transfers` - Obtener transferencias entre bodegas

### 🏢 Organization Management (Pendiente de implementación)

- **GET** `/organization/settings` - Configuración de la organización
- **GET** `/organization/branding` - Información de marca
- **GET** `/organization/tenant` - Información del tenant actual

### 📊 Reporting (Pendiente de implementación)

- **POST** `/reporting/inventory` - Generar reporte de inventario
- **POST** `/reporting/financial` - Generar reporte financiero
- **POST** `/reporting/movements` - Generar reporte de movimientos
- **GET** `/reporting/export/:reportId` - Descargar reporte generado

### 📥 Bulk Imports (Pendiente de implementación)

- **POST** `/imports/products` - Importar productos masivamente
- **POST** `/imports/stock` - Importar stock masivamente
- **GET** `/imports/status/:importId` - Estado de importación

## 🚀 Instalación y Uso

### 1. Importar la Colección

1. Abre Postman
2. Haz clic en "Import" en la esquina superior izquierda
3. Selecciona el archivo `postman_collection.json`
4. La colección se importará automáticamente

### 2. Configurar Variables de Entorno

La colección incluye variables predefinidas que debes configurar:

- **baseUrl**: URL base de tu API (por defecto: `http://localhost:3000`)
- **accessToken**: Token de acceso JWT (se obtiene al hacer login)
- **refreshToken**: Token de refresco JWT (se obtiene al hacer login)
- **organizationId**: ID de la organización (se obtiene después de la autenticación)

### 3. Flujo de Autenticación

1. **Ejecuta el endpoint de Login** con tus credenciales
2. **Copia el `accessToken`** de la respuesta
3. **Pega el token** en la variable `accessToken` de la colección
4. **Copia el `refreshToken`** de la respuesta
5. **Pega el token** en la variable `refreshToken` de la colección

### 4. Usar Endpoints Protegidos

Una vez configurado el token, todos los endpoints protegidos funcionarán automáticamente usando la autenticación Bearer.

## 🔧 Configuración de Variables

### Variables de Colección

```json
{
  "baseUrl": "http://localhost:3000",
  "accessToken": "",
  "refreshToken": "",
  "organizationId": ""
}
```

### Variables de Entorno (Opcional)

Puedes crear un entorno en Postman con estas variables para mayor flexibilidad.

## 📝 Notas Importantes

### Endpoints Implementados

- ✅ **Authentication**: Completamente implementado
- ✅ **Health Check**: Completamente implementado

### Endpoints Pendientes

- ⏳ **Inventory Management**: Estructura definida, pendiente implementación
- ⏳ **Organization Management**: Estructura definida, pendiente implementación
- ⏳ **Reporting**: Estructura definida, pendiente implementación
- ⏳ **Bulk Imports**: Estructura definida, pendiente implementación

### Autenticación

- Todos los endpoints protegidos requieren el header `Authorization: Bearer {token}`
- Los tokens JWT tienen tiempo de expiración configurado
- Usa el endpoint de refresh para renovar tokens expirados

### Rate Limiting

- Los endpoints de autenticación tienen rate limiting por IP
- Respeta los límites para evitar bloqueos temporales

## 🧪 Testing Automático

La colección incluye scripts de test automático que:

- Verifican que el código de estado sea 200
- Validan que el tiempo de respuesta sea menor a 2000ms
- Pueden ser personalizados según tus necesidades

## 🔍 Swagger Documentation

El sistema también incluye documentación Swagger disponible en:

```
http://localhost:3000/api
```

## 📞 Soporte

Para soporte técnico o preguntas sobre la API:

- Revisa la documentación Swagger
- Consulta los logs del servidor
- Verifica la configuración de variables en Postman

## 🔄 Actualizaciones

Esta colección se actualizará automáticamente cuando se implementen nuevos endpoints en el sistema.

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024  
**Compatibilidad**: Postman v10+
