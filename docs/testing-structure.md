# Estructura de Tests - Sistema de Inventarios

## 📋 Descripción

Este documento describe la estructura de tests del sistema de inventarios, que sigue los patrones **AAA (Arrange, Act, Assert)** y **Given-When-Then** para mayor claridad y mantenibilidad.

## 🏗️ Estructura de Carpetas

La estructura de tests refleja exactamente la estructura de `src/` para mantener consistencia:

```
test/
├── shared/
│   └── domain/
│       └── healthCheck.service.spec.ts
├── application/
│   └── healthCheck/
│       └── healthCheck.application.service.spec.ts
├── infrastructure/
│   ├── database/
│   └── healthCheck/
│       └── healthCheck.adapter.spec.ts
├── interfaces/
│   └── http/
│       └── healthCheck/
│           └── healthCheck.controller.spec.ts
└── healthCheck.e2e-spec.ts
```

## 🔧 Patrones de Testing

### **AAA (Arrange, Act, Assert)**

Cada test se estructura en tres secciones claras:

```typescript
it('Given: condition When: action Then: expected result', () => {
  // Arrange: Preparar datos y mocks
  const mockData = { status: 'healthy' };
  mockService.getHealth.mockResolvedValue(mockData);

  // Act: Ejecutar la función a testear
  const result = await service.getHealth();

  // Assert: Verificar el resultado
  expect(result).toEqual(mockData);
  expect(mockService.getHealth).toHaveBeenCalled();
});
```

### **Given-When-Then**

Los nombres de los tests siguen el patrón BDD (Behavior Driven Development):

```typescript
it('Given: healthy database When: checking health Then: should return healthy status', () => {
  // Test implementation
});

it('Given: database failure When: checking health Then: should return unhealthy status', () => {
  // Test implementation
});
```

## 📝 Convenciones de Naming

### **Archivos de Test**

- **Unitarios**: `*.spec.ts`
- **End-to-End**: `*.e2e-spec.ts`
- **Integración**: `*.integration-spec.ts`

### **Nombres de Tests**

- **Formato**: `Given: precondition When: action Then: expected result`
- **Ejemplo**: `Given: valid user credentials When: logging in Then: should return JWT token`

### **Variables y Mocks**

- **Mocks**: `mockServiceName`
- **Variables de test**: `expectedResult`, `actualResult`
- **Datos de prueba**: `validUserData`, `invalidUserData`

## 🧪 Tipos de Tests

### **1. Tests Unitarios (Domain Layer)**

```typescript
// test/shared/domain/healthCheck.service.spec.ts
describe('Health Check Domain Service', () => {
  describe('createHealthCheckResult', () => {
    it('Given: healthy status, version 1.0.0, test environment When: creating result Then: should return correct health check result', () => {
      // Arrange
      const status: HealthStatus = 'healthy';
      const version = '1.0.0';
      const environment = 'test';

      // Act
      const result = createHealthCheckResult(status, version, environment);

      // Assert
      expect(result.status).toBe(status);
      expect(result.version).toBe(version);
      expect(result.environment).toBe(environment);
    });
  });
});
```

### **2. Tests Unitarios (Application Layer)**

```typescript
// test/application/healthCheck/healthCheck.application.service.spec.ts
describe('HealthCheckApplicationService', () => {
  describe('getBasicHealth', () => {
    it('Given: healthy port response When: getting basic health Then: should return basic health from port', async () => {
      // Arrange
      const mockResult: HealthCheckResult = {
        /* ... */
      };
      mockHealthCheckPort.checkBasic.mockResolvedValue(mockResult);

      // Act
      const result = await service.getBasicHealth();

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockHealthCheckPort.checkBasic).toHaveBeenCalledTimes(1);
    });
  });
});
```

### **3. Tests Unitarios (Infrastructure Layer)**

```typescript
// test/infrastructure/healthCheck/healthCheck.adapter.spec.ts
describe('HealthCheckAdapter', () => {
  describe('checkDatabase', () => {
    it('Given: healthy database When: checking database health Then: should return true', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      // Act
      const result = await adapter.checkDatabase();

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith('SELECT 1');
    });
  });
});
```

### **4. Tests Unitarios (Interface Layer)**

```typescript
// test/interfaces/http/healthCheck/healthCheck.controller.spec.ts
describe('HealthCheckController', () => {
  describe('getBasicHealth', () => {
    it('Given: healthy service response When: getting basic health Then: should return basic health status', async () => {
      // Arrange
      const mockResult: HealthCheckResult = {
        /* ... */
      };
      mockHealthCheckService.getBasicHealth.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getBasicHealth();

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockHealthCheckService.getBasicHealth).toHaveBeenCalledTimes(1);
    });
  });
});
```

## 🎯 Beneficios de esta Estructura

### **1. Claridad**

- **AAA**: Separación clara de responsabilidades en cada test
- **Given-When-Then**: Descripción natural del comportamiento esperado

### **2. Mantenibilidad**

- **Estructura consistente**: Fácil de navegar y entender
- **Descriptive names**: Self-documenting code

### **3. Debugging**

- **Fácil identificación**: Problemas claramente identificables
- **Contexto claro**: Cada test tiene su propio contexto

### **4. Colaboración**

- **Lenguaje común**: Equipo puede entender tests fácilmente
- **Living documentation**: Tests as behavior specification

## 🚀 Ejecución de Tests

### **Tests Unitarios**

```bash
# Ejecutar todos los tests unitarios
bun run test

# Ejecutar tests específicos
bun run test test/shared/domain/healthCheck.service.spec.ts

# Ejecutar tests con coverage
bun run test:cov
```

### **Tests End-to-End**

```bash
# Ejecutar tests e2e
bun run test:e2e

# Ejecutar tests e2e específicos
bun run test:e2e healthCheck.e2e-spec.ts
```

### **Tests de Integración**

```bash
# Ejecutar tests de integración
bun run test:integration
```

## 📊 Cobertura de Tests

### **Métricas Objetivo**

- **Statements**: > 80%
- **Branches**: > 80%
- **Functions**: > 80%
- **Lines**: > 80%

### **Reportes**

```bash
# Generar reporte HTML
bun run test:cov

# Ver en navegador
open coverage/lcov-report/index.html
```

## 🔍 Mejores Prácticas

### **1. Organización**

- **Un test por comportamiento**: Cada test debe verificar una cosa
- **Agrupación lógica**: Usar `describe` para agrupar tests relacionados
- **Orden de ejecución**: Tests independientes entre sí

### **2. Mocks y Stubs**

- **Mocks realistas**: Simular comportamiento real de dependencias
- **Cleanup**: Restaurar estado después de cada test
- **Verificación**: Verificar que mocks fueron llamados correctamente

### **3. Datos de Test**

- **Datos representativos**: Usar datos que reflejen casos reales
- **Casos edge**: Incluir casos límite y de error
- **Consistencia**: Mantener datos consistentes entre tests

### **4. Naming**

- **Descriptivo**: Nombres que expliquen qué se está probando
- **Consistente**: Seguir convenciones establecidas
- **Legible**: Fácil de entender para otros desarrolladores

## 📚 Ejemplos Completos

### **Test Completo de Dominio**

```typescript
describe('Health Check Domain Service', () => {
  describe('determineOverallStatus', () => {
    it('Given: healthy basic status, healthy database and system, all healthy services When: determining overall status Then: should return healthy', () => {
      // Arrange
      const basicStatus: HealthStatus = 'healthy';
      const database = true;
      const system = true;
      const services: Record<string, HealthStatus> = {
        database: 'healthy',
        system: 'healthy',
        api: 'healthy',
      };

      // Act
      const result = determineOverallStatus(basicStatus, database, system, services);

      // Assert
      expect(result).toBe('healthy');
    });
  });
});
```

### **Test Completo de Aplicación**

```typescript
describe('HealthCheckApplicationService', () => {
  describe('getFullHealthCheck', () => {
    it('Given: healthy database and system When: getting full health check Then: should return full health with domain orchestration', async () => {
      // Arrange
      mockHealthCheckPort.checkDatabase.mockResolvedValue(true);
      mockHealthCheckPort.checkSystem.mockResolvedValue(true);

      // Act
      const result = await service.getFullHealthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(mockHealthCheckPort.checkDatabase).toHaveBeenCalled();
      expect(mockHealthCheckPort.checkSystem).toHaveBeenCalled();
    });
  });
});
```

## 🎉 Conclusión

Esta estructura de tests proporciona:

1. **Claridad**: Tests fáciles de entender y mantener
2. **Consistencia**: Estructura uniforme en todo el proyecto
3. **Mantenibilidad**: Fácil de modificar y extender
4. **Colaboración**: Equipo puede trabajar eficientemente
5. **Calidad**: Tests como documentación viva del sistema

Siguiendo estos patrones, el sistema de tests se convierte en una herramienta poderosa para garantizar la calidad y estabilidad del código.
