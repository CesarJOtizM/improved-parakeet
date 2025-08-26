# 🐳 Docker - Inventory System

Este documento explica cómo usar Docker para el sistema de inventario.

## 📋 **Entornos Disponibles**

### **1. Desarrollo (`docker-compose.dev.yml`)**

- **Propósito**: Desarrollo local completo
- **Incluye**: App NestJS + PostgreSQL + Redis
- **Características**: Hot-reload, debugging, volúmenes montados
- **Uso**: Desarrollo diario, testing local

### **2. Producción (`docker-compose.prod.yml`)**

- **Propósito**: Entorno de producción local
- **Incluye**: App NestJS optimizada + PostgreSQL + Redis
- **Características**: Multi-stage build, optimizaciones, health checks
- **Uso**: Testing de producción, demos

### **3. Infraestructura (`docker-compose.yml`)**

- **Propósito**: Solo servicios de infraestructura
- **Incluye**: PostgreSQL + Redis
- **Características**: Sin aplicación, para CI/CD
- **Uso**: Testing, CI/CD, cuando solo necesites la DB

## 🚀 **Comandos Rápidos**

### **Usando el Script de Docker**

```bash
# Desarrollo completo
./scripts/docker.sh dev

# Producción completa
./scripts/docker.sh prod

# Solo infraestructura
./scripts/docker.sh infra

# Detener todo
./scripts/docker.sh down

# Limpiar todo
./scripts/docker.sh clean

# Ver estado
./scripts/docker.sh status

# Ver logs
./scripts/docker.sh logs
```

### **Usando npm/bun**

```bash
# Desarrollo
bun run docker:dev

# Producción
bun run docker:prod

# Solo infraestructura
bun run docker:infra

# Detener
bun run docker:down

# Limpiar
bun run docker:clean

# Estado
bun run docker:status
```

## 🔧 **Configuración de Entornos**

### **Variables de Entorno**

```bash
# Desarrollo
NODE_ENV=development
BUN_ENV=development
DATABASE_URL=postgresql://inventory_user:inventory_password@postgres:5432/inventory_system?schema=public
REDIS_URL=redis://redis:6379

# Producción
NODE_ENV=production
BUN_ENV=production
DATABASE_URL=postgresql://inventory_user:inventory_password@postgres:5432/inventory_system?schema=public
REDIS_URL=redis://redis:6379
```

### **Puertos**

- **App NestJS**: 3000
- **PostgreSQL**: 5432
- **Redis**: 6379

## 🏗️ **Dockerfiles**

### **Desarrollo (`docker/dev.Dockerfile`)**

- **Base**: `oven/bun:1-alpine`
- **Optimizado para**: Hot-reload, debugging
- **Volúmenes**: Código fuente montado
- **Comando**: `bun run start:dev`

### **Producción (`docker/prod.Dockerfile`)**

- **Base**: `oven/bun:1-alpine` (multi-stage)
- **Optimizado para**: Tamaño mínimo, seguridad
- **Usuario**: `nestjs` (no-root)
- **Health checks**: Incluidos
- **Comando**: `bun run start:prod`

## 📊 **Monitoreo y Logs**

### **Health Checks**

```yaml
# PostgreSQL
test: ['CMD-SHELL', 'pg_isready -U inventory_user -d inventory_system']
interval: 10s
timeout: 5s
retries: 5

# Redis
test: ['CMD', 'redis-cli', 'ping']
interval: 10s
timeout: 5s
retries: 5
```

### **Ver Logs**

```bash
# Todos los servicios
docker-compose logs -f

# Servicio específico
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis
```

## 🧹 **Mantenimiento**

### **Limpiar Contenedores**

```bash
# Detener y eliminar contenedores
./scripts/docker.sh clean

# O manualmente
docker-compose down -v --remove-orphans
docker system prune -f
```

### **Reconstruir Imágenes**

```bash
# Reconstruir desarrollo
docker-compose -f docker-compose.dev.yml build --no-cache

# Reconstruir producción
docker-compose -f docker-compose.prod.yml build --no-cache
```

## 🔍 **Troubleshooting**

### **Problemas Comunes**

#### **Puerto ya en uso**

```bash
# Ver qué está usando el puerto
lsof -i :3000
lsof -i :5432
lsof -i :6379

# Detener proceso
kill -9 <PID>
```

#### **Volúmenes corruptos**

```bash
# Limpiar volúmenes
./scripts/docker.sh clean

# O manualmente
docker volume rm inventory_system_postgres_dev_data
docker volume rm inventory_system_redis_dev_data
```

#### **Permisos de archivos**

```bash
# Hacer ejecutable el script
chmod +x scripts/docker.sh
```

## 📚 **Recursos Adicionales**

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Bun Docker Images](https://hub.docker.com/r/oven/bun)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [Redis Docker](https://hub.docker.com/_/redis)

## 🤝 **Contribución**

Para agregar nuevos servicios o modificar la configuración:

1. **Actualiza** el archivo correspondiente
2. **Modifica** el script `scripts/docker.sh` si es necesario
3. **Actualiza** esta documentación
4. **Prueba** en todos los entornos
5. **Commit** los cambios
