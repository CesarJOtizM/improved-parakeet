#!/bin/bash

echo "🚀 Configurando entorno de desarrollo para Sistema de Inventarios..."

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está corriendo. Por favor inicia Docker y vuelve a intentar."
    exit 1
fi

# Verificar que Docker Compose esté disponible
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está disponible. Por favor instálalo y vuelve a intentar."
    exit 1
fi

echo "✅ Docker y Docker Compose están disponibles"

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cp .env.example .env
    echo "✅ Archivo .env creado. Por favor revisa y ajusta las variables según tu entorno."
else
    echo "✅ Archivo .env ya existe"
fi

# Iniciar servicios de base de datos
echo "🐘 Iniciando PostgreSQL y Redis..."
docker-compose up -d postgres redis

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Verificar que PostgreSQL esté funcionando
if docker-compose exec -T postgres pg_isready -U inventory_user -d inventory_system; then
    echo "✅ PostgreSQL está funcionando correctamente"
else
    echo "❌ Error al conectar con PostgreSQL"
    exit 1
fi

# Verificar que Redis esté funcionando
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis está funcionando correctamente"
else
    echo "❌ Error al conectar con Redis"
    exit 1
fi

# Instalar dependencias si no están instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    echo "✅ Dependencias instaladas"
else
    echo "✅ Dependencias ya están instaladas"
fi

# Generar cliente de Prisma
echo "🔧 Generando cliente de Prisma..."
npm run db:generate

# Ejecutar migraciones si existen
if [ -d "src/infrastructure/database/migrations" ]; then
    echo "🔄 Ejecutando migraciones..."
    npm run db:migrate:deploy
    echo "✅ Migraciones ejecutadas"
else
    echo "ℹ️  No hay migraciones para ejecutar"
fi

echo ""
echo "🎉 ¡Entorno de desarrollo configurado exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Revisa el archivo .env y ajusta las variables según tu entorno"
echo "   2. Ejecuta 'npm run dev' para iniciar la aplicación"
echo "   3. Ejecuta 'npm run test' para ejecutar los tests"
echo "   4. Ejecuta 'npm run db:studio' para abrir Prisma Studio"
echo ""
echo "🔗 URLs de los servicios:"
echo "   - Aplicación: http://localhost:3000"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "📁 Estructura de Prisma:"
echo "   - Schema: src/infrastructure/database/prisma/schema.prisma"
echo "   - Migraciones: src/infrastructure/database/migrations/"
echo "   - Cliente generado: src/infrastructure/database/generated/prisma/"
echo ""
