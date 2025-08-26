# Health Check - Sistema de Inventarios

## 📋 Descripción

El sistema de health check implementa **Arquitectura Hexagonal + DDD + Programación Funcional + Screaming Architecture + NestJS** para monitorear la salud del sistema de inventarios.

## 🏗️ Arquitectura

### **Dominio (Domain Layer)**

- **`healthCheck.types.ts`**: Tipos funcionales inmutables
- **`healthCheck.port.ts`**: Interface del port (Arquitectura Hexagonal)
- **`healthCheck.service.ts`**: Servicios de dominio funcionales

### **Aplicación (Application Layer)**

- **`healthCheck.application.service.ts`**: Casos de uso y orquestación

### **Infraestructura (Infrastructure Layer)**

- **`healthCheck.adapter.ts`**: Implementación del port para base de datos y sistema

### **Interfaces (Interface Layer)**

- **`healthCheck.controller.ts`**: HTTP Controller with Swagger
- **`healthCheck.module.ts`**: NestJS Module
- **`healthCheck.dto.ts`**: DTOs for documentation

## 🚀 Endpoints

### **GET /health**

Endpoint básico que retorna el estado general del sistema.

**Respuesta:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "development"
}
```

### **GET /health/detailed**

Endpoint detallado con métricas del sistema y base de datos.

**Respuesta:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "development",
  "database": {
    "status": "healthy",
    "responseTime": 45,
    "lastCheck": "2024-01-15T10:30:00.000Z"
  },
  "system": {
    "memory": {
      "used": 512000000,
      "total": 1073741824,
      "percentage": 48
    },
    "cpu": {
      "load": 0.75,
      "cores": 8
    },
    "disk": {
      "used": 50000000000,
      "total": 100000000000,
      "percentage": 50
    }
  },
  "services": {
    "database": "healthy",
    "system": "healthy",
    "api": "healthy"
  }
}
```

### **GET /health/full**

Endpoint completo que orquesta todos los checks desde el dominio.

## 🔧 Programación Funcional

### **Funciones Puras**

- `isHealthy()`, `isUnhealthy()`, `isDegraded()`
- `calculateMemoryPercentage()`, `calculateDiskPercentage()`
- `createHealthCheckResult()`, `createDetailedHealthCheck()`

### **Inmutabilidad**

- Todos los tipos son `readonly`
- Funciones sin efectos secundarios
- Composición funcional para lógica compleja

### **Pattern Matching**

- Uso de destructuring para extraer datos
- Validación funcional de estados

## 🧪 Testing

### **Tests End-to-End**

```bash
# Ejecutar tests de health check
bun run test:e2e healthCheck.e2e-spec.ts

# Ejecutar todos los tests
bun run test:e2e
```

### **Cobertura de Tests**

- Tests de endpoints HTTP
- Validación de respuestas
- Verificación de estructura de datos

## 📊 Monitoreo

### **Métricas del Sistema**

- **Memoria**: Uso de heap, porcentaje de utilización
- **CPU**: Carga del sistema, número de cores
- **Disco**: Espacio utilizado y disponible
- **Base de Datos**: Tiempo de respuesta, conectividad

### **Estados de Salud**

- **`healthy`**: Sistema funcionando correctamente
- **`degraded`**: Sistema funcionando con limitaciones
- **`unhealthy`**: Sistema no funcionando correctamente

## 🚨 Alertas

### **Criterios de Degradación**

- Memoria utilizada > 90%
- Tiempo de respuesta de BD > 1 segundo
- Uso de CPU > 80%

### **Criterios de No Saludable**

- Base de datos no accesible
- Memoria agotada
- Errores críticos del sistema

## 🔌 Integración

### **Load Balancers**

- Endpoint `/health` para health checks básicos
- Endpoint `/health/detailed` para monitoreo avanzado

### **Monitoreo Externo**

- Prometheus metrics
- Grafana dashboards
- Alertas automáticas

## 📚 Swagger Documentation

Access the complete documentation at:

```
http://localhost:3000/api
```

## 🏃‍♂️ Uso

### **Desarrollo Local**

```bash
# Iniciar aplicación
bun run dev

# Verificar health check
curl http://localhost:3000/health
```

### **Docker**

```bash
# Iniciar con Docker
bun run docker:up

# Verificar health check
curl http://localhost:3000/health
```

## 🔒 Seguridad

- Endpoints públicos (no requieren autenticación)
- Información limitada para evitar exposición de datos sensibles
- Rate limiting recomendado para endpoints de monitoreo

## 📈 Métricas de Performance

- **Tiempo de respuesta**: < 100ms para health básico
- **Tiempo de respuesta**: < 500ms para health detallado
- **Disponibilidad**: 99.9% uptime
- **Latencia**: < 50ms en condiciones normales
