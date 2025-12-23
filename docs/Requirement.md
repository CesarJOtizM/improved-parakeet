# Requerimiento Funcional

## Ficha Ejecutiva:

| Sección               | Descripción                                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**          | Optimizar el control de inventarios en múltiples bodegas y organizaciones, garantizando trazabilidad, reducción de pérdidas y soporte para la toma de decisiones. |
| **Alcance Funcional** | • Gestión de productos (crear, editar, eliminar, clasificar).• Control de entradas y salidas.                                                                     |

• Movimientos entre bodegas (en tránsito, recibido, rechazado).
• Alertas de stock mínimo/máximo.
• Reportes (disponible, histórico, valorización).• Gestión de usuarios y permisos.
• Importación masiva de productos vía Excel/CSV.
• Integraciones futuras con ERP/facturación. |
| **Requisitos No Funcionales** | • Performance: 200 usuarios concurrentes.• Escalabilidad: 50+ bodegas y 100k productos.
• Seguridad: roles, permisos y auditoría.
• Usabilidad: interfaz clara y responsiva.• Disponibilidad: 99.5% uptime. |
| **Casos de Uso Clave** | • Registrar entradas y salidas de productos.
• Transferencias entre bodegas.• Generar reportes de stock bajo y valorización.
• Importar catálogo de productos desde archivo Excel/CSV. |
| **Actores** | • Administrador (gestión completa).• Operador de bodega (movimientos en su bodega).
• Consultor/Auditor (solo lectura). |
| **Reglas de Negocio** | • No registrar salidas sin stock.• Auditoría obligatoria de movimientos.
• SKU único para productos.
• Transferencias confirmadas por bodega destino.
• Validación obligatoria de estructura en importaciones masivas. |
| **Stack Sugerido (interno)** | • Frontend: React/Next.js.
• Backend: Node.js (REST/GraphQL).
• DB: PostgreSQL o MongoDB
• Auth: Supabase Auth o AWS Cognito.• Hosting: AWS / Supabase / GCP. |

## 1. Objetivo del Sistema

El objetivo del sistema de inventarios es optimizar el control, registro y gestión de existencias en múltiples bodegas y organizaciones, garantizando visibilidad en tiempo real sobre las entradas, salidas, movimientos y disponibilidad de productos.

El sistema busca mejorar la eficiencia operativa, reducir pérdidas por quiebres de stock o sobre-inventario, y facilitar la toma de decisiones a través de reportes confiables y trazables.

---

## 2. Alcance Funcional

El sistema incluirá las siguientes funcionalidades principales:

- **Gestión de productos**: permite crear, editar, eliminar y clasificar productos por categorías, familias o proyectos. Cada producto contará con atributos como código, nombre, descripción, SKU, unidad de medida, costo y precio de referencia.
- **Control de inventario**: posibilita registrar entradas (compras, devoluciones, ajustes positivos) y salidas (ventas, consumos, ajustes negativos), con actualización automática de stock en la bodega correspondiente.
- **Movimientos entre bodegas**: habilita transferencias de productos entre bodegas o ubicaciones, manejando estados como en tránsito, recibido o rechazado.
- **Alertas de stock**: incluye la definición de mínimos y máximos por producto y bodega, con notificaciones automáticas cuando los umbrales sean superados.
- **Reportes y consultas**: genera reportes de inventario disponible, histórico de movimientos y valorización del inventario. Estos reportes serán exportables a PDF y Excel.
- **Gestión de usuarios y permisos**: ofrece administración de roles y perfiles con accesos diferenciados, controlando acciones por módulo como consultar, registrar o aprobar. El sistema incluye:
  - **Roles predefinidos:** roles del sistema (ADMIN, SUPERVISOR, WAREHOUSE_OPERATOR, CONSULTANT, IMPORT_OPERATOR) disponibles globalmente para todas las organizaciones
  - **Roles personalizados:** cada organización puede crear roles personalizados con permisos específicos según sus necesidades
  - **Permisos granulares:** control de acceso por módulo (USERS, PRODUCTS, WAREHOUSES, MOVEMENTS, etc.) y acción (CREATE, READ, UPDATE, DELETE, etc.)
- **Importación masiva vía Excel/CSV**: permite la carga inicial o actualización de productos desde plantillas prediseñadas. Los campos requeridos son:
  - Ubicación
  - Código
  - Nombre
  - Unidad de medida
  - Cantidad
  - Costo Unitario
  - Costo Total
  - Precio Venta Unitario
  - Precio Venta Total
  El sistema validará estructura, duplicados y datos obligatorios, generando reportes de errores y vista previa antes de confirmar la carga.
- **External integrations**: the system will be prepared to integrate with billing, purchasing or ERP through API, facilitating its extension in the future.

---

## 3. Requisitos No Funcionales

- **Performance:** el sistema soportará al menos 200 usuarios concurrentes con tiempos de respuesta menores a 2 segundos en operaciones críticas.
- **Escalabilidad:** preparado para crecer hasta más de 50 bodegas y 100,000 productos sin pérdida de rendimiento.
- **Seguridad:** contará con autenticación de usuarios bajo estándares modernos, autorización por roles y permisos, además de un registro de auditoría completo.
- **Usabilidad:** dispondrá de una interfaz intuitiva, clara y responsiva, accesible desde escritorio, tablet y móvil, cumpliendo con estándares básicos de accesibilidad.
- **Disponibilidad:** garantizará un uptime mínimo del 99.5% mensual.

---

## 4. Casos de Uso Principales

- **Registrar entrada de productos:** el usuario selecciona el módulo de entradas, escanea o busca el producto, define la bodega de destino, ingresa la cantidad y confirma. El sistema actualiza el stock y registra la operación en la auditoría.
- **Registrar salida de productos:** el usuario accede al módulo de salidas, selecciona el producto, ingresa la cantidad y confirma. El sistema valida el stock disponible, descuenta las existencias y guarda el registro en la auditoría.
- **Transferir productos entre bodegas:** el usuario inicia la transferencia indicando bodega de origen y destino, selecciona productos y cantidades, y el sistema marca el movimiento como “en tránsito”. La bodega destino confirma la recepción para completar el proceso.
- **Generar reporte de stock bajo:** el sistema identifica automáticamente productos por debajo del mínimo definido. El usuario accede al módulo de reportes y obtiene un listado filtrable y exportable en PDF o Excel.
- **Importar catálogo de productos vía Excel/CSV:** el usuario descarga la plantilla oficial, carga el archivo con la estructura requerida, valida la vista previa y confirma la importación. El sistema procesa el archivo, muestra errores en filas inválidas y registra la operación en la auditoría.

---

## 5. Actores del Sistema

### Roles Predefinidos del Sistema

El sistema incluye roles predefinidos (maestros globales) que están disponibles para todas las organizaciones:

- **ADMIN:** Administrador con acceso total a todos los módulos y configuraciones, incluyendo la gestión de usuarios, roles personalizados, permisos y parámetros globales. Puede realizar importaciones masivas.
- **SUPERVISOR:** Supervisor de bodegas con acceso amplio a productos, movimientos, transferencias, stock y reportes. No puede gestionar usuarios ni roles.
- **WAREHOUSE_OPERATOR:** Operador de bodega que puede registrar entradas, salidas y transferencias, con acceso restringido únicamente a la(s) bodega(s) asignada(s). Puede realizar importaciones si está habilitado.
- **CONSULTANT:** Consultor/Auditor con acceso de solo lectura a reportes, movimientos históricos y resultados de importaciones, sin posibilidad de modificar datos.
- **IMPORT_OPERATOR:** Operador especializado en importaciones masivas, con acceso a productos y reportes básicos.

### Roles Personalizados

Las organizaciones pueden crear roles personalizados con permisos específicos según sus necesidades. Los roles personalizados:
- Solo están disponibles dentro de la organización que los crea
- Pueden tener cualquier combinación de permisos del sistema
- Pueden ser actualizados o eliminados por administradores de la organización
- No pueden eliminarse si están asignados a usuarios

### Rol Especial de Sistema

- **SYSTEM_ADMIN:** Rol de sistema que trasciende organizaciones. Puede crear nuevas organizaciones y tiene acceso total al sistema completo. No se crea automáticamente, se asigna manualmente.

---

## 6. Restricciones y Reglas de Negocio

- No se pueden registrar salidas si el stock disponible es insuficiente.
- Todos los movimientos de inventario deben quedar registrados en la auditoría con fecha, usuario y acción realizada.
- Los productos deben contar con un código único (SKU) para evitar duplicados.
- Las transferencias entre bodegas solo se completan cuando la bodega de destino confirma la recepción.
- Los niveles mínimos y máximos deben definirse por producto y bodega.
- En las importaciones masivas, el archivo debe incluir todos los campos obligatorios, y el sistema validará la consistencia de los datos (p. ej., que Costo Total = Cantidad × Costo Unitario).

---

## 7. Stack Tecnológico Sugerido (nota interna)

- **Frontend:** React o Next.js
- **Backend:** Node.js with GraphQL or REST API
- **Base de Datos:** PostgreSQL (relacional) o MongoDB (documental)
- **Autenticación y Autorización:** Supabase Auth o AWS Cognito
- **Infraestructura / Hosting:** AWS, Supabase o Google Cloud, según análisis de costo-beneficio

---

📌 **Nota:** Este documento define el alcance funcional y técnico inicial para un **MVP** del sistema de inventarios. Futuras versiones podrán ampliar integraciones externas, automatización avanzada o inteligencia de reportes.
