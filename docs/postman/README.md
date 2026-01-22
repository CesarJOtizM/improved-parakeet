# Postman Collections - Sistema de Inventarios

Este directorio contiene todas las colecciones y recursos de Postman para el Sistema de Inventarios Multi-Tenant.

## 📁 Estructura de Archivos

```
docs/postman/
├── postman_collection.json          # Colección principal con todos los endpoints
├── smoke-tests.postman_collection.json  # Colección de smoke tests para validación rápida
├── environments/                     # Archivos de entorno de Postman
│   ├── local.environment.json       # Entorno para desarrollo local
│   ├── staging.environment.json     # Entorno para staging
│   └── production.environment.json  # Entorno para producción
├── README.md                        # Este archivo (índice)
├── README_POSTMAN.md                # Documentación técnica de la colección
└── USER_GUIDE.md                    # Guía de usuario completa para testing
```

## 🚀 Inicio Rápido

### 1. Importar Todo

1. **Importa la colección principal**:
   - Abre Postman → Import → `postman_collection.json`

2. **Importa los smoke tests** (recomendado):
   - Import → `smoke-tests.postman_collection.json`

3. **Importa los entornos**:
   - Environments → Import → Selecciona los 3 archivos de `environments/`

4. **Selecciona el entorno**:
   - Usa el selector en la esquina superior derecha
   - Elige "Local Development" para empezar

### 2. Configurar y Autenticarte

1. Actualiza `organizationId` en el entorno si es necesario
2. Ejecuta **"POST Login"** en Authentication
3. Los tokens se guardarán automáticamente

### 3. Ejecutar Smoke Tests

1. Abre la colección "Smoke Tests"
2. Ejecuta con Collection Runner
3. Verifica que todos los tests pasen ✅

## 📖 Documentación

### Para Usuarios

- **[USER_GUIDE.md](USER_GUIDE.md)**: Guía completa paso a paso
  - Instalación y configuración
  - Flujo de autenticación
  - Cómo ejecutar requests
  - Uso de smoke tests
  - Troubleshooting

### Para Desarrolladores

- **[README_POSTMAN.md](README_POSTMAN.md)**: Documentación técnica
  - Estructura de la colección
  - Endpoints disponibles
  - Variables y headers
  - Scripts de testing
  - Ejemplos de uso

## 🎯 Colecciones Disponibles

### 1. Inventory System API (Principal)

Colección completa con todos los endpoints del sistema:

- ✅ Authentication (Login, Logout, Refresh)
- ✅ User Registration
- ✅ Password Reset
- ✅ Users Management
- ✅ Roles Management
- ✅ Health Check
- ✅ Products
- ✅ Warehouses
- ✅ Movements
- ✅ Transfers
- ✅ Stock
- ✅ Sales
- ✅ Returns
- ✅ Reports (View, Stream, Export)
- ✅ Imports

**Archivo**: `postman_collection.json`

### 2. Smoke Tests

Colección de tests rápidos para validación después de despliegues:

- ✅ Health Check
- ✅ Login
- ✅ Refresh Token
- ✅ Get Products
- ✅ Get Warehouses
- ✅ Get Reports

**Archivo**: `smoke-tests.postman_collection.json`

**Uso**: Ejecutar después de despliegues o cambios importantes para validar que todo funcione.

## 🌍 Entornos Disponibles

### Local Development

- **URL**: `http://localhost:3000`
- **Uso**: Desarrollo local
- **Archivo**: `environments/local.environment.json`

### Staging

- **URL**: `https://staging-api.inventory.com`
- **Uso**: Testing antes de producción
- **Archivo**: `environments/staging.environment.json`

### Production

- **URL**: `https://api.inventory.com`
- **Uso**: Producción (¡usar con cuidado!)
- **Archivo**: `environments/production.environment.json`

## 🔧 Características

### Variables Automáticas

Las siguientes variables se actualizan automáticamente:

- `accessToken`: Al hacer login
- `refreshToken`: Al hacer login
- `userId`: Extraído de la respuesta de login
- `productId`, `warehouseId`, etc.: Extraídos de las respuestas

### Tests Automáticos

Cada request incluye tests automáticos que validan:

- ✅ Códigos de estado HTTP
- ✅ Tiempos de respuesta
- ✅ Estructura de respuestas JSON
- ✅ Headers requeridos
- ✅ Formatos de archivo (PDF, Excel, CSV)

### Pre-request Scripts

Scripts automáticos que:

- Generan `requestId` único
- Verifican expiración de tokens
- Configuran headers automáticamente

## 📝 Mejores Prácticas

1. **Usa el entorno correcto**: Local para desarrollo, Staging para testing
2. **Ejecuta smoke tests regularmente**: Después de despliegues
3. **Mantén tokens actualizados**: Usa refresh token antes de que expire
4. **Organiza tus requests**: Usa carpetas y nombres descriptivos
5. **Documenta cambios**: Agrega notas cuando modifiques requests

## 🆘 Troubleshooting

### Problemas Comunes

- **Error 401**: Token expirado → Ejecuta Refresh Token
- **Error 404**: Verifica `organizationId` y `baseUrl`
- **Timeout**: Verifica que el servidor esté corriendo
- **Variables no se actualizan**: Verifica que estés usando el entorno correcto

Para más ayuda, consulta [USER_GUIDE.md](USER_GUIDE.md#troubleshooting).

## 🔗 Enlaces Útiles

- **Swagger UI**: `http://localhost:3000/api`
- **Documentación Técnica**: `../technical-documentation.md`
- **Postman Docs**: https://learning.postman.com/

## 📞 Soporte

Si encuentras problemas:

1. Revisa la [Guía de Usuario](USER_GUIDE.md)
2. Revisa la [Documentación Técnica](README_POSTMAN.md)
3. Revisa los logs del servidor
4. Contacta al equipo de desarrollo

---

**Última actualización**: Diciembre 2024  
**Versión**: 1.0.0  
**Compatibilidad**: Postman v10+



