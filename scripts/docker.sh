#!/bin/bash

# Script para gestionar entornos de Docker
# Uso: ./scripts/docker.sh [dev|prod|infra|down|clean]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}Script de gestión de Docker para Inventory System${NC}"
    echo ""
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  dev     - Levanta entorno de desarrollo completo (app + infraestructura)"
    echo "  prod    - Levanta entorno de producción completo (app + infraestructura)"
    echo "  infra   - Levanta solo infraestructura (PostgreSQL + Redis)"
    echo "  down    - Detiene todos los contenedores"
    echo "  clean   - Detiene y elimina todos los contenedores, volúmenes y redes"
    echo "  logs    - Muestra logs de todos los servicios"
    echo "  status  - Muestra estado de todos los servicios"
    echo ""
    echo "Ejemplos:"
    echo "  $0 dev     # Desarrollo local"
    echo "  $0 prod    # Producción local"
    echo "  $0 infra   # Solo base de datos y cache"
}

# Función para desarrollo
start_dev() {
    echo -e "${GREEN}🚀 Iniciando entorno de desarrollo...${NC}"
    docker compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}✅ Entorno de desarrollo iniciado!${NC}"
    echo -e "${BLUE}📱 App disponible en: http://localhost:3000${NC}"
    echo -e "${BLUE}🗄️  PostgreSQL en: localhost:5432${NC}"
    echo -e "${BLUE}🔴 Redis en: localhost:6379${NC}"
}

# Función para producción
start_prod() {
    echo -e "${GREEN}🚀 Iniciando entorno de producción...${NC}"
    docker compose -f docker-compose.prod.yml up -d
    echo -e "${GREEN}✅ Entorno de producción iniciado!${NC}"
    echo -e "${BLUE}📱 App disponible en: http://localhost:3000${NC}"
}

# Función para infraestructura
start_infra() {
    echo -e "${GREEN}🚀 Iniciando solo infraestructura...${NC}"
    docker compose up -d
    echo -e "${GREEN}✅ Infraestructura iniciada!${NC}"
    echo -e "${BLUE}🗄️  PostgreSQL en: localhost:5432${NC}"
    echo -e "${BLUE}🔴 Redis en: localhost:6379${NC}"
}

# Función para detener
stop_all() {
    echo -e "${YELLOW}🛑 Deteniendo todos los contenedores...${NC}"
    docker compose down
    docker compose -f docker-compose.dev.yml down
    docker compose -f docker-compose.prod.yml down
    echo -e "${GREEN}✅ Todos los contenedores detenidos!${NC}"
}

# Función para limpiar
clean_all() {
    echo -e "${YELLOW}🧹 Limpiando todo...${NC}"
    docker compose down -v --remove-orphans
    docker compose -f docker-compose.dev.yml down -v --remove-orphans
    docker compose -f docker-compose.prod.yml down -v --remove-orphans
    docker system prune -f
    echo -e "${GREEN}✅ Todo limpiado!${NC}"
}

# Función para logs
show_logs() {
    echo -e "${BLUE}📋 Mostrando logs...${NC}"
    docker compose logs -f
}

# Función para status
show_status() {
    echo -e "${BLUE}📊 Estado de los servicios:${NC}"
    docker compose ps
    echo ""
    echo -e "${BLUE}📊 Estado de desarrollo:${NC}"
    docker compose -f docker-compose.dev.yml ps
    echo ""
    echo -e "${BLUE}📊 Estado de producción:${NC}"
    docker compose -f docker-compose.dev.yml ps
}

# Función principal
main() {
    case "${1:-}" in
        "dev")
            start_dev
            ;;
        "prod")
            start_prod
            ;;
        "infra")
            start_infra
            ;;
        "down")
            stop_all
            ;;
        "clean")
            clean_all
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Comando no válido: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"
