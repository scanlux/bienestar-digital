const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });
const ledger = require('../services/domi-kernel/ledger');

const rbacData = {
  "categories": [
    {
      "id": 1,
      "name": "Seguridad",
      "description": "Bitácora de auditoría y gestión de roles",
      "created_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 2,
      "name": "Afiliaciones",
      "description": "Registro y aprobación de comercios y delivery",
      "created_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 3,
      "name": "Catálogo Maestro",
      "description": "Gestión de comercios, sedes y catálogos globales",
      "created_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 4,
      "name": "Operaciones",
      "description": "Pedidos, asignaciones y gestión de personal de sedes",
      "created_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 5,
      "name": "Videos/Reels",
      "description": "Subida y gestión de videos",
      "created_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 6,
      "name": "Planes",
      "description": "Suscripciones y planes de comercios",
      "created_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 7,
      "name": "Inteligencia",
      "description": "Estadísticas, autotagging y stop-words",
      "created_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 8,
      "name": "Finanzas DOMI",
      "description": "Libro mayor y compra/gasto de DOMIs",
      "created_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 9,
      "name": "Logística",
      "description": "Gestión de repartidores",
      "created_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 11,
      "name": "Acceso UI",
      "description": "Permisos de acceso a secciones de la interfaz por layout",
      "created_at": "2026-07-12T12:00:00.000Z"
    }
  ],
  "permissions": [
    {
      "id": 1,
      "category_id": 1,
      "name": "view_security_logs",
      "description": "Ver bitácora de auditoría",
      "display_name": "Ver Bitácora de Seguridad",
      "criticidad": "Media",
      "tipo": "Lectura",
      "scope": "Permite auditar accesos e intentos de intrusión, pero expone metadatos de IP y actividades de otros administradores.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 2,
      "category_id": 1,
      "name": "manage_rbac",
      "description": "Gestionar roles y permisos del sistema",
      "display_name": "Gestionar Roles y Permisos (RBAC)",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Máximo privilegio de autorización. Permite alterar la matriz de acceso de cualquier rol e indirectamente escalar privilegios. Protegido en DB por triggers.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 3,
      "category_id": 1,
      "name": "create_system_user",
      "description": "Crear personal administrativo del sistema",
      "display_name": "Crear Usuario de Sistema",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Permite dar de alta a nuevos empleados en la casa matriz con roles de sistema.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 8,
      "category_id": 3,
      "name": "view_commerces",
      "description": "Ver lista y detalle de comercios",
      "display_name": "Ver Comercios",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Visualización de información comercial y cuentas vinculadas.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 9,
      "category_id": 3,
      "name": "create_commerce",
      "description": "Crear nuevo comercio",
      "display_name": "Crear Comercio",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Creación directa de comercios asociados a administradores sin pasar por solicitudes.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 10,
      "category_id": 3,
      "name": "edit_commerce",
      "description": "Editar datos de comercio",
      "display_name": "Editar Comercio",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite modificar datos fiscales, teléfonos y estado operacional (activo/inactivo) de un comercio. El NIT se valida como inmutable.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 11,
      "category_id": 3,
      "name": "view_stores",
      "description": "Ver lista y detalle de sedes",
      "display_name": "Ver Sedes",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Lectura de sucursales físicas asociadas a comercios.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 12,
      "category_id": 3,
      "name": "create_store",
      "description": "Crear nueva sede",
      "display_name": "Crear Sede",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Registra una nueva sucursal comercial y asocia/crea su administrador. Requiere matrícula mercantil única.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 13,
      "category_id": 3,
      "name": "edit_store",
      "description": "Editar datos de sede",
      "display_name": "Editar Sede",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite modificar datos básicos y configuraciones operativas de la sede.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 14,
      "category_id": 3,
      "name": "view_catalog",
      "description": "Ver menús, categorías y productos",
      "display_name": "Ver Catálogo Global",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Acceso de lectura al catálogo global de productos y menús.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 15,
      "category_id": 3,
      "name": "manage_catalog",
      "description": "Gestionar menús, categorías y productos",
      "display_name": "Gestionar Catálogo",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite crear, editar y estructurar categorías y productos en el catálogo principal.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 16,
      "category_id": 3,
      "name": "manage_store_catalog",
      "description": "Gestionar disponibilidad y precios por sede",
      "display_name": "Gestionar Catálogo de Sede",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite activar/desactivar ítems de stock y ajustar precios de manera exclusiva para la sucursal física.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 17,
      "category_id": 3,
      "name": "clone_store_catalog",
      "description": "Clonar el catálogo completo de otra sede",
      "display_name": "Clonar Catálogo de Sede",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite copiar toda la estructura de productos y menús de una sede a otra del mismo comercio.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 18,
      "category_id": 4,
      "name": "view_orders",
      "description": "Ver pedidos de la sede",
      "display_name": "Ver Pedidos",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Permite consultar el flujo de comandas entrantes.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 19,
      "category_id": 4,
      "name": "manage_orders",
      "description": "Gestionar estados de pedidos",
      "display_name": "Gestionar Pedidos",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite aceptar, despachar o cancelar pedidos de clientes, impactando el flujo operativo de los repartidores.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 20,
      "category_id": 4,
      "name": "view_store_admins",
      "description": "Ver administradores de sede",
      "display_name": "Ver Admins de Sede",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Consulta de gerentes a cargo de cada sucursal.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 21,
      "category_id": 4,
      "name": "manage_store_admins",
      "description": "Gestionar administradores de sede",
      "display_name": "Gestionar Admins de Sede",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Creación de cuentas y control operativo de acceso de los operadores de sede.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 22,
      "category_id": 4,
      "name": "manage_order_acceptance",
      "description": "Gestionar modo de aceptación de pedidos",
      "display_name": "Gestionar Aceptación Automática",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Habilita que el backend asigne repartidores y apruebe de forma automatizada los pedidos.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 23,
      "category_id": 5,
      "name": "upload_videos",
      "description": "Subir y activar videos",
      "display_name": "Subir Videos Publicitarios",
      "criticidad": "Baja",
      "tipo": "Escritura",
      "scope": "Gestión del contenido multimedia publicitario visible en la App Móvil.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 24,
      "category_id": 5,
      "name": "delete_videos",
      "description": "Eliminar videos",
      "display_name": "Eliminar Videos Publicitarios",
      "criticidad": "Baja",
      "tipo": "Escritura",
      "scope": "Remoción de videos promocionales del feed público.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 25,
      "category_id": 6,
      "name": "manage_plans",
      "description": "Contratar y gestionar planes",
      "display_name": "Gestionar Planes",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite suscribirse a módulos Premium y gestionar la facturación del comercio.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:47.000Z"
    },
    {
      "id": 26,
      "category_id": 7,
      "name": "view_analytics",
      "description": "Ver estadísticas y popularidad",
      "display_name": "Ver Analíticas y Popularidad",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Visualización de métricas de ventas agregadas para inteligencia comercial.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 27,
      "category_id": 7,
      "name": "manage_intelligence",
      "description": "Gestionar autotags y stop-words",
      "display_name": "Gestionar Inteligencia y Stop Words",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Configuración del indexador semántico y limpieza de palabras clave en productos.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 28,
      "category_id": 8,
      "name": "view_ledger",
      "description": "Ver libro mayor y balance del sistema",
      "display_name": "Ver Libro Mayor",
      "criticidad": "Alta",
      "tipo": "Lectura",
      "scope": "Lectura de saldos, movimientos y acuñación global de tokens. Privilegio de auditoría.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 29,
      "category_id": 8,
      "name": "purchase_domis",
      "description": "Comprar/Acuñar tokens DOMI",
      "display_name": "Comprar/Acuñar Tokens DOMI",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Permite emitir tokens del ecosistema. Afecta directamente el valor financiero circulante.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 30,
      "category_id": 8,
      "name": "spend_domis",
      "description": "Gastar tokens DOMI",
      "display_name": "Gastar Tokens DOMI",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Operación transaccional clave de débito de billetera del cliente a favor del comercio/repartidor.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 31,
      "category_id": 8,
      "name": "withdraw_domis",
      "description": "Retirar tokens DOMI (máximo privilegio)",
      "display_name": "Retirar/Fiar Tokens DOMI",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Máximo privilegio financiero. Permite transferir capital fuera del libro mayor transaccional.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 32,
      "category_id": 9,
      "name": "manage_drivers",
      "description": "Gestionar repartidores de la empresa de mensajería",
      "display_name": "Gestionar Repartidores",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite afiliar repartidores a empresas de mensajería para asignación de domicilios.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 33,
      "category_id": 10,
      "name": "use_ai_generation",
      "description": "Usar Gemini para generación de textos",
      "display_name": "Usar Generación por IA",
      "criticidad": "Baja",
      "tipo": "Escritura",
      "scope": "Utiliza el consumo de cuotas del backend para invocar a Gemini.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 38,
      "category_id": 8,
      "name": "transfer_domis",
      "description": "Transferir saldo en tokens DOMI a otras cuentas del ecosistema",
      "display_name": "Transferir DOMIs",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Permite transferencias internas de tokens DOMI entre billeteras de usuarios.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:45.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 39,
      "category_id": 8,
      "name": "pay_subscriptions_domis",
      "description": "Pagar suscripciones de servicios especiales utilizando tokens DOMI",
      "display_name": "Pagar Suscripciones con DOMIs",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Permite el pago de planes de suscripción utilizando tokens DOMI.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:45.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 40,
      "category_id": 8,
      "name": "mint_manual_domis",
      "description": "Acuñar tokens DOMI de forma manual en representación de dinero fiduciario captado",
      "display_name": "Acuñar Manualmente DOMIs",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Permite la emisión y acreditación directa de tokens DOMI a billeteras específicas.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:45.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 41,
      "category_id": 8,
      "name": "burn_manual_domis",
      "description": "Quemar tokens DOMI para retiro o reembolso de dinero fiduciario por operador autorizado",
      "display_name": "Quemar Manualmente DOMIs",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Permite la destrucción manual de tokens DOMI en billeteras específicas para ajustes de contabilidad.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:45.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 43,
      "category_id": 8,
      "name": "view_cash_vault",
      "description": "Permite ver el saldo y transacciones de caja física",
      "display_name": "Ver Bóveda de Efectivo",
      "criticidad": "Alta",
      "tipo": "Lectura",
      "scope": "Permite ver saldos y transacciones físicas en efectivo.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:45.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 44,
      "category_id": 8,
      "name": "manage_cash_vault",
      "description": "Permite registrar entradas, salidas y ajustes de arqueo en caja",
      "display_name": "Gestionar Bóveda de Efectivo",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Permite registrar transacciones y movimientos en efectivo físico.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:45.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 45,
      "category_id": 8,
      "name": "register_bank_deposit",
      "description": "Permite reportar consignaciones bancarias pendientes",
      "display_name": "Registrar Depósito Bancario",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Permite ingresar registros de consignaciones bancarias pendientes de conciliación.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:45.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 46,
      "category_id": 8,
      "name": "reconcile_bank_deposit",
      "description": "Permite aprobar consignaciones bancarias y acuñar DOMIs",
      "display_name": "Conciliar Depósito Bancario",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Permite aprobar y conciliar depósitos bancarios de efectivo.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:45.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 47,
      "category_id": 2,
      "name": "manage_registration_requests",
      "description": "Permite ver, aprobar y rechazar solicitudes de registro de comercios",
      "display_name": "Gestionar Solicitudes de Afiliación",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Permite leer, aprobar, rechazar e invitar solicitudes de registro de comercios y delivery de forma consolidada.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:45.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 48,
      "category_id": 2,
      "name": "view_upgrades_market",
      "description": "Permite ver el mercado de mejoras y estados de buffs",
      "display_name": "Ver Mercado de Mejoras",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Permite ver el mercado de mejoras y estados de buffs.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:46.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 49,
      "category_id": 2,
      "name": "purchase_upgrades",
      "description": "Permite adquirir mejoras utilizando tokens DOMI",
      "display_name": "Adquirir Mejoras",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite adquirir mejoras utilizando tokens DOMI.",
      "ui_restriction_mode": "ghost",
      "created_at": "2026-07-02T02:51:46.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 50,
      "category_id": 8,
      "name": "suspend_withdrawals",
      "description": "Permite suspender o habilitar globalmente los retiros de DOMIs por dinero real.",
      "display_name": "Suspender Retiros Globales",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Permite suspender o habilitar globalmente los retiros de DOMIs por dinero real. Solo aplicable para el rol root.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:47.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 51,
      "category_id": 2,
      "name": "manage_email_templates",
      "description": "Crear, leer y editar plantillas de correo electronico del sistema",
      "display_name": "Gestionar Plantillas de Correo",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite crear, leer y actualizar las plantillas de correo electrónico transaccionales del sistema.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:48.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 52,
      "category_id": 1,
      "name": "manage_upgrades_catalog",
      "description": "Permite al root ver todas las mejoras del ecosistema, editar el catalogo (precios, duraciones), otorgar mejoras manualmente y revocarlas.",
      "display_name": "Administrar Catálogo de Mejoras",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Permite al root editar el catálogo de mejoras (precios, duraciones, activación), listar todas las mejoras del ecosistema, otorgar mejoras manuales sin cobro y revocar mejoras activas. Cada operación queda registrada en security_audit_logs.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 53,
      "category_id": 8,
      "name": "manage_domi_peg",
      "description": "Permiso de tesoreria: manage_domi_peg",
      "display_name": "Gestionar Paridad DOMI (Treasury)",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Permite regular las tasas, reglas de paridad y compra de excesos de DOMIs en la tesorería.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 54,
      "category_id": 8,
      "name": "view_domi_pricing",
      "description": "Permiso de tesoreria: view_domi_pricing",
      "display_name": "Ver Precios y Estado de Tesorería",
      "criticidad": "Media",
      "tipo": "Lectura",
      "scope": "Visualización de estados financieros, reservas y tasas de cambio en la tesorería.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 55,
      "category_id": 8,
      "name": "approve_withdrawals",
      "description": "Permiso de tesoreria: approve_withdrawals",
      "display_name": "Aprobar Retiros de Tesorería",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Aprobación manual y despacho de transferencias financieras de retiro de fondos.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 56,
      "category_id": 1,
      "name": "view_maintenance_status",
      "description": "Ver Estado Mantenimiento",
      "display_name": "Ver Estado Mantenimiento",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Ver el estado de diagnósticos del sistema y si está activo el modo mantenimiento.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 57,
      "category_id": 1,
      "name": "manage_maintenance",
      "description": "Gestionar Mantenimiento",
      "display_name": "Gestionar Mantenimiento",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Activar o desactivar el modo mantenimiento del sistema, así como realizar una revocación crítica global (pánico).",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 58,
      "category_id": 1,
      "name": "view_system_logs",
      "description": "Ver Logs del Sistema",
      "display_name": "Ver Logs del Sistema",
      "criticidad": "Alta",
      "tipo": "Lectura",
      "scope": "Lectura directa de las últimas líneas del archivo combined.log del backend.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 59,
      "category_id": 3,
      "name": "edit_store_basic",
      "description": "Editar Datos Básicos Sede",
      "display_name": "Editar Datos Básicos Sede",
      "criticidad": "Baja",
      "tipo": "Escritura",
      "scope": "Editar datos básicos de la sede (Teléfonos, foto, horarios, estado y fecha de regreso)",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 60,
      "category_id": 3,
      "name": "edit_store_advanced",
      "description": "Editar Datos Avanzados Sede",
      "display_name": "Editar Datos Avanzados Sede",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Editar datos avanzados de la sede (Nombres/apellidos del admin, dirección, geolocalización, billeteras y cuentas bancarias)",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 61,
      "category_id": 3,
      "name": "enable_store_catalog",
      "description": "Habilitar Catálogo en Sede",
      "display_name": "Habilitar Catálogo en Sede",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Habilitar menús y categorías para la sede",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 62,
      "category_id": 3,
      "name": "write_catalog",
      "description": "Crear/Editar Catálogo",
      "display_name": "Crear/Editar Catálogo",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Crear y editar menús, categorías y productos",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 63,
      "category_id": 3,
      "name": "delete_catalog",
      "description": "Eliminar Catálogo",
      "display_name": "Eliminar Catálogo",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Eliminar menús, categorías y productos",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 64,
      "category_id": 8,
      "name": "checkout_domis",
      "description": "Iniciar Pago Wompi para DOMIs",
      "display_name": "Iniciar Pago Wompi para DOMIs",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Permite que un usuario autenticado genere una sesión de pago firmada con SHA256 en Wompi para acuñar DOMIs en su propia billetera.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 65,
      "category_id": 8,
      "name": "manage_protocol_rules",
      "description": "Gestionar Reglas de Protocolo",
      "display_name": "Gestionar Reglas de Protocolo",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Permite configurar los parámetros del protocolo financiero del token y el backend.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 66,
      "category_id": 8,
      "name": "declare_domi_reserve",
      "description": "Declarar Reserva de Tesorería",
      "display_name": "Declarar Reserva de Tesorería",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Permite registrar el respaldo oficial en fiat de los tokens en circulación.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 67,
      "category_id": 8,
      "name": "mint_domi_cash",
      "description": "Minar Efectivo DOMI (Treasury)",
      "display_name": "Minar Efectivo DOMI (Treasury)",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Emisión masiva de tokens para liquidez de tesorería.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 68,
      "category_id": 8,
      "name": "confirm_domi_reserve",
      "description": "Confirmar Reserva DOMI (Treasury)",
      "display_name": "Confirmar Reserva DOMI (Treasury)",
      "criticidad": "Crítica",
      "tipo": "Escritura",
      "scope": "Confirmación final de respaldo fiat y liberación de paquetes de liquidez.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:51.000Z",
      "updated_at": "2026-07-02T02:51:51.000Z"
    },
    {
      "id": 70,
      "category_id": 9,
      "name": "accept_delivery_orders",
      "description": "Aceptar y gestionar pedidos de reparto",
      "display_name": "Aceptar Pedidos de Reparto",
      "criticidad": "Media",
      "tipo": "Escritura",
      "scope": "Permite aceptar pedidos en estado Listo y asignar repartidores afiliados a la empresa de reparto, debitando la comisión corporativa.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-02T02:51:55.000Z",
      "updated_at": "2026-07-02T02:51:55.000Z"
    },
    {
      "id": 74,
      "category_id": 8,
      "name": "view_store_financial_summary",
      "description": "Ver resumen financiero e historial de movimientos de la propia sede",
      "display_name": "Ver Resumen Financiero Sede",
      "criticidad": "Media",
      "tipo": "Lectura",
      "scope": "Permite acceder a los reportes financieros históricos y balance de wallet de la sucursal.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T03:00:00.000Z",
      "updated_at": "2026-07-12T03:00:00.000Z"
    },
    {
      "id": 75,
      "category_id": 8,
      "name": "view_delivery_financial_summary",
      "description": "Ver resumen financiero e historial de movimientos de la propia empresa de reparto",
      "display_name": "Ver Resumen Financiero Delivery",
      "criticidad": "Media",
"tipo": "Lectura",
      "scope": "Permite acceder a los reportes financieros históricos y balance de wallet de la empresa de mensajería.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T03:00:00.000Z",
      "updated_at": "2026-07-12T03:00:00.000Z"
    },
    {
      "id": 76,
      "category_id": 11,
      "name": "access_commerce_dashboard",
      "description": "Acceso al panel principal del comercio",
      "display_name": "Acceso al Panel del Comercio",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Permite acceder y visualizar el dashboard principal del comercio.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 77,
      "category_id": 11,
      "name": "access_store_dashboard",
      "description": "Acceso al panel principal de la sede física",
      "display_name": "Acceso al Panel de Mi Sede",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Permite acceder y visualizar el dashboard principal de la sede física asignada.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 78,
      "category_id": 11,
      "name": "access_delivery_dashboard",
      "description": "Acceso al panel principal de la empresa de mensajería",
      "display_name": "Acceso al Panel de Delivery",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Permite acceder y visualizar el dashboard de la empresa de delivery.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 79,
      "category_id": 11,
      "name": "access_admin_dashboard",
      "description": "Acceso al panel principal de administración del sistema",
      "display_name": "Acceso al Panel de Administración",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Permite acceder al panel central de administración (Superadmin).",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 80,
      "category_id": 11,
      "name": "view_commerce_wallet",
      "description": "Ver billetera global del comercio",
      "display_name": "Ver Billetera del Comercio",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Permite ver el saldo y movimientos de la billetera del comercio.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 81,
      "category_id": 11,
      "name": "view_store_wallet",
      "description": "Ver billetera de la sede física",
      "display_name": "Ver Billetera de Sede",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Permite ver el saldo y movimientos de la billetera de la sede física.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 82,
      "category_id": 11,
      "name": "view_delivery_wallet",
      "description": "Ver billetera de la empresa de mensajería",
      "display_name": "Ver Billetera de Delivery",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Permite ver el saldo y movimientos de la billetera de la empresa de delivery.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 83,
      "category_id": 11,
      "name": "view_commerce_stores_menu",
      "description": "Acceso al menú de administración de sedes del comercio",
      "display_name": "Administrar Sedes del Comercio",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Habilita la opción de menú para listar y crear sedes físicas asociadas.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 84,
      "category_id": 11,
      "name": "view_commerce_profile",
      "description": "Ver perfil general del comercio",
      "display_name": "Ver Perfil del Comercio",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Habilita el acceso para ver y editar la información del perfil del comercio.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 85,
      "category_id": 11,
      "name": "view_store_profile",
      "description": "Ver perfil general de la sede física",
      "display_name": "Ver Perfil de la Sede",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Habilita el acceso para ver y configurar los datos de la sede física asignada.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 86,
      "category_id": 11,
      "name": "view_store_catalog_menu",
      "description": "Acceso al menú de gestión de catálogo de productos de sede",
      "display_name": "Ver Gestión de Catálogo",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Habilita la opción de menú de catálogo de productos en el perfil de la sede.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 87,
      "category_id": 11,
      "name": "view_delivery_drivers_menu",
      "description": "Acceso al menú de gestión de repartidores afiliados",
      "display_name": "Ver Gestión de Repartidores",
      "criticidad": "Baja",
      "tipo": "Lectura",
      "scope": "Habilita la opción de menú para gestionar y afiliar conductores en la empresa de delivery.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    },
    {
      "id": 88,
      "category_id": 1,
      "name": "manage_system_navigation",
      "description": "Administración y reordenamiento visual de menús de navegación",
      "display_name": "Administrar Navegación del Sistema",
      "criticidad": "Alta",
      "tipo": "Escritura",
      "scope": "Permite configurar de manera visual el ordenamiento y estructura del menú del sistema.",
      "ui_restriction_mode": "hidden",
      "created_at": "2026-07-12T12:00:00.000Z",
      "updated_at": "2026-07-12T12:00:00.000Z"
    }
  ],
  "roles": [
    {
      "id": 1,
      "name": "Super Administrador",
      "code": "root",
      "description": "Acceso total sin restricciones",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 2,
      "name": "Gerente del Sistema",
      "code": "system_manager",
      "description": "Gestión operativa del sistema",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 3,
      "name": "Auditor",
      "code": "auditor",
      "description": "Solo lectura de seguridad y finanzas",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 4,
      "name": "Gerente de Comercio",
      "code": "commerce_manager",
      "description": "Administración total del comercio y sus sedes",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 5,
      "name": "Admin de Sede",
      "code": "store_admin",
      "description": "Administración operativa de una sede",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 6,
      "name": "Admin de Mensajería",
      "code": "delivery_company_admin",
      "description": "Gestión de repartidores",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 7,
      "name": "Operador Completo",
      "code": "operator_full",
      "description": "Operador con acceso a pedidos y catálogo",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 8,
      "name": "Operador de Pedidos",
      "code": "operator_orders",
      "description": "Operador dedicado a despachar pedidos",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 9,
      "name": "Operador de Catálogo",
      "code": "operator_catalog",
      "description": "Operador enfocado en stock de productos",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 10,
      "name": "Cliente",
      "code": "customer",
      "description": "Usuario consumidor final",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    },
    {
      "id": 11,
      "name": "Repartidor",
      "code": "driver",
      "description": "Repartidor de domicilios",
      "is_system": 1,
      "created_at": "2026-07-02T02:51:42.000Z",
      "updated_at": "2026-07-02T02:51:42.000Z"
    }
  ],
  "role_permissions": [
    {
      "role_id": 1,
      "permission_id": 1
    },
    {
      "role_id": 2,
      "permission_id": 1
    },
    {
      "role_id": 3,
      "permission_id": 1
    },
    {
      "role_id": 1,
      "permission_id": 2
    },
    {
      "role_id": 1,
      "permission_id": 3
    },
    {
      "role_id": 1,
      "permission_id": 8
    },
    {
      "role_id": 2,
      "permission_id": 8
    },
    {
      "role_id": 4,
      "permission_id": 8
    },
    {
      "role_id": 1,
      "permission_id": 9
    },
    {
      "role_id": 2,
      "permission_id": 9
    },
    {
      "role_id": 1,
      "permission_id": 10
    },
    {
      "role_id": 2,
      "permission_id": 10
    },
    {
      "role_id": 4,
      "permission_id": 10
    },
    {
      "role_id": 1,
      "permission_id": 11
    },
    {
      "role_id": 2,
      "permission_id": 11
    },
    {
      "role_id": 4,
      "permission_id": 11
    },
    {
      "role_id": 5,
      "permission_id": 11
    },
    {
      "role_id": 1,
      "permission_id": 12
    },
    {
      "role_id": 2,
      "permission_id": 12
    },
    {
      "role_id": 4,
      "permission_id": 12
    },
    {
      "role_id": 1,
      "permission_id": 13
    },
    {
      "role_id": 2,
      "permission_id": 13
    },
    {
      "role_id": 4,
      "permission_id": 13
    },
    {
      "role_id": 1,
      "permission_id": 14
    },
    {
      "role_id": 2,
      "permission_id": 14
    },
    {
      "role_id": 4,
      "permission_id": 14
    },
    {
      "role_id": 5,
      "permission_id": 14
    },
    {
      "role_id": 7,
      "permission_id": 14
    },
    {
      "role_id": 9,
      "permission_id": 14
    },
    {
      "role_id": 1,
      "permission_id": 15
    },
    {
      "role_id": 2,
      "permission_id": 15
    },
    {
      "role_id": 1,
      "permission_id": 16
    },
    {
      "role_id": 2,
      "permission_id": 16
    },
    {
      "role_id": 4,
      "permission_id": 16
    },
    {
      "role_id": 5,
      "permission_id": 16
    },
    {
      "role_id": 7,
      "permission_id": 16
    },
    {
      "role_id": 9,
      "permission_id": 16
    },
    {
      "role_id": 1,
      "permission_id": 17
    },
    {
      "role_id": 2,
      "permission_id": 17
    },
    {
      "role_id": 4,
      "permission_id": 17
    },
    {
      "role_id": 1,
      "permission_id": 18
    },
    {
      "role_id": 2,
      "permission_id": 18
    },
    {
      "role_id": 4,
      "permission_id": 18
    },
    {
      "role_id": 5,
      "permission_id": 18
    },
    {
      "role_id": 7,
      "permission_id": 18
    },
    {
      "role_id": 8,
      "permission_id": 18
    },
    {
      "role_id": 1,
      "permission_id": 19
    },
    {
      "role_id": 2,
      "permission_id": 19
    },
    {
      "role_id": 4,
      "permission_id": 19
    },
    {
      "role_id": 5,
      "permission_id": 19
    },
    {
      "role_id": 7,
      "permission_id": 19
    },
    {
      "role_id": 8,
      "permission_id": 19
    },
    {
      "role_id": 1,
      "permission_id": 20
    },
    {
      "role_id": 2,
      "permission_id": 20
    },
    {
      "role_id": 4,
      "permission_id": 20
    },
    {
      "role_id": 1,
      "permission_id": 21
    },
    {
      "role_id": 2,
      "permission_id": 21
    },
    {
      "role_id": 4,
      "permission_id": 21
    },
    {
      "role_id": 1,
      "permission_id": 22
    },
    {
      "role_id": 2,
      "permission_id": 22
    },
    {
      "role_id": 5,
      "permission_id": 22
    },
    {
      "role_id": 7,
      "permission_id": 22
    },
    {
      "role_id": 8,
      "permission_id": 22
    },
    {
      "role_id": 1,
      "permission_id": 23
    },
    {
      "role_id": 2,
      "permission_id": 23
    },
    {
      "role_id": 4,
      "permission_id": 23
    },
    {
      "role_id": 5,
      "permission_id": 23
    },
    {
      "role_id": 7,
      "permission_id": 23
    },
    {
      "role_id": 1,
      "permission_id": 24
    },
    {
      "role_id": 2,
      "permission_id": 24
    },
    {
      "role_id": 4,
      "permission_id": 24
    },
    {
      "role_id": 1,
      "permission_id": 25
    },
    {
      "role_id": 2,
      "permission_id": 25
    },
    {
      "role_id": 4,
      "permission_id": 25
    },
    {
      "role_id": 1,
      "permission_id": 26
    },
    {
      "role_id": 2,
      "permission_id": 26
    },
    {
      "role_id": 3,
      "permission_id": 26
    },
    {
      "role_id": 1,
      "permission_id": 27
    },
    {
      "role_id": 2,
      "permission_id": 27
    },
    {
      "role_id": 1,
      "permission_id": 28
    },
    {
      "role_id": 2,
      "permission_id": 28
    },
    {
      "role_id": 3,
      "permission_id": 28
    },
    {
      "role_id": 1,
      "permission_id": 29
    },
    {
      "role_id": 2,
      "permission_id": 29
    },
    {
      "role_id": 1,
      "permission_id": 30
    },
    {
      "role_id": 2,
      "permission_id": 30
    },
    {
      "role_id": 10,
      "permission_id": 30
    },
    {
      "role_id": 10,
      "permission_id": 29
    },
    {
      "role_id": 1,
      "permission_id": 31
    },
    {
      "role_id": 1,
      "permission_id": 32
    },
    {
      "role_id": 2,
      "permission_id": 32
    },
    {
      "role_id": 6,
      "permission_id": 32
    },
    {
      "role_id": 1,
      "permission_id": 33
    },
    {
      "role_id": 2,
      "permission_id": 33
    },
    {
      "role_id": 1,
      "permission_id": 38
    },
    {
      "role_id": 2,
      "permission_id": 38
    },
    {
      "role_id": 4,
      "permission_id": 38
    },
    {
      "role_id": 5,
      "permission_id": 38
    },
    {
      "role_id": 10,
      "permission_id": 38
    },
    {
      "role_id": 11,
      "permission_id": 38
    },
    {
      "role_id": 1,
      "permission_id": 39
    },
    {
      "role_id": 2,
      "permission_id": 39
    },
    {
      "role_id": 4,
      "permission_id": 39
    },
    {
      "role_id": 5,
      "permission_id": 39
    },
    {
      "role_id": 1,
      "permission_id": 40
    },
    {
      "role_id": 2,
      "permission_id": 40
    },
    {
      "role_id": 1,
      "permission_id": 41
    },
    {
      "role_id": 2,
      "permission_id": 41
    },
    {
      "role_id": 1,
      "permission_id": 43
    },
    {
      "role_id": 2,
      "permission_id": 43
    },
    {
      "role_id": 1,
      "permission_id": 44
    },
    {
      "role_id": 2,
      "permission_id": 44
    },
    {
      "role_id": 1,
      "permission_id": 45
    },
    {
      "role_id": 2,
      "permission_id": 45
    },
    {
      "role_id": 4,
      "permission_id": 45
    },
    {
      "role_id": 1,
      "permission_id": 46
    },
    {
      "role_id": 2,
      "permission_id": 46
    },
    {
      "role_id": 1,
      "permission_id": 47
    },
    {
      "role_id": 2,
      "permission_id": 47
    },
    {
      "role_id": 1,
      "permission_id": 48
    },
    {
      "role_id": 4,
      "permission_id": 48
    },
    {
      "role_id": 5,
      "permission_id": 48
    },
    {
      "role_id": 1,
      "permission_id": 49
    },
    {
      "role_id": 4,
      "permission_id": 49
    },
    {
      "role_id": 5,
      "permission_id": 49
    },
    {
      "role_id": 1,
      "permission_id": 50
    },
    {
      "role_id": 1,
      "permission_id": 51
    },
    {
      "role_id": 2,
      "permission_id": 51
    },
    {
      "role_id": 1,
      "permission_id": 52
    },
    {
      "role_id": 1,
      "permission_id": 53
    },
    {
      "role_id": 1,
      "permission_id": 54
    },
    {
      "role_id": 1,
      "permission_id": 55
    },
    {
      "role_id": 1,
      "permission_id": 56
    },
    {
      "role_id": 1,
      "permission_id": 57
    },
    {
      "role_id": 1,
      "permission_id": 58
    },
    {
      "role_id": 1,
      "permission_id": 59
    },
    {
      "role_id": 4,
      "permission_id": 59
    },
    {
      "role_id": 5,
      "permission_id": 59
    },
    {
      "role_id": 1,
      "permission_id": 60
    },
    {
      "role_id": 4,
      "permission_id": 60
    },
    {
      "role_id": 5,
      "permission_id": 60
    },
    {
      "role_id": 1,
      "permission_id": 61
    },
    {
      "role_id": 4,
      "permission_id": 61
    },
    {
      "role_id": 5,
      "permission_id": 61
    },
    {
      "role_id": 1,
      "permission_id": 62
    },
    {
      "role_id": 4,
      "permission_id": 62
    },
    {
      "role_id": 5,
      "permission_id": 62
    },
    {
      "role_id": 1,
      "permission_id": 63
    },
    {
      "role_id": 4,
      "permission_id": 63
    },
    {
      "role_id": 5,
      "permission_id": 63
    },
    {
      "role_id": 1,
      "permission_id": 64
    },
    {
      "role_id": 4,
      "permission_id": 64
    },
    {
      "role_id": 5,
      "permission_id": 64
    },
    {
      "role_id": 10,
      "permission_id": 64
    },
    {
      "role_id": 1,
      "permission_id": 65
    },
    {
      "role_id": 1,
      "permission_id": 66
    },
    {
      "role_id": 1,
      "permission_id": 67
    },
    {
      "role_id": 1,
      "permission_id": 68
    },
    {
      "role_id": 1,
      "permission_id": 70
    },
    {
      "role_id": 6,
      "permission_id": 70
    },
    {
      "role_id": 5,
      "permission_id": 74
    },
    {
      "role_id": 6,
      "permission_id": 75
    },
    {
      "role_id": 4,
      "permission_id": 76
    },
    {
      "role_id": 5,
      "permission_id": 77
    },
    {
      "role_id": 6,
      "permission_id": 78
    },
    {
      "role_id": 2,
      "permission_id": 79
    },
    {
      "role_id": 3,
      "permission_id": 79
    },
    {
      "role_id": 4,
      "permission_id": 80
    },
    {
      "role_id": 5,
      "permission_id": 81
    },
    {
      "role_id": 6,
      "permission_id": 82
    },
    {
      "role_id": 4,
      "permission_id": 83
    },
    {
      "role_id": 4,
      "permission_id": 84
    },
    {
      "role_id": 5,
      "permission_id": 85
    },
    {
      "role_id": 5,
      "permission_id": 86
    },
    {
      "role_id": 6,
      "permission_id": 87
    }
  ],
  "endpoints": [
    {
        "id": 1,
        "permission_id": 1,
        "method_path": "GET /api/manage/security-logs"
    },
    {
        "id": 2,
        "permission_id": 2,
        "method_path": "PATCH /api/manage/permissions/:id"
    },
    {
        "id": 3,
        "permission_id": 3,
        "method_path": "GET /api/manage/users"
    },
    {
        "id": 4,
        "permission_id": 3,
        "method_path": "GET /api/manage/system-users"
    },
    {
        "id": 5,
        "permission_id": 3,
        "method_path": "POST /api/manage/system-users"
    },
    {
        "id": 6,
        "permission_id": 3,
        "method_path": "POST /api/manage/users/:id/moderate"
    },
    {
        "id": 7,
        "permission_id": 3,
        "method_path": "GET /api/manage/users/:id/moderation-history"
    },
    {
        "id": 8,
        "permission_id": 8,
        "method_path": "GET /api/manage/commerces"
    },
    {
        "id": 9,
        "permission_id": 8,
        "method_path": "GET /api/manage/commerces/financial-summary"
    },
    {
        "id": 10,
        "permission_id": 8,
        "method_path": "GET /api/manage/commerces/stores/history"
    },
    {
        "id": 11,
        "permission_id": 8,
        "method_path": "GET /api/manage/commerces/:id"
    },
    {
        "id": 12,
        "permission_id": 9,
        "method_path": "POST /api/manage/commerces"
    },
    {
        "id": 13,
        "permission_id": 10,
        "method_path": "PUT /api/manage/commerces/:id"
    },
    {
        "id": 14,
        "permission_id": 10,
        "method_path": "PATCH /api/manage/commerces/:id/status"
    },
    {
        "id": 15,
        "permission_id": 11,
        "method_path": "GET /api/manage/my-stores"
    },
    {
        "id": 16,
        "permission_id": 11,
        "method_path": "GET /api/manage/payment-platforms"
    },
    {
        "id": 17,
        "permission_id": 11,
        "method_path": "GET /api/manage/stores/:commerceId"
    },
    {
        "id": 18,
        "permission_id": 11,
        "method_path": "GET /api/manage/store/:id"
    },
    {
        "id": 19,
        "permission_id": 12,
        "method_path": "POST /api/manage/stores"
    },
    {
        "id": 20,
        "permission_id": 14,
        "method_path": "GET /api/manage/menus"
    },
    {
        "id": 21,
        "permission_id": 14,
        "method_path": "GET /api/manage/menus/:commerceId"
    },
    {
        "id": 22,
        "permission_id": 14,
        "method_path": "GET /api/manage/store-menus/:storeId"
    },
    {
        "id": 23,
        "permission_id": 14,
        "method_path": "GET /api/manage/categories/:menuId"
    },
    {
        "id": 24,
        "permission_id": 14,
        "method_path": "GET /api/manage/store-categories/:storeId/:menuId"
    },
    {
        "id": 25,
        "permission_id": 14,
        "method_path": "GET /api/manage/categories/:categoryId/products"
    },
    {
        "id": 26,
        "permission_id": 14,
        "method_path": "GET /api/manage/products"
    },
    {
        "id": 27,
        "permission_id": 14,
        "method_path": "GET /api/manage/store-products/:storeId/:categoriaId"
    },
    {
        "id": 28,
        "permission_id": 14,
        "method_path": "GET /api/manage/ingredients"
    },
    {
        "id": 29,
        "permission_id": 62,
        "method_path": "POST /api/manage/menus"
    },
    {
        "id": 30,
        "permission_id": 62,
        "method_path": "POST /api/manage/categories"
    },
    {
        "id": 31,
        "permission_id": 62,
        "method_path": "POST /api/manage/products"
    },
    {
        "id": 32,
        "permission_id": 62,
        "method_path": "POST /api/manage/ingredients"
    },
    {
        "id": 33,
        "permission_id": 63,
        "method_path": "DELETE /api/manage/menus/:id"
    },
    {
        "id": 34,
        "permission_id": 63,
        "method_path": "GET /api/manage/menus/:id/delete-preview"
    },
    {
        "id": 35,
        "permission_id": 63,
        "method_path": "DELETE /api/manage/categories/:id"
    },
    {
        "id": 36,
        "permission_id": 63,
        "method_path": "GET /api/manage/categories/:id/delete-preview"
    },
    {
        "id": 37,
        "permission_id": 63,
        "method_path": "DELETE /api/manage/products/:id"
    },
    {
        "id": 38,
        "permission_id": 61,
        "method_path": "POST /api/manage/store-menus"
    },
    {
        "id": 39,
        "permission_id": 61,
        "method_path": "POST /api/manage/store-categories"
    },
    {
        "id": 40,
        "permission_id": 61,
        "method_path": "POST /api/manage/store-products"
    },
    {
        "id": 41,
        "permission_id": 18,
        "method_path": "GET /api/manage/orders"
    },
    {
        "id": 42,
        "permission_id": 18,
        "method_path": "GET /api/manage/orders/:orderId/items"
    },
    {
        "id": 43,
        "permission_id": 19,
        "method_path": "POST /api/manage/orders/:orderId/notify-unavailable"
    },
    {
        "id": 44,
        "permission_id": 19,
        "method_path": "PATCH /api/manage/orders/:orderId/status"
    },
    {
        "id": 45,
        "permission_id": 19,
        "method_path": "POST /api/manage/orders/:orderId/accept"
    },
    {
        "id": 46,
        "permission_id": 20,
        "method_path": "GET /api/manage/store-admins"
    },
    {
        "id": 47,
        "permission_id": 21,
        "method_path": "POST /api/manage/store-admins"
    },
    {
        "id": 48,
        "permission_id": 21,
        "method_path": "PUT /api/manage/store-admins/:id"
    },
    {
        "id": 49,
        "permission_id": 21,
        "method_path": "PUT /api/manage/store-admins/:id/status"
    },
    {
        "id": 50,
        "permission_id": 21,
        "method_path": "POST /api/manage/store-admins/:id/recovery-email"
    },
    {
        "id": 51,
        "permission_id": 22,
        "method_path": "PATCH /api/manage/stores/:storeId/order-acceptance"
    },
    {
        "id": 52,
        "permission_id": 23,
        "method_path": "POST /api/manage/videos"
    },
    {
        "id": 53,
        "permission_id": 23,
        "method_path": "PATCH /api/manage/videos/:id/active"
    },
    {
        "id": 54,
        "permission_id": 24,
        "method_path": "DELETE /api/manage/videos/:id"
    },
    {
        "id": 55,
        "permission_id": 26,
        "method_path": "GET /api/manage/stats"
    },
    {
        "id": 56,
        "permission_id": 26,
        "method_path": "GET /api/manage/analytics/popularity"
    },
    {
        "id": 57,
        "permission_id": 26,
        "method_path": "POST /api/manage/analytics/trigger"
    },
    {
        "id": 58,
        "permission_id": 27,
        "method_path": "GET /api/manage/intelligence/stop-words"
    },
    {
        "id": 59,
        "permission_id": 27,
        "method_path": "POST /api/manage/intelligence/stop-words"
    },
    {
        "id": 60,
        "permission_id": 27,
        "method_path": "DELETE /api/manage/intelligence/stop-words/:id"
    },
    {
        "id": 61,
        "permission_id": 33,
        "method_path": "POST /api/manage/intelligence/generate-tags"
    },
    {
        "id": 62,
        "permission_id": 28,
        "method_path": "GET /api/manage/financial-flags"
    },
    {
        "id": 63,
        "permission_id": 28,
        "method_path": "POST /api/manage/financial-pin"
    },
    {
        "id": 64,
        "permission_id": 28,
        "method_path": "POST /api/manage/users/:id/unlock-pin"
    },
    {
        "id": 65,
        "permission_id": 28,
        "method_path": "POST /api/manage/users/:id/reset-pin-link"
    },
    {
        "id": 66,
        "permission_id": 28,
        "method_path": "GET /api/domi/token"
    },
    {
        "id": 67,
        "permission_id": 28,
        "method_path": "GET /api/domi/rules"
    },
    {
        "id": 68,
        "permission_id": 28,
        "method_path": "GET /api/domi/wallet/:ownerType/:ownerId"
    },
    {
        "id": 69,
        "permission_id": 28,
        "method_path": "GET /api/domi/wallet/:ownerType/:ownerId/history"
    },
    {
        "id": 70,
        "permission_id": 28,
        "method_path": "GET /api/domi/wallet/:ownerType/:ownerId/aliases"
    },
    {
        "id": 71,
        "permission_id": 28,
        "method_path": "GET /api/domi/tiers/rules"
    },
    {
        "id": 72,
        "permission_id": 50,
        "method_path": "PATCH /api/manage/financial-flags/:key"
    },
    {
        "id": 73,
        "permission_id": 51,
        "method_path": "GET /api/manage/email-templates"
    },
    {
        "id": 74,
        "permission_id": 51,
        "method_path": "POST /api/manage/email-templates"
    },
    {
        "id": 75,
        "permission_id": 51,
        "method_path": "GET /api/manage/email-templates/:name"
    },
    {
        "id": 76,
        "permission_id": 51,
        "method_path": "PUT /api/manage/email-templates/:name"
    },
    {
        "id": 77,
        "permission_id": 65,
        "method_path": "GET /api/manage/system/parameters"
    },
    {
        "id": 78,
        "permission_id": 65,
        "method_path": "PATCH /api/manage/system/parameters"
    },
    {
        "id": 79,
        "permission_id": 65,
        "method_path": "PUT /api/domi/tiers/rules/:tier"
    },
    {
        "id": 80,
        "permission_id": 65,
        "method_path": "POST /api/domi/wallet/approve-excess-purchase"
    },
    {
        "id": 81,
        "permission_id": 56,
        "method_path": "GET /api/manage/system/maintenance/status"
    },
    {
        "id": 82,
        "permission_id": 57,
        "method_path": "POST /api/manage/system/maintenance/enable"
    },
    {
        "id": 83,
        "permission_id": 57,
        "method_path": "POST /api/manage/system/maintenance/disable"
    },
    {
        "id": 84,
        "permission_id": 57,
        "method_path": "POST /api/manage/system/maintenance/panic"
    },
    {
        "id": 85,
        "permission_id": 57,
        "method_path": "GET /api/manage/system/maintenance/bypass-rules"
    },
    {
        "id": 86,
        "permission_id": 57,
        "method_path": "POST /api/manage/system/maintenance/bypass-rules"
    },
    {
        "id": 87,
        "permission_id": 57,
        "method_path": "DELETE /api/manage/system/maintenance/bypass-rules/:id"
    },
    {
        "id": 88,
        "permission_id": 58,
        "method_path": "GET /api/manage/system/maintenance/logs"
    },
    {
        "id": 89,
        "permission_id": 64,
        "method_path": "POST /api/payments/checkout-session"
    },
    {
        "id": 90,
        "permission_id": 29,
        "method_path": "GET /api/domi/packages/:storeId"
    },
    {
        "id": 91,
        "permission_id": 30,
        "method_path": "POST /api/domi/calculate"
    },
    {
        "id": 92,
        "permission_id": 30,
        "method_path": "GET /api/domi/wallet/aliases/check-availability"
    },
    {
        "id": 93,
        "permission_id": 30,
        "method_path": "POST /api/domi/wallet/:ownerType/:ownerId/aliases"
    },
    {
        "id": 94,
        "permission_id": 30,
        "method_path": "DELETE /api/domi/wallet/:ownerType/:ownerId/aliases/:aliasId"
    },
    {
        "id": 95,
        "permission_id": 30,
        "method_path": "GET /api/domi/wallet/:ownerType/:ownerId/aliases/suggest"
    },
    {
        "id": 96,
        "permission_id": 30,
        "method_path": "GET /api/domi/debts"
    },
    {
        "id": 97,
        "permission_id": 30,
        "method_path": "POST /api/domi/debts/:debtId/pay"
    },
    {
        "id": 98,
        "permission_id": 30,
        "method_path": "POST /api/domi/debts/store/:debtId/pay"
    },
    {
        "id": 99,
        "permission_id": 40,
        "method_path": "POST /api/domi/mint/manual"
    },
    {
        "id": 100,
        "permission_id": 41,
        "method_path": "POST /api/domi/burn/manual"
    },
    {
        "id": 101,
        "permission_id": 31,
        "method_path": "GET /api/domi/withdrawal-accounts"
    },
    {
        "id": 102,
        "permission_id": 31,
        "method_path": "POST /api/domi/withdrawal-accounts"
    },
    {
        "id": 103,
        "permission_id": 31,
        "method_path": "DELETE /api/domi/withdrawal-accounts/:id"
    },
    {
        "id": 104,
        "permission_id": 31,
        "method_path": "PATCH /api/domi/withdrawal-accounts/:id/default"
    },
    {
        "id": 105,
        "permission_id": 54,
        "method_path": "GET /api/domi/treasury/status"
    },
    {
        "id": 106,
        "permission_id": 54,
        "method_path": "GET /api/domi/treasury/revenue"
    },
    {
        "id": 107,
        "permission_id": 54,
        "method_path": "GET /api/domi/treasury/burns"
    },
    {
        "id": 108,
        "permission_id": 54,
        "method_path": "GET /api/domi/treasury/peg/history"
    },
    {
        "id": 109,
        "permission_id": 55,
        "method_path": "GET /api/domi/treasury/withdrawals"
    },
    {
        "id": 110,
        "permission_id": 55,
        "method_path": "POST /api/domi/treasury/withdrawals/:id/process"
    },
    {
        "id": 111,
        "permission_id": 66,
        "method_path": "POST /api/domi/treasury/reserve/declare"
    },
    {
        "id": 112,
        "permission_id": 67,
        "method_path": "POST /api/domi/treasury/mint/cash"
    },
    {
        "id": 113,
        "permission_id": 68,
        "method_path": "POST /api/domi/treasury/mint/confirm/:packageId"
    },
    {
        "id": 114,
        "permission_id": 53,
        "method_path": "POST /api/domi/treasury/yield/propose"
    },
    {
        "id": 115,
        "permission_id": 53,
        "method_path": "POST /api/domi/treasury/yield/apply"
    },
    {
        "id": 116,
        "permission_id": 53,
        "method_path": "POST /api/domi/treasury/peg/apply"
    },
    {
        "id": 117,
        "permission_id": 32,
        "method_path": "GET /api/delivery-company/drivers"
    },
    {
        "id": 118,
        "permission_id": 32,
        "method_path": "POST /api/delivery-company/drivers"
    },
    {
        "id": 119,
        "permission_id": 32,
        "method_path": "DELETE /api/delivery-company/drivers/:userId"
    },
    {
        "id": 120,
        "permission_id": 70,
        "method_path": "GET /api/delivery-company/dashboard/stats"
    },
    {
        "id": 121,
        "permission_id": 70,
        "method_path": "GET /api/delivery-company/drivers/available"
    },
    {
        "id": 122,
        "permission_id": 70,
        "method_path": "GET /api/delivery-company/orders/available"
    },
    {
        "id": 123,
        "permission_id": 70,
        "method_path": "GET /api/delivery-company/orders/history"
    },
    {
        "id": 124,
        "permission_id": 70,
        "method_path": "POST /api/delivery-company/orders/:orderId/accept"
    },
    {
        "id": 125,
        "permission_id": 70,
        "method_path": "POST /api/delivery-company/orders/:orderId/assign-driver"
    },
    {
        "id": 126,
        "permission_id": 43,
        "method_path": "GET /api/cash/summary"
    },
    {
        "id": 127,
        "permission_id": 43,
        "method_path": "GET /api/cash/transactions"
    },
    {
        "id": 128,
        "permission_id": 43,
        "method_path": "GET /api/cash/operator/history"
    },
    {
        "id": 129,
        "permission_id": 44,
        "method_path": "POST /api/cash/transaction"
    },
    {
        "id": 130,
        "permission_id": 45,
        "method_path": "GET /api/cash/bank/deposits"
    },
    {
        "id": 131,
        "permission_id": 45,
        "method_path": "POST /api/cash/bank/deposit"
    },
    {
        "id": 132,
        "permission_id": 46,
        "method_path": "POST /api/cash/bank/deposit/:id/reconcile"
    },
    {
        "id": 133,
        "permission_id": 47,
        "method_path": "GET /api/manage/requests"
    },
    {
        "id": 134,
        "permission_id": 47,
        "method_path": "POST /api/manage/requests/invite"
    },
    {
        "id": 135,
        "permission_id": 47,
        "method_path": "GET /api/manage/requests/invitations"
    },
    {
        "id": 136,
        "permission_id": 47,
        "method_path": "POST /api/manage/requests/:id/reject"
    },
    {
        "id": 137,
        "permission_id": 47,
        "method_path": "POST /api/manage/requests/:id/approve"
    },
    {
        "id": 138,
        "permission_id": 47,
        "method_path": "POST /api/manage/requests/:id/info-token-preview"
    },
    {
        "id": 139,
        "permission_id": 47,
        "method_path": "POST /api/manage/requests/:id/send-info-request"
    },
    {
        "id": 140,
        "permission_id": 47,
        "method_path": "GET /api/manage/requests/:id/history"
    },
    {
        "id": 141,
        "permission_id": 47,
        "method_path": "PATCH /api/manage/requests/:id/verify-progress"
    },
    {
        "id": 142,
        "permission_id": 48,
        "method_path": "GET /api/manage/upgrades/active"
    },
    {
        "id": 143,
        "permission_id": 49,
        "method_path": "POST /api/manage/upgrades/purchase"
    },
    {
        "id": 144,
        "permission_id": 52,
        "method_path": "GET /api/manage/upgrades/catalog"
    },
    {
        "id": 145,
        "permission_id": 52,
        "method_path": "POST /api/manage/upgrades/catalog"
    },
    {
        "id": 146,
        "permission_id": 52,
        "method_path": "PATCH /api/manage/upgrades/catalog/:key"
    },
    {
        "id": 147,
        "permission_id": 52,
        "method_path": "GET /api/manage/upgrades/admin/all"
    },
    {
        "id": 148,
        "permission_id": 52,
        "method_path": "POST /api/manage/upgrades/admin/grant"
    },
    {
        "id": 150,
        "permission_id": 56,
        "method_path": "GET /api/manage/system/maintenance/status"
    },
    {
        "id": 151,
        "permission_id": 57,
        "method_path": "POST /api/manage/system/maintenance/enable"
    },
    {
        "id": 152,
        "permission_id": 57,
        "method_path": "POST /api/manage/system/maintenance/disable"
    },
    {
        "id": 153,
        "permission_id": 57,
        "method_path": "POST /api/manage/system/maintenance/panic"
    },
    {
        "id": 154,
        "permission_id": 58,
        "method_path": "GET /api/manage/system/maintenance/logs"
    },
    {
        "id": 155,
        "permission_id": 57,
        "method_path": "GET /api/manage/system/maintenance/bypass-rules"
    },
    {
        "id": 156,
        "permission_id": 57,
        "method_path": "POST /api/manage/system/maintenance/bypass-rules"
    },
    {
        "id": 157,
        "permission_id": 57,
        "method_path": "DELETE /api/manage/system/maintenance/bypass-rules/:id"
    }
  ],
  "impacted_tables": [
    {
      "id": 121,
      "permission_id": 99,
      "table_name": "email_templates"
    },
    {
      "id": 177,
      "permission_id": 97,
      "table_name": "commerce_upgrades"
    },
    {
      "id": 178,
      "permission_id": 97,
      "table_name": "domi_ledger"
    },
    {
      "id": 179,
      "permission_id": 108,
      "table_name": "upgrade_catalog"
    },
    {
      "id": 180,
      "permission_id": 108,
      "table_name": "commerce_upgrades"
    },
    {
      "id": 181,
      "permission_id": 108,
      "table_name": "domi_ledger"
    },
    {
      "id": 182,
      "permission_id": 108,
      "table_name": "security_audit_logs"
    },
    {
      "id": 212,
      "permission_id": 107,
      "table_name": "system_parameters"
    },
    {
      "id": 220,
      "permission_id": 114,
      "table_name": "token_registry"
    },
    {
      "id": 221,
      "permission_id": 114,
      "table_name": "system_parameters"
    },
    {
      "id": 222,
      "permission_id": 115,
      "table_name": "token_registry"
    },
    {
      "id": 223,
      "permission_id": 115,
      "table_name": "domi_ledger"
    },
    {
      "id": 224,
      "permission_id": 116,
      "table_name": "domi_withdrawal_log"
    },
    {
      "id": 225,
      "permission_id": 116,
      "table_name": "domi_ledger"
    },
    {
      "id": 226,
      "permission_id": 102,
      "table_name": "token_registry"
    },
    {
      "id": 227,
      "permission_id": 103,
      "table_name": "domi_ledger"
    },
    {
      "id": 228,
      "permission_id": 103,
      "table_name": "token_registry"
    },
    {
      "id": 229,
      "permission_id": 104,
      "table_name": "domi_ledger"
    },
    {
      "id": 230,
      "permission_id": 104,
      "table_name": "token_registry"
    },
    {
      "id": 231,
      "permission_id": 119,
      "table_name": "orders"
    },
    {
      "id": 232,
      "permission_id": 119,
      "table_name": "wallets"
    },
    {
      "id": 233,
      "permission_id": 119,
      "table_name": "domi_ledger"
    },
    {
      "id": 745,
      "permission_id": 74,
      "table_name": "registration_requests"
    },
    {
      "id": 746,
      "permission_id": 74,
      "table_name": "users"
    },
    {
      "id": 747,
      "permission_id": 74,
      "table_name": "profiles"
    },
    {
      "id": 748,
      "permission_id": 74,
      "table_name": "commerces"
    },
    {
      "id": 749,
      "permission_id": 74,
      "table_name": "delivery_companies"
    },
    {
      "id": 750,
      "permission_id": 75,
      "table_name": "email_templates"
    },
    {
      "id": 751,
      "permission_id": 76,
      "table_name": "commerce_upgrades"
    },
    {
      "id": 764,
      "permission_id": 77,
      "table_name": "stores"
    },
    {
      "id": 765,
      "permission_id": 77,
      "table_name": "store_operating_hours"
    },
    {
      "id": 766,
      "permission_id": 78,
      "table_name": "stores"
    },
    {
      "id": 767,
      "permission_id": 78,
      "table_name": "store_accounts"
    },
    {
      "id": 768,
      "permission_id": 78,
      "table_name": "profiles"
    },
    {
      "id": 769,
      "permission_id": 78,
      "table_name": "users"
    },
    {
      "id": 777,
      "permission_id": 79,
      "table_name": "store_menus"
    },
    {
      "id": 778,
      "permission_id": 79,
      "table_name": "store_categories"
    },
    {
      "id": 779,
      "permission_id": 80,
      "table_name": "menus"
    },
    {
      "id": 780,
      "permission_id": 80,
      "table_name": "categorias"
    },
    {
      "id": 781,
      "permission_id": 80,
      "table_name": "products"
    },
    {
      "id": 782,
      "permission_id": 80,
      "table_name": "product_ingredients"
    },
    {
      "id": 783,
      "permission_id": 80,
      "table_name": "store_products"
    },
    {
      "id": 784,
      "permission_id": 81,
      "table_name": "menus"
    },
    {
      "id": 785,
      "permission_id": 81,
      "table_name": "categorias"
    },
    {
      "id": 786,
      "permission_id": 81,
      "table_name": "products"
    },
    {
      "id": 806,
      "permission_id": 82,
      "table_name": "commerce_upgrades"
    },
    {
      "id": 807,
      "permission_id": 82,
      "table_name": "domi_ledger"
    },
    {
      "id": 826,
      "permission_id": 83,
      "table_name": "domi_ledger"
    },
    {
      "id": 827,
      "permission_id": 83,
      "table_name": "token_registry"
    },
    {
      "id": 828,
      "permission_id": 83,
      "table_name": "domi_packages"
    },
    {
      "id": 832,
      "permission_id": 84,
      "table_name": "system_financial_flags"
    },
    {
      "id": 833,
      "permission_id": 84,
      "table_name": "domi_ledger"
    },
    {
      "id": 834,
      "permission_id": 85,
      "table_name": "domi_ledger"
    },
    {
      "id": 835,
      "permission_id": 85,
      "table_name": "token_registry"
    },
    {
      "id": 836,
      "permission_id": 86,
      "table_name": "domi_ledger"
    },
    {
      "id": 837,
      "permission_id": 86,
      "table_name": "token_registry"
    },
    {
      "id": 838,
      "permission_id": 87,
      "table_name": "domi_ledger"
    },
    {
      "id": 839,
      "permission_id": 88,
      "table_name": "domi_ledger"
    },
    {
      "id": 840,
      "permission_id": 88,
      "table_name": "commerce_upgrades"
    },
    {
      "id": 841,
      "permission_id": 89,
      "table_name": "system_parameters"
    },
    {
      "id": 842,
      "permission_id": 90,
      "table_name": "cash_vault"
    },
    {
      "id": 843,
      "permission_id": 90,
      "table_name": "cash_transactions"
    },
    {
      "id": 844,
      "permission_id": 91,
      "table_name": "cash_vault"
    },
    {
      "id": 845,
      "permission_id": 91,
      "table_name": "cash_transactions"
    },
    {
      "id": 846,
      "permission_id": 92,
      "table_name": "bank_deposits"
    },
    {
      "id": 847,
      "permission_id": 93,
      "table_name": "bank_deposits"
    },
    {
      "id": 848,
      "permission_id": 93,
      "table_name": "cash_vault"
    },
    {
      "id": 851,
      "permission_id": 69,
      "table_name": "token_registry"
    },
    {
      "id": 852,
      "permission_id": 69,
      "table_name": "domi_ledger"
    },
    {
      "id": 855,
      "permission_id": 94,
      "table_name": "token_registry"
    },
    {
      "id": 856,
      "permission_id": 95,
      "table_name": "domi_ledger"
    },
    {
      "id": 857,
      "permission_id": 95,
      "table_name": "token_registry"
    },
    {
      "id": 858,
      "permission_id": 96,
      "table_name": "domi_ledger"
    },
    {
      "id": 859,
      "permission_id": 96,
      "table_name": "token_registry"
    },
    {
      "id": 860,
      "permission_id": 98,
      "table_name": "orders"
    },
    {
      "id": 861,
      "permission_id": 98,
      "table_name": "wallets"
    },
    {
      "id": 862,
      "permission_id": 98,
      "table_name": "domi_ledger"
    },
    {
      "id": 1183,
      "permission_id": 34,
      "table_name": "upgrade_catalog"
    },
    {
      "id": 1184,
      "permission_id": 34,
      "table_name": "commerce_upgrades"
    },
    {
      "id": 1185,
      "permission_id": 34,
      "table_name": "domi_ledger"
    },
    {
      "id": 1186,
      "permission_id": 34,
      "table_name": "security_audit_logs"
    },
    {
      "id": 1224,
      "permission_id": 35,
      "table_name": "token_registry"
    },
    {
      "id": 1225,
      "permission_id": 35,
      "table_name": "system_parameters"
    },
    {
      "id": 1226,
      "permission_id": 36,
      "table_name": "token_registry"
    },
    {
      "id": 1227,
      "permission_id": 36,
      "table_name": "domi_ledger"
    },
    {
      "id": 1364,
      "permission_id": 1,
      "table_name": "security_audit_logs"
    },
    {
      "id": 1365,
      "permission_id": 1,
      "table_name": "users"
    },
    {
      "id": 1366,
      "permission_id": 1,
      "table_name": "system_users"
    },
    {
      "id": 1367,
      "permission_id": 2,
      "table_name": "roles"
    },
    {
      "id": 1368,
      "permission_id": 2,
      "table_name": "role_permissions"
    },
    {
      "id": 1369,
      "permission_id": 2,
      "table_name": "user_roles"
    },
    {
      "id": 1370,
      "permission_id": 3,
      "table_name": "system_users"
    },
    {
      "id": 1371,
      "permission_id": 3,
      "table_name": "user_roles"
    },
    {
      "id": 1372,
      "permission_id": 47,
      "table_name": "registration_requests"
    },
    {
      "id": 1373,
      "permission_id": 47,
      "table_name": "users"
    },
    {
      "id": 1374,
      "permission_id": 47,
      "table_name": "profiles"
    },
    {
      "id": 1375,
      "permission_id": 47,
      "table_name": "commerces"
    },
    {
      "id": 1376,
      "permission_id": 47,
      "table_name": "delivery_companies"
    },
    {
      "id": 1377,
      "permission_id": 51,
      "table_name": "email_templates"
    },
    {
      "id": 1378,
      "permission_id": 48,
      "table_name": "commerce_upgrades"
    },
    {
      "id": 1379,
      "permission_id": 8,
      "table_name": "commerces"
    },
    {
      "id": 1380,
      "permission_id": 8,
      "table_name": "users"
    },
    {
      "id": 1381,
      "permission_id": 9,
      "table_name": "commerces"
    },
    {
      "id": 1382,
      "permission_id": 9,
      "table_name": "users"
    },
    {
      "id": 1383,
      "permission_id": 9,
      "table_name": "profiles"
    },
    {
      "id": 1384,
      "permission_id": 10,
      "table_name": "commerces"
    },
    {
      "id": 1385,
      "permission_id": 11,
      "table_name": "stores"
    },
    {
      "id": 1386,
      "permission_id": 11,
      "table_name": "user_stores"
    },
    {
      "id": 1387,
      "permission_id": 12,
      "table_name": "stores"
    },
    {
      "id": 1388,
      "permission_id": 12,
      "table_name": "user_stores"
    },
    {
      "id": 1389,
      "permission_id": 12,
      "table_name": "users"
    },
    {
      "id": 1390,
      "permission_id": 12,
      "table_name": "profiles"
    },
    {
      "id": 1391,
      "permission_id": 59,
      "table_name": "stores"
    },
    {
      "id": 1392,
      "permission_id": 59,
      "table_name": "store_operating_hours"
    },
    {
      "id": 1393,
      "permission_id": 60,
      "table_name": "stores"
    },
    {
      "id": 1394,
      "permission_id": 60,
      "table_name": "store_accounts"
    },
    {
      "id": 1395,
      "permission_id": 60,
      "table_name": "profiles"
    },
    {
      "id": 1396,
      "permission_id": 60,
      "table_name": "users"
    },
    {
      "id": 1397,
      "permission_id": 14,
      "table_name": "menus"
    },
    {
      "id": 1398,
      "permission_id": 14,
      "table_name": "categorias"
    },
    {
      "id": 1399,
      "permission_id": 14,
      "table_name": "products"
    },
    {
      "id": 1400,
      "permission_id": 14,
      "table_name": "product_ingredients"
    },
    {
      "id": 1401,
      "permission_id": 14,
      "table_name": "store_menus"
    },
    {
      "id": 1402,
      "permission_id": 14,
      "table_name": "store_categories"
    },
    {
      "id": 1403,
      "permission_id": 14,
      "table_name": "store_products"
    },
    {
      "id": 1404,
      "permission_id": 61,
      "table_name": "store_menus"
    },
    {
      "id": 1405,
      "permission_id": 61,
      "table_name": "store_categories"
    },
    {
      "id": 1406,
      "permission_id": 62,
      "table_name": "menus"
    },
    {
      "id": 1407,
      "permission_id": 62,
      "table_name": "categorias"
    },
    {
      "id": 1408,
      "permission_id": 62,
      "table_name": "products"
    },
    {
      "id": 1409,
      "permission_id": 62,
      "table_name": "product_ingredients"
    },
    {
      "id": 1410,
      "permission_id": 62,
      "table_name": "store_products"
    },
    {
      "id": 1411,
      "permission_id": 63,
      "table_name": "menus"
    },
    {
      "id": 1412,
      "permission_id": 63,
      "table_name": "categorias"
    },
    {
      "id": 1413,
      "permission_id": 63,
      "table_name": "products"
    },
    {
      "id": 1414,
      "permission_id": 17,
      "table_name": "menus"
    },
    {
      "id": 1415,
      "permission_id": 17,
      "table_name": "categorias"
    },
    {
      "id": 1416,
      "permission_id": 17,
      "table_name": "products"
    },
    {
      "id": 1417,
      "permission_id": 17,
      "table_name": "store_menus"
    },
    {
      "id": 1418,
      "permission_id": 17,
      "table_name": "store_categories"
    },
    {
      "id": 1419,
      "permission_id": 17,
      "table_name": "store_products"
    },
    {
      "id": 1420,
      "permission_id": 18,
      "table_name": "orders"
    },
    {
      "id": 1421,
      "permission_id": 18,
      "table_name": "order_items"
    },
    {
      "id": 1422,
      "permission_id": 19,
      "table_name": "orders"
    },
    {
      "id": 1423,
      "permission_id": 19,
      "table_name": "domi_ledger"
    },
    {
      "id": 1424,
      "permission_id": 20,
      "table_name": "users"
    },
    {
      "id": 1425,
      "permission_id": 20,
      "table_name": "profiles"
    },
    {
      "id": 1426,
      "permission_id": 20,
      "table_name": "user_stores"
    },
    {
      "id": 1427,
      "permission_id": 21,
      "table_name": "users"
    },
    {
      "id": 1428,
      "permission_id": 21,
      "table_name": "profiles"
    },
    {
      "id": 1429,
      "permission_id": 21,
      "table_name": "user_stores"
    },
    {
      "id": 1430,
      "permission_id": 22,
      "table_name": "stores"
    },
    {
      "id": 1431,
      "permission_id": 23,
      "table_name": "commerce_videos"
    },
    {
      "id": 1432,
      "permission_id": 24,
      "table_name": "commerce_videos"
    },
    {
      "id": 1433,
      "permission_id": 49,
      "table_name": "commerce_upgrades"
    },
    {
      "id": 1434,
      "permission_id": 49,
      "table_name": "domi_ledger"
    },
    {
      "id": 1435,
      "permission_id": 52,
      "table_name": "upgrade_catalog"
    },
    {
      "id": 1436,
      "permission_id": 52,
      "table_name": "commerce_upgrades"
    },
    {
      "id": 1437,
      "permission_id": 52,
      "table_name": "domi_ledger"
    },
    {
      "id": 1438,
      "permission_id": 52,
      "table_name": "security_audit_logs"
    },
    {
      "id": 1439,
      "permission_id": 26,
      "table_name": "product_popularity"
    },
    {
      "id": 1440,
      "permission_id": 26,
      "table_name": "orders"
    },
    {
      "id": 1441,
      "permission_id": 26,
      "table_name": "order_items"
    },
    {
      "id": 1442,
      "permission_id": 27,
      "table_name": "stop_words"
    },
    {
      "id": 1443,
      "permission_id": 27,
      "table_name": "product_popularity"
    },
    {
      "id": 1444,
      "permission_id": 27,
      "table_name": "products"
    },
    {
      "id": 1445,
      "permission_id": 33,
      "table_name": "products"
    },
    {
      "id": 1446,
      "permission_id": 32,
      "table_name": "users"
    },
    {
      "id": 1447,
      "permission_id": 32,
      "table_name": "profiles"
    },
    {
      "id": 1448,
      "permission_id": 32,
      "table_name": "delivery_companies"
    },
    {
      "id": 1449,
      "permission_id": 28,
      "table_name": "domi_ledger"
    },
    {
      "id": 1450,
      "permission_id": 28,
      "table_name": "token_registry"
    },
    {
      "id": 1451,
      "permission_id": 29,
      "table_name": "domi_ledger"
    },
    {
      "id": 1452,
      "permission_id": 29,
      "table_name": "token_registry"
    },
    {
      "id": 1453,
      "permission_id": 64,
      "table_name": "domi_ledger"
    },
    {
      "id": 1454,
      "permission_id": 64,
      "table_name": "token_registry"
    },
    {
      "id": 1455,
      "permission_id": 64,
      "table_name": "domi_packages"
    },
    {
      "id": 1456,
      "permission_id": 30,
      "table_name": "domi_ledger"
    },
    {
      "id": 1457,
      "permission_id": 31,
      "table_name": "domi_ledger"
    },
    {
      "id": 1458,
      "permission_id": 31,
      "table_name": "token_registry"
    },
    {
      "id": 1459,
      "permission_id": 50,
      "table_name": "system_financial_flags"
    },
    {
      "id": 1460,
      "permission_id": 50,
      "table_name": "domi_ledger"
    },
    {
      "id": 1461,
      "permission_id": 41,
      "table_name": "domi_ledger"
    },
    {
      "id": 1462,
      "permission_id": 41,
      "table_name": "token_registry"
    },
    {
      "id": 1463,
      "permission_id": 40,
      "table_name": "domi_ledger"
    },
    {
      "id": 1464,
      "permission_id": 40,
      "table_name": "token_registry"
    },
    {
      "id": 1465,
      "permission_id": 38,
      "table_name": "domi_ledger"
    },
    {
      "id": 1466,
      "permission_id": 39,
      "table_name": "domi_ledger"
    },
    {
      "id": 1467,
      "permission_id": 39,
      "table_name": "commerce_upgrades"
    },
    {
      "id": 1468,
      "permission_id": 65,
      "table_name": "system_parameters"
    },
    {
      "id": 1469,
      "permission_id": 43,
      "table_name": "cash_vault"
    },
    {
      "id": 1470,
      "permission_id": 43,
      "table_name": "cash_transactions"
    },
    {
      "id": 1471,
      "permission_id": 44,
      "table_name": "cash_vault"
    },
    {
      "id": 1472,
      "permission_id": 44,
      "table_name": "cash_transactions"
    },
    {
      "id": 1473,
      "permission_id": 45,
      "table_name": "bank_deposits"
    },
    {
      "id": 1474,
      "permission_id": 46,
      "table_name": "bank_deposits"
    },
    {
      "id": 1475,
      "permission_id": 46,
      "table_name": "cash_vault"
    },
    {
      "id": 1476,
      "permission_id": 53,
      "table_name": "token_registry"
    },
    {
      "id": 1477,
      "permission_id": 53,
      "table_name": "system_parameters"
    },
    {
      "id": 1478,
      "permission_id": 54,
      "table_name": "token_registry"
    },
    {
      "id": 1479,
      "permission_id": 54,
      "table_name": "domi_ledger"
    },
    {
      "id": 1480,
      "permission_id": 55,
      "table_name": "domi_withdrawal_log"
    },
    {
      "id": 1481,
      "permission_id": 55,
      "table_name": "domi_ledger"
    },
    {
      "id": 1482,
      "permission_id": 66,
      "table_name": "token_registry"
    },
    {
      "id": 1483,
      "permission_id": 67,
      "table_name": "domi_ledger"
    },
    {
      "id": 1484,
      "permission_id": 67,
      "table_name": "token_registry"
    },
    {
      "id": 1485,
      "permission_id": 68,
      "table_name": "domi_ledger"
    },
    {
      "id": 1486,
      "permission_id": 68,
      "table_name": "token_registry"
    },
    {
      "id": 1487,
      "permission_id": 70,
      "table_name": "orders"
    },
    {
      "id": 1488,
      "permission_id": 70,
      "table_name": "wallets"
    },
    {
      "id": 1490,
      "permission_id": 56,
      "table_name": "maintenance_bypass_rules"
    },
    {
      "id": 1491,
      "permission_id": 57,
      "table_name": "maintenance_bypass_rules"
    },
    {
      "id": 1492,
      "permission_id": 57,
      "table_name": "security_audit_logs"
    },
    {
      "id": 1493,
      "permission_id": 58,
      "table_name": "security_audit_logs"
    }
  ]
};
const configData = {
  "token_registry": [
    {
      "id": 1,
      "symbol": "DOMI",
      "name": "DomiToken",
      "decimals": 2,
      "fiat_peg_cop": "400.0000",
      "protocol_version": "1.0.0",
      "integrity_hash": "710a5b05fba854d979a5e5df4f3525079e2d3a0e598d78a04388c7d4912a4c06",
      "created_at": "2026-07-02T02:51:58.000Z",
      "updated_at": "2026-07-02T02:51:58.000Z"
    }
  ],
  "protocol_rules": [
    {
      "id": 1,
      "threshold_fiat_cop": "50000.00",
      "base_cost_domis": "1.0000",
      "percentage_rate": "0.010000",
      "retention_penalty_rate": "0.300000",
      "refund_standard_rate": "0.700000",
      "rescue_cashback_rate": "0.300000",
      "store_fixed_fee_cop": "400.00",
      "driver_fixed_fee_domi": "300.00000000",
      "cashback_rate_customer": "0.0100",
      "score_min_for_cashback": 0,
      "max_monthly_yield_pct": "0.5000",
      "cash_mint_expiry_days": 5,
      "min_domi_balance_driver": "600.00000000",
      "cod_capital_min_cop": "50000.00",
      "driver_fixed_fee_cop": "300.00",
      "delivery_base_fare_cop": "3100.00",
      "delivery_base_distance_km": "3.00",
      "delivery_extra_rate_cop_per_km": "400.00",
      "delivery_max_distance_km": "9.00",
      "max_balance_cop": "2000000.00",
      "free_withdrawals_per_month": 1,
      "withdrawal_fee_cop": "2000.00",
      "score_cashback_win_base": "0.100000",
      "min_collateral_ratio_post_adjust": "105.0000",
      "store_subscription_fee_domi": "50.0000",
      "commerce_subscription_fee_domi": "100.0000",
      "wompi_min_purchase_cop": 1500,
      "score_earned_on_purchase": 5,
      "score_earned_on_domi_purchase": 5,
      "score_penalty_domi_cancel_accepted": 1,
      "score_penalty_domi_cancel_in_transit": 4,
      "block_meters": 100,
      "score_penalty_domi_cancel_dispatch": 2,
      "score_penalty_cash_cancel_accepted": 40,
      "score_penalty_cash_cancel_in_transit": 60,
      "score_penalty_cash_cancel_dispatch": 50,
      "driver_cancellation_compensation_rate": "0.500000",
      "driver_cancel_pre_pickup_refund_rate": "0.300000",
      "driver_cancel_post_pickup_penalty_rate": "1.000000",
      "customer_cancel_store_refund_prep_rate": "0.900000",
      "customer_cancel_client_refund_prep_rate": "0.040000",
      "customer_cancel_sys_retain_prep_rate": "0.060000",
      "customer_cancel_driver_commission_refund_transit_rate": "0.750000",
      "customer_cancel_store_commission_refund_dispatch_rate": "0.750000",
      "customer_cancel_driver_commission_refund_dispatch_rate": "0.900000",
      "customer_cancel_driver_delivery_pct_dispatch": "0.500000",
      "platform_processing_fee_rate": "0.004000",
      "driver_rescue_commission_refund_rate": "0.700000",
      "driver_rescue_timeout_minutes": 30,
      "driver_rescue_max_attempts": 3,
      "driver_penalty_points_rescue_original": 2,
      "driver_rescue_chain_penalty_points": 1,
      "minimum_delivery_rate": "3000.00",
      "store_solvency_delivery_multiplier": 3,
      "solvency_commission_guarantee_fraction": "0.500000",
      "store_cancel_client_indemnity_domi_amount": "0.2500",
      "store_penalty_points_prep": 1,
      "store_penalty_points_dispatch": 2,
      "driver_penalty_points_prep": 1,
      "driver_penalty_points_dispatch": 2,
      "driver_penalty_points_transit": 3,
      "store_cancel_driver_delivery_pct_rate": "0.500000",
      "store_cancel_client_indemnity_rate": "0.250000",
      "customer_cancel_driver_delivery_pct_dispatch_rate": "0.500000",
      "driver_commission_refund_on_store_cancel_rate": "0.900000",
      "effective_date": "2026-07-01T05:00:00.000Z",
      "notes": "Reglas iniciales completas del protocolo DOMI",
      "created_at": "2026-07-02T02:51:58.000Z",
      "updated_at": "2026-07-02T02:51:58.624Z"
    }
  ],
  "upgrade_catalog": [
    {
      "id": 1,
      "upgrade_key": "estado_empresarial",
      "label": "Estado Empresarial",
      "description": "Desbloquea sedes adicionales, productos y categorias ilimitadas en el catalogo del comercio.",
      "icon": "building",
      "price_domis": "31.0000",
      "duration_days": 30,
      "is_subscription": 0,
      "max_per_commerce": 1,
      "max_per_entity": 1,
      "benefit_scope": "global",
      "target_role": "commerce_manager",
      "is_active": 1,
      "updated_at": "2026-06-20T14:43:52.726Z",
      "created_at": "2026-06-20T14:43:52.726Z"
    },
    {
      "id": 2,
      "upgrade_key": "estatus_influencer",
      "label": "Estatus Influencer",
      "description": "Habilita la subida de hasta 3 reels de video en el perfil publico del comercio.",
      "icon": "video",
      "price_domis": "40.0000",
      "duration_days": 30,
      "is_subscription": 0,
      "max_per_commerce": 1,
      "max_per_entity": 1,
      "benefit_scope": "global",
      "target_role": "commerce_manager",
      "is_active": 1,
      "updated_at": "2026-07-01T00:00:03.033Z",
      "created_at": "2026-06-20T14:43:52.726Z"
    },
    {
      "id": 3,
      "upgrade_key": "adicionar_sede",
      "label": "Sede Adicional",
      "description": "Suma una (1) sede operativa adicional al limite del comercio por 30 dias.",
      "icon": "store",
      "price_domis": "18.0000",
      "duration_days": 30,
      "is_subscription": 0,
      "max_per_commerce": null,
      "max_per_entity": null,
      "benefit_scope": "global",
      "target_role": "commerce_manager, store_admin",
      "is_active": 1,
      "updated_at": "2026-07-01T00:00:03.033Z",
      "created_at": "2026-06-20T14:43:52.726Z"
    },
    {
      "id": 8,
      "upgrade_key": "sin_publicidad",
      "label": "Elimina la publicidad",
      "description": "Quita los anuncios y navega con tranquilidad.",
      "icon": "star",
      "price_domis": "15.0000",
      "duration_days": 30,
      "is_subscription": 0,
      "max_per_commerce": 1,
      "max_per_entity": 1,
      "benefit_scope": "individual",
      "target_role": "customer",
      "is_active": 1,
      "updated_at": "2026-06-21T01:03:20.635Z",
      "created_at": "2026-06-20T22:25:57.879Z"
    },
    {
      "id": 9,
      "upgrade_key": "catalogo_ilimitado",
      "label": "Catálogo Ilimitado",
      "description": "Desbloquea productos y categorías ilimitadas en el catálogo de esta sede de forma individual por 30 días.",
      "icon": "shopping-bag",
      "price_domis": "15.0000",
      "duration_days": 30,
      "is_subscription": 0,
      "max_per_commerce": null,
      "max_per_entity": 1,
      "benefit_scope": "individual",
      "target_role": "store_admin",
      "is_active": 1,
      "updated_at": "2026-07-12T00:00:00.000Z",
      "created_at": "2026-07-12T00:00:00.000Z"
    }
  ],
  "system_financial_flags": [
    {
      "id": 1,
      "key": "withdrawals_enabled",
      "enabled": 1,
      "label": "Retiros de DOMI",
      "description": "Permite ejecutar retiros reales a usuarios con permiso withdraw_domis",
      "updated_by": null,
      "updated_at": "2026-06-22T04:35:51.000Z"
    },
    {
      "id": 2,
      "key": "purchases_enabled",
      "enabled": 1,
      "label": "Compra de DOMIs",
      "description": "Permite comprar via Wompi a usuarios con permiso purchase_domis",
      "updated_by": null,
      "updated_at": "2026-06-15T19:25:26.000Z"
    },
    {
      "id": 3,
      "key": "minting_enabled",
      "enabled": 1,
      "label": "Acunacion Manual",
      "description": "Permite acunar DOMIs manualmente a administradores con mint_manual_domis",
      "updated_by": null,
      "updated_at": "2026-06-15T19:25:26.000Z"
    }
  ],
  "payment_platforms": [
    {
      "id": 1,
      "nombre": "Wompi",
      "tipo_entidad": "pasarela",
      "created_at": "2026-07-02T02:51:58.000Z",
      "updated_at": "2026-07-02T02:51:58.786Z"
    },
    {
      "id": 2,
      "nombre": "PSE",
      "tipo_entidad": "banco",
      "created_at": "2026-07-02T02:51:58.000Z",
      "updated_at": "2026-07-02T02:51:58.786Z"
    },
    {
      "id": 3,
      "nombre": "Efectivo",
      "tipo_entidad": "efectivo",
      "created_at": "2026-07-02T02:51:58.000Z",
      "updated_at": "2026-07-02T02:51:58.786Z"
    }
  ],
  "maintenance_bypass_rules": [
    {
      "id": 1,
      "pattern": "/api/auth/login",
      "type": "api",
      "description": "Permite a los usuarios acceder al login",
      "created_at": "2026-06-21T15:10:39.000Z",
      "is_system": 1
    },
    {
      "id": 2,
      "pattern": "/api/public/maintenance-status",
      "type": "api",
      "description": "Permite al frontend consultar el estado de mantenimiento",
      "created_at": "2026-06-21T15:10:39.000Z",
      "is_system": 1
    },
    {
      "id": 3,
      "pattern": "/api/manage/system/maintenance/status",
      "type": "api",
      "description": "Permite al dashboard administrativo consultar el estado de mantenimiento",
      "created_at": "2026-06-21T15:10:39.000Z",
      "is_system": 1
    },
    {
      "id": 4,
      "pattern": "/api/manage/system/maintenance/disable",
      "type": "api",
      "description": "Permite al dashboard desactivar el modo mantenimiento",
      "created_at": "2026-06-21T15:10:39.000Z",
      "is_system": 1
    },
    {
      "id": 5,
      "pattern": "/api/manage/system/maintenance/panic",
      "type": "api",
      "description": "Permite activar o desactivar la revocación global crítica",
      "created_at": "2026-06-21T15:10:39.000Z",
      "is_system": 1
    },
    {
      "id": 6,
      "pattern": "/api/manage/system/maintenance/logs",
      "type": "api",
      "description": "Permite leer logs del sistema en la consola",
      "created_at": "2026-06-21T15:10:39.000Z",
      "is_system": 1
    },
    {
      "id": 7,
      "pattern": "/api/manage/system/maintenance/bypass-rules",
      "type": "api",
      "description": "Administrar las excepciones de mantenimiento",
      "created_at": "2026-06-21T15:10:39.000Z",
      "is_system": 1
    },
    {
      "id": 8,
      "pattern": "/api/public/maintenance-bypass-rules",
      "type": "api",
      "description": "Consultar las excepciones de mantenimiento públicamente",
      "created_at": "2026-06-21T15:10:39.000Z",
      "is_system": 1
    },
    {
      "id": 9,
      "pattern": "/login",
      "type": "page",
      "description": "Página de inicio de sesión del frontend",
      "created_at": "2026-06-21T15:10:39.000Z",
      "is_system": 1
    },
    {
      "id": 10,
      "pattern": "/",
      "type": "page",
      "description": "Página principal (Home) pública del frontend",
      "created_at": "2026-06-21T15:10:39.000Z",
      "is_system": 1
    }
  ],
  "domi_tier_rules": [
    {
      "id": 1,
      "tier": "standard",
      "max_balance_domi": "6500.00000000",
      "min_monthly_tx_domi": "0.00000000",
      "large_withdrawal_threshold_domi": "1000.00000000",
      "cooldown_days": 5,
      "free_withdrawals_per_month": 1,
      "withdrawal_fee_cop": "2000.00",
      "daily_withdrawal_limit_cop": "2000000.00",
      "updated_at": "2026-06-19T14:14:53.000Z"
    },
    {
      "id": 2,
      "tier": "verified_commerce",
      "max_balance_domi": "0.00000000",
      "min_monthly_tx_domi": "5000.00000000",
      "large_withdrawal_threshold_domi": "125000.00000000",
      "cooldown_days": 3,
      "free_withdrawals_per_month": 1,
      "withdrawal_fee_cop": "2000.00",
      "daily_withdrawal_limit_cop": "5000000.00",
      "updated_at": "2026-06-19T14:14:53.000Z"
    }
  ],
  "email_templates": [
    {
      "id": 1,
      "name": "invitation",
      "label": "Invitacion de Afiliacion",
      "category": "affiliations",
      "subject": "Invitacion Especial de Afiliacion - Bienestar Digital",
      "html_body": "<div style=\"font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;\"><div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;\"><div style=\"background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px; text-align: center; color: #ffffff;\"><h1 style=\"margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;\">Invitacion de Registro</h1></div><div style=\"padding: 40px;\"><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Estimados representantes de <strong>{{razon_social}}</strong>,</p><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Te extendemos una invitacion formal para unirse a <strong>Bienestar Digital</strong> como comercio o empresa proveedora autorizada.</p><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Para iniciar el proceso de registro, por favor completa el formulario publico adjuntando los documentos de ley obligatorios (Logo, RUT, Camara de Comercio y Cedula del Representante Legal):</p><div style=\"text-align: center; margin: 35px 0 25px 0;\"><a href=\"{{registro_url}}\" style=\"background-color: #6366f1; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);\">Completar Registro de Afiliacion</a></div><p style=\"font-size: 14px; line-height: 22px; color: #64748b; text-align: center;\">Este enlace es exclusivo para tu empresa. Si tienes alguna duda, responde a este correo.</p></div><div style=\"background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8;\">Copyright {{year}} Bienestar Digital S.A.S. Todos los derechos reservados.</div></div></div>",
      "variables": "[{\"key\":\"razon_social\",\"desc\":\"Razon social de la empresa destinataria\"},{\"key\":\"registro_url\",\"desc\":\"URL del formulario de registro\"},{\"key\":\"year\",\"desc\":\"Ano actual\"}]",
      "is_system": 1,
      "created_at": "2026-06-18T03:44:51.000Z",
      "updated_at": "2026-06-18T03:44:51.000Z"
    },
    {
      "id": 3,
      "name": "request_more_info",
      "label": "Solicitud de Correcciones de Registro",
      "category": "affiliations",
      "subject": "Se requiere informacion adicional para tu solicitud de afiliacion - Bienestar Digital",
      "html_body": "<div style=\"font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;\"><div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;\"><div style=\"background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; color: #ffffff;\"><h1 style=\"margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;\">Se requiere corregir informacion</h1></div><div style=\"padding: 40px;\"><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Estimado representante de <strong>{{razon_social}}</strong>,</p><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Hemos revisado tu solicitud de afiliacion a <strong>Bienestar Digital</strong> y nuestro equipo de auditoria requiere que corrijas o completes algunos datos antes de proceder con la creacion de tu cuenta y wallet corporativa.</p><div style=\"background-color: #fef3c7; border: 1px solid #fde68a; padding: 20px; border-radius: 8px; margin: 25px 0;\"><h3 style=\"margin-top: 0; margin-bottom: 10px; color: #92400e; font-size: 15px; font-weight: 700;\">Detalles a corregir:</h3><ul style=\"margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #78350f;\">{{missing_details_list}}</ul></div><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Por favor ingresa al siguiente enlace seguro para actualizar tu informacion. Encontraras tus datos pre-llenados y los campos a corregir estaran habilitados en color rojo:</p><div style=\"text-align: center; margin: 35px 0 25px 0;\"><a href=\"{{enlace_formulario}}\" style=\"background-color: #d97706; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.2);\">Actualizar Informacion de Registro</a></div><p style=\"font-size: 14px; line-height: 22px; color: #64748b; text-align: center;\">Si tienes dudas adicionales, puedes responder directamente a este correo.</p></div><div style=\"background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8;\">Copyright {{year}} Bienestar Digital S.A.S. Todos los derechos reservados.</div></div></div>",
      "variables": "[{\"key\":\"razon_social\",\"desc\":\"Razon social del solicitante\"},{\"key\":\"missing_details_list\",\"desc\":\"Lista de campos y documentos desaprobados\"},{\"key\":\"enlace_formulario\",\"desc\":\"Enlace seguro pre-llenado con token JWT\"},{\"key\":\"year\",\"desc\":\"Ano actual\"}]",
      "is_system": 1,
      "created_at": "2026-06-19T02:14:37.000Z",
      "updated_at": "2026-06-19T02:14:37.000Z"
    },
    {
      "id": 4,
      "name": "store_admin_password_recovery",
      "label": "Restablecimiento de Contraseña para Admin de Sede",
      "category": "system",
      "subject": "Restablecer contraseña de tu cuenta de Sede - Bienestar Digital",
      "html_body": "<div style=\"font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;\"><div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;\"><div style=\"background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center; color: #ffffff;\"><h1 style=\"margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;\">Restablecer Contraseña</h1></div><div style=\"padding: 40px;\"><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Hola <strong>{{admin_name}}</strong>,</p><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Se ha solicitado un enlace para restablecer la contraseña de tu cuenta de Administrador de Sede en <strong>Bienestar Digital</strong>.</p><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Para cambiar tu contraseña, por favor haz clic en el siguiente botón. Recuerda que este enlace es válido por 10 minutos:</p><div style=\"text-align: center; margin: 35px 0 25px 0;\"><a href=\"{{recovery_url}}\" style=\"background-color: #10B981; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);\">Restablecer Contraseña</a></div><p style=\"font-size: 14px; line-height: 22px; color: #64748b; text-align: center;\">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p></div><div style=\"background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8;\">Copyright {{year}} Bienestar Digital. Todos los derechos reservados.</div></div></div>",
      "variables": "[{\"key\":\"admin_name\",\"desc\":\"Nombre del admin\"},{\"key\":\"recovery_url\",\"desc\":\"Enlace temporal para redefinir clave\"},{\"key\":\"year\",\"desc\":\"Año actual\"}]",
      "is_system": 1,
      "created_at": "2026-06-23T00:35:00.000Z",
      "updated_at": "2026-06-23T00:35:00.000Z"
    }
  ],
  "system_parameters": [
    {
      "id": 1,
      "key": "free_tier_categories_limit",
      "value": "7",
      "description": "Max categorias de menu en el tier gratuito",
      "category": "upgrades",
      "updated_at": "2026-06-29T16:24:21.594Z",
      "created_at": "2026-06-20T15:43:02.148Z"
    },
    {
      "id": 2,
      "key": "free_tier_products_limit",
      "value": "8",
      "description": "Max productos en el tier gratuito",
      "category": "upgrades",
      "updated_at": "2026-06-29T21:59:41.374Z",
      "created_at": "2026-06-20T15:43:02.148Z"
    },
    {
      "id": 3,
      "key": "influencer_reels_limit",
      "value": "3",
      "description": "Max reels con Estatus Influencer activo",
      "category": "upgrades",
      "updated_at": "2026-06-20T15:43:02.148Z",
      "created_at": "2026-06-20T15:43:02.148Z"
    },
    {
      "id": 4,
      "key": "free_tier_stores_limit",
      "value": "1",
      "description": "Max sedes operativas en el tier gratuito",
      "category": "upgrades",
      "updated_at": "2026-06-20T15:43:02.148Z",
      "created_at": "2026-06-20T15:43:02.148Z"
    }
  ],
  "protocol_rules_metadata": [
    {
      "param_key": "retention_penalty_rate",
      "label": "Tasa Penalización Retención",
      "description": "Fracción de la tarifa de servicio retenida por la plataforma cuando la sede cancela el pedido.",
      "actor": "Sede",
      "initiator": "Sede",
      "flow_trigger": "La sede cancela el pedido estando en estado Aceptado, Preparando, Listo o Listo para Despacho.",
      "applicable_states": "aceptado, preparando, listo, listo_despacho",
      "formula_hint": "Comisión de plataforma * tasa",
      "impact_note": "La plataforma retiene esta fracción ({val_pct}). El resto se le reembolsa a la sede."
    },
    {
      "param_key": "refund_standard_rate",
      "label": "Tasa Reembolso Estándar de Incidente",
      "description": "Fracción de la comisión de servicio del repartidor que se le devuelve si el pedido no se concreta por culpa del cliente.",
      "actor": "Repartidor",
      "initiator": "Cliente / Repartidor",
      "flow_trigger": "Cancelación en Listo para Despacho por cliente, o reporte de Incidente COD sin entrega.",
      "applicable_states": "listo_despacho, en_camino",
      "formula_hint": "Comisión del repartidor * tasa",
      "impact_note": "El repartidor/empresa de reparto recupera el {val_pct} de su costo de servicio pagado a la plataforma por la asignación."
    },
    {
      "param_key": "rescue_cashback_rate",
      "label": "Tasa Reembolso Cashback de Rescate",
      "description": "Fracción de la comisión de servicio devuelta al repartidor original que fue rescatado una vez que se completa el servicio.",
      "actor": "Repartidor Original",
      "initiator": "Repartidor",
      "flow_trigger": "Rescate exitoso del pedido por otro repartidor y entrega completada.",
      "applicable_states": "entregado",
      "formula_hint": "Comisión de servicio * tasa",
      "impact_note": "El conductor original que reportó el incidente recibe un cashback de fidelidad del {val_pct}."
    },
    {
      "param_key": "driver_cancellation_compensation_rate",
      "label": "Tasa de Compensación al Repartidor",
      "description": "Porcentaje de la tarifa de envío que recibe el repartidor si el pedido se cancela tardíamente por la sede o el cliente.",
      "actor": "Repartidor / Sede",
      "initiator": "Cliente / Sede",
      "flow_trigger": "Cancelación en estado Listo para Despacho (repartidor ya aceptó pero no ha salido).",
      "applicable_states": "listo_despacho",
      "formula_hint": "Tarifa de envío * tasa",
      "impact_note": "Se transfiere el {val_pct} de la tarifa del envío de la sede al repartidor. Si la sede no tiene saldo, se genera compensación automática (deuda)."
    },
    {
      "param_key": "driver_cancel_pre_pickup_refund_rate",
      "label": "Reembolso Repartidor Pre-Pickup",
      "description": "Fracción de la comisión de servicio devuelta al repartidor si cancela la entrega antes de retirar los productos.",
      "actor": "Repartidor",
      "initiator": "Repartidor",
      "flow_trigger": "El repartidor cancela de manera autónoma antes de realizar la recogida (pickup).",
      "applicable_states": "listo_despacho",
      "formula_hint": "Comisión del repartidor * tasa",
      "impact_note": "El repartidor recupera el {val_pct} de su comisión, perdiendo el resto como costo de penalización."
    },
    {
      "param_key": "driver_cancel_post_pickup_penalty_rate",
      "label": "Penalización Repartidor Post-Pickup",
      "description": "Multiplicador de penalización del valor de los productos cobrado al repartidor si cancela después de retirar el pedido.",
      "actor": "Repartidor",
      "initiator": "Repartidor",
      "flow_trigger": "El repartidor cancela de manera autónoma después de realizar la recogida (en ruta).",
      "applicable_states": "en_camino",
      "formula_hint": "Valor de productos * tasa",
      "impact_note": "Se genera una deuda de Compensación Automática al repartidor por el {val_pct} del valor de los productos que quedaron en su poder."
    },
    {
      "param_key": "customer_cancel_store_refund_prep_rate",
      "label": "Reembolso Sede en Preparación",
      "description": "Fracción del costo de los productos transferida a la sede si el cliente cancela mientras el pedido está en preparación.",
      "actor": "Sede / Cliente",
      "initiator": "Cliente",
      "flow_trigger": "El cliente cancela el pedido en estado Aceptado, Preparando o Listo.",
      "applicable_states": "aceptado, preparando, listo",
      "formula_hint": "Valor de productos * tasa",
      "impact_note": "La sede es compensada con el {val_pct} del valor de los productos preparados."
    },
    {
      "param_key": "customer_cancel_client_refund_prep_rate",
      "label": "Reembolso Cliente en Preparación",
      "description": "Fracción del costo de los productos reembolsada al cliente si cancela estando en preparación.",
      "actor": "Cliente",
      "initiator": "Cliente",
      "flow_trigger": "El cliente cancela el pedido en estado Aceptado, Preparando o Listo.",
      "applicable_states": "aceptado, preparando, listo",
      "formula_hint": "Valor de productos * tasa",
      "impact_note": "El cliente recupera el {val_pct} del valor de los productos en DOMIs como abono de fidelización."
    },
    {
      "param_key": "customer_cancel_sys_retain_prep_rate",
      "label": "Retención Sistema en Preparación",
      "description": "Fracción del costo de los productos retenida por la plataforma como costo administrativo en preparación.",
      "actor": "Sistema / Cliente",
      "initiator": "Cliente",
      "flow_trigger": "El cliente cancela el pedido en estado Aceptado, Preparando o Listo.",
      "applicable_states": "aceptado, preparando, listo",
      "formula_hint": "Valor de productos * tasa",
      "impact_note": "El sistema retiene el {val_pct} para el fondo de fidelización."
    },
    {
      "param_key": "customer_cancel_driver_delivery_pct_dispatch",
      "label": "Porcentaje Domicilio cobrado al cliente en listo_despacho",
      "description": "Fracción de la tarifa de envío cobrada al cliente cuando cancela en listo_despacho. El repartidor fue asignado pero no recogió.",
      "actor": "Cliente",
      "initiator": "Cliente",
      "flow_trigger": "El cliente cancela el pedido en estado Listo para Despacho.",
      "applicable_states": "listo_despacho",
      "formula_hint": "Tarifa de envío * tasa",
      "impact_note": "El cliente es cargado con el {val_pct} de la tarifa de envío."
    },
    {
      "param_key": "score_penalty_cash_cancel_dispatch",
      "label": "Penalización Score cancelación COD listo_despacho",
      "description": "Puntos de Score que se descuentan al cliente cuando cancela un pedido COD en estado Listo para Despacho.",
      "actor": "Cliente",
      "initiator": "Cliente",
      "flow_trigger": "El cliente cancela el pedido COD en estado Listo para Despacho.",
      "applicable_states": "listo_despacho",
      "formula_hint": "Valor de la penalización",
      "impact_note": "Se restan {val} puntos de Score al cliente."
    },
    {
      "param_key": "score_penalty_domi_cancel_dispatch",
      "label": "Penalización Score cancelación DOMI listo_despacho",
      "description": "Puntos de Score que se descuentan al cliente cuando cancela un pedido pagado con DOMIs en estado Listo para Despacho.",
      "actor": "Cliente",
      "initiator": "Cliente",
      "flow_trigger": "El cliente cancela el pedido pagado con DOMIs en estado Listo para Despacho.",
      "applicable_states": "listo_despacho",
      "formula_hint": "Valor de la penalización",
      "impact_note": "Se restan {val} puntos de Score al cliente."
    },
    {
      "param_key": "customer_cancel_driver_commission_refund_transit_rate",
      "label": "Anticipo de Comisión Repartidor en Tránsito (COD)",
      "description": "Porcentaje de la comisión de servicio del repartidor (snapshot) que el sistema le devuelve como anticipo al cancelar un pedido COD en estado En Camino. Se recupera automáticamente cuando el cliente paga su Compensación Automática.",
      "actor": "Repartidor",
      "initiator": "Cliente",
      "flow_trigger": "El cliente cancela el pedido COD en estado En Camino. El repartidor ya tiene los productos consigo y los retiene físicamente.",
      "applicable_states": "en_camino",
      "payment_methods": "COD",
      "formula_hint": "Comisión del repartidor (snapshot) * tasa",
      "impact_note": "El repartidor recibe el {val_pct} de su comisión como anticipo de compensación. Este anticipo se recupera cuando el cliente pague su deuda."
    },
    {
      "param_key": "platform_processing_fee_rate",
      "label": "Tasa de Procesamiento de la Plataforma",
      "description": "Porcentaje estándar retenido por la plataforma sobre pagos de deudas por cancelación. Se aplica al total efectivamente cobrado al cliente al saldar una Compensación Automática.",
      "actor": "Sistema",
      "initiator": "Cliente",
      "flow_trigger": "El cliente paga su Compensación Automática originada por cancelar un pedido COD en estado En Camino o Listo para Despacho.",
      "applicable_states": "listo_despacho, en_camino",
      "payment_methods": "COD",
      "formula_hint": "Total pagado * tasa",
      "impact_note": "El sistema retiene el {val_pct} del total pagado como costo de procesamiento. Por ejemplo: sobre 10.000 COP se retienen 40 COP."
    },
    {
      "param_key": "customer_cancel_store_commission_refund_dispatch_rate",
      "label": "Anticipo Comisión Sede en Despacho (COD)",
      "description": "Porcentaje de la comisión de servicio de la sede (snapshot) que el sistema le devuelve como anticipo al cancelar un pedido COD en estado Listo para Despacho. Se recupera automáticamente cuando el cliente paga su deuda.",
      "actor": "Sede",
      "initiator": "Cliente",
      "flow_trigger": "El cliente cancela el pedido COD en estado Listo para Despacho.",
      "applicable_states": "listo_despacho",
      "payment_methods": "COD",
      "formula_hint": "Comisión de la sede (snapshot) * tasa",
      "impact_note": "La sede recibe el {val_pct} de su comisión de servicio como anticipo de compensación. Este anticipo se recupera cuando el cliente pague su deuda."
    },
    {
      "param_key": "customer_cancel_driver_commission_refund_dispatch_rate",
      "label": "Anticipo Comisión Repartidor en Despacho (COD)",
      "description": "Porcentaje de la comisión de servicio del repartidor (snapshot) que el sistema le devuelve como anticipo al cancelar un pedido COD en estado Listo para Despacho. Se recupera automáticamente cuando el cliente paga su deuda.",
      "actor": "Repartidor",
      "initiator": "Cliente",
      "flow_trigger": "El cliente cancela el pedido COD en estado Listo para Despacho.",
      "applicable_states": "listo_despacho",
      "payment_methods": "COD",
      "formula_hint": "Comisión del repartidor (snapshot) * tasa",
      "impact_note": "El repartidor recibe el {val_pct} de su comisión de servicio como anticipo de compensación. Este anticipo se recupera cuando el cliente pague su deuda."
    },

    {
      "param_key": "delivery_base_fare_cop",
      "label": "Tarifa Base del Domicilio (COP)",
      "description": "Costo mínimo del domicilio en pesos colombianos. Aplica para distancias iguales o menores a la distancia base.",
      "actor": "Cliente / Repartidor",
      "initiator": "Cliente",
      "flow_trigger": "El cliente realiza un pedido y se calcula la tarifa de domicilio.",
      "applicable_states": "pendiente",
      "formula_hint": "Fija para distancias ≤ distancia base",
      "impact_note": "El cliente paga mínimo {val} COP por su domicilio."
    },
    {
      "param_key": "delivery_base_distance_km",
      "label": "Distancia Base Incluida (km)",
      "description": "Radio de cobertura en kilómetros incluido en la tarifa base sin costo adicional.",
      "actor": "Cliente / Repartidor",
      "initiator": "Cliente",
      "flow_trigger": "El cliente realiza un pedido y se calcula la tarifa de domicilio.",
      "applicable_states": "pendiente",
      "formula_hint": "Radio base",
      "impact_note": "Pedidos dentro de {val} km pagan solo la tarifa base."
    },
    {
      "param_key": "delivery_extra_rate_cop_per_km",
      "label": "Tarifa Extra por Km Adicional (COP)",
      "description": "Valor en COP cobrado por cada kilómetro que supere la distancia base.",
      "actor": "Cliente / Repartidor",
      "initiator": "Cliente",
      "flow_trigger": "El cliente realiza un pedido a una distancia superior a la distancia base.",
      "applicable_states": "pendiente",
      "formula_hint": "(distancia - base) * tasa",
      "impact_note": "Por cada km extra se suman {val} COP al total del domicilio."
    },
    {
      "param_key": "delivery_max_distance_km",
      "label": "Distancia Máxima de Cobertura (km)",
      "description": "Límite de cobertura del servicio (punta a punta de la ciudad).",
      "actor": "Sistema",
      "initiator": "Cliente",
      "flow_trigger": "El cliente intenta realizar un pedido a cualquier distancia.",
      "applicable_states": "pendiente",
      "formula_hint": "Límite de cobertura",
      "impact_note": "El servicio cubre hasta {val} km. Pedidos más lejanos son rechazados."
    },
    {
      "param_key": "driver_rescue_commission_refund_rate",
      "label": "Tasa de Reembolso Comisión en Rescate",
      "description": "Fracción de la comisión de servicio devuelta al repartidor original si el rescatista completa la entrega con éxito.",
      "actor": "Repartidor Original",
      "initiator": "Sistema",
      "flow_trigger": "Rescate de orden completado con éxito.",
      "applicable_states": "en_rescate",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "driver_rescue_timeout_minutes",
      "label": "Tiempo Límite de Rescate (Minutos)",
      "description": "Tiempo en minutos para encontrar un rescatista y completar la entrega antes de auto-cancelar la orden.",
      "actor": "Sistema",
      "initiator": "Sistema",
      "flow_trigger": "La orden entra en estado en_rescate.",
      "applicable_states": "en_rescate",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "driver_rescue_max_attempts",
      "label": "Intentos Máximos de Rescate",
      "description": "Cantidad de veces máxima que un rescatista puede aceptar y fallar antes de cancelar el pedido definitivamente.",
      "actor": "Sistema",
      "initiator": "Sistema",
      "flow_trigger": "El rescatista asignado desiste del rescate.",
      "applicable_states": "en_rescate",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "driver_penalty_points_rescue_original",
      "label": "Puntos Penalización Conductor Rescatado",
      "description": "Puntos de penalización de prioridad aplicados al conductor original cuando su pedido es rescatado con éxito.",
      "actor": "Repartidor Original",
      "initiator": "Sistema",
      "flow_trigger": "Rescate exitoso del pedido.",
      "applicable_states": "en_rescate",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "driver_rescue_chain_penalty_points",
      "label": "Puntos Penalización Rescatista que Falla",
      "description": "Puntos de penalización de prioridad aplicados a un rescatista que acepta el servicio de rescate y desiste.",
      "actor": "Repartidor Rescatista",
      "initiator": "Repartidor",
      "flow_trigger": "El rescatista cancela el rescate asignado.",
      "applicable_states": "en_rescate",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "minimum_delivery_rate",
      "label": "Tarifa Mínima de Domicilio (COP)",
      "description": "Costo fiduciario mínimo por un servicio de domicilio en el ecosistema. Es la base para calcular la solvencia de la sede.",
      "actor": "Sede",
      "initiator": "Sistema",
      "flow_trigger": "Cálculo de solvencia de apertura de turno de la sede.",
      "applicable_states": "pendiente",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "store_solvency_delivery_multiplier",
      "label": "Multiplicador de Tarifa Mínima para Solvencia de Sede",
      "description": "Factor multiplicador aplicado a la tarifa mínima de domicilio para calcular el saldo de garantía requerido para operar.",
      "actor": "Sede",
      "initiator": "Sistema",
      "flow_trigger": "Apertura de turno o inicio de sesión de sede.",
      "applicable_states": "pendiente",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "solvency_commission_guarantee_fraction",
      "label": "Fracción de Garantía de Solvencia (Comisiones)",
      "description": "Porcentaje de las comisiones operativas (sede + repartidor) requerido como respaldo al aceptar/crear una orden.",
      "actor": "Repartidor / Sede",
      "initiator": "Sistema",
      "flow_trigger": "Aceptación de oferta de reparto o creación de orden.",
      "applicable_states": "pendiente, aceptado",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "store_cancel_client_indemnity_domi_amount",
      "label": "Indemnización Cliente por Cancelación de Sede (DOMIs)",
      "description": "Bono fijo en DOMIs pagado al cliente por la sede como indemnización cuando ésta cancela unilateralmente un pedido.",
      "actor": "Sede",
      "initiator": "Sede",
      "flow_trigger": "La sede cancela el pedido en estado preparando o despacho.",
      "applicable_states": "aceptado, preparando, listo, listo_despacho",
      "payment_methods": "DOMI"
    },
    {
      "param_key": "store_penalty_points_prep",
      "label": "Penalización Confiabilidad Sede en Preparación",
      "description": "Puntos acumulados de penalización de confiabilidad aplicados a la sede al cancelar en preparación.",
      "actor": "Sede",
      "initiator": "Sede",
      "flow_trigger": "La sede cancela estando en aceptado, preparando o listo.",
      "applicable_states": "aceptado, preparando, listo",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "store_penalty_points_dispatch",
      "label": "Penalización Confiabilidad Sede en Despacho",
      "description": "Puntos acumulados de penalización de confiabilidad aplicados a la sede al cancelar en listo_despacho.",
      "actor": "Sede",
      "initiator": "Sede",
      "flow_trigger": "La sede cancela en listo_despacho.",
      "applicable_states": "listo_despacho",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "driver_penalty_points_prep",
      "label": "Penalización Conductor en Preparación",
      "description": "Puntos acumulados de penalización de prioridad aplicados al conductor si cancela la asignación en preparación.",
      "actor": "Repartidor",
      "initiator": "Repartidor",
      "flow_trigger": "El repartidor cancela asignación en preparando/listo.",
      "applicable_states": "preparando, listo",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "driver_penalty_points_dispatch",
      "label": "Penalización Conductor en Despacho",
      "description": "Puntos acumulados de penalización de prioridad aplicados al conductor si cancela en listo_despacho.",
      "actor": "Repartidor",
      "initiator": "Repartidor",
      "flow_trigger": "El repartidor cancela asignación en listo_despacho.",
      "applicable_states": "listo_despacho",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "driver_penalty_points_transit",
      "label": "Penalización Conductor en Tránsito",
      "description": "Puntos acumulados de penalización de prioridad aplicados al conductor por abandono en tránsito.",
      "actor": "Repartidor",
      "initiator": "Repartidor",
      "flow_trigger": "El repartidor desiste del pedido en tránsito.",
      "applicable_states": "en_camino",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "store_cancel_driver_delivery_pct_rate",
      "label": "Porcentaje Domicilio Repartidor por Cancelación de Sede",
      "description": "Porcentaje de la tarifa de envío que el sistema paga al repartidor compensándolo si la sede cancela.",
      "actor": "Repartidor",
      "initiator": "Sede",
      "flow_trigger": "La sede cancela en preparando o listo_despacho.",
      "applicable_states": "preparando, listo, listo_despacho",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "store_cancel_client_indemnity_rate",
      "label": "Porcentaje Indemnización Cliente por Cancelación de Sede",
      "description": "Porcentaje de indemnización por perjuicios en valor de productos transferido al cliente por la sede al cancelar.",
      "actor": "Cliente",
      "initiator": "Sede",
      "flow_trigger": "La sede cancela el pedido.",
      "applicable_states": "aceptado, preparando, listo_despacho",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "customer_cancel_driver_delivery_pct_dispatch_rate",
      "label": "Porcentaje Domicilio Repartidor en Despacho (Cliente)",
      "description": "Fracción de la tarifa del envío cobrada al cliente y pagada al repartidor si cancela en listo_despacho.",
      "actor": "Repartidor",
      "initiator": "Cliente",
      "flow_trigger": "El cliente cancela en listo_despacho.",
      "applicable_states": "listo_despacho",
      "payment_methods": "DOMI / COD"
    },
    {
      "param_key": "driver_commission_refund_on_store_cancel_rate",
      "label": "Reembolso Comisión Repartidor por Cancelación de Sede",
      "description": "Porcentaje de la comisión de servicio devuelto al repartidor (del sistema) si la sede cancela.",
      "actor": "Repartidor",
      "initiator": "Sede",
      "flow_trigger": "La sede cancela el pedido.",
      "applicable_states": "preparando, listo, listo_despacho",
      "payment_methods": "DOMI / COD"
    }
  ],
  "system_navigation": [
    { "id": 1, "parent_id": null, "label": "Inicio", "page_title": "Panel de Control", "path": "/admin/dashboard", "icon": "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", "required_permission": "access_admin_dashboard", "order_index": 10, "layout_scope": "admin", "risk_level": "normal", "is_system": 1 },
    { "id": 2, "parent_id": null, "label": "Afiliaciones", "page_title": null, "path": null, "icon": "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", "required_permission": null, "order_index": 20, "layout_scope": "admin", "risk_level": "normal", "is_system": 1 },
    { "id": 3, "parent_id": 2, "label": "Solicitudes de Registro", "page_title": "Solicitudes de Afiliación", "path": "/admin/dashboard/requests", "icon": null, "required_permission": "manage_registration_requests", "order_index": 10, "layout_scope": "admin", "risk_level": "normal", "is_system": 1 },
    { "id": 4, "parent_id": 2, "label": "Plantillas de Correo", "page_title": "Plantillas de Correo", "path": "/admin/dashboard/email-templates", "icon": null, "required_permission": "manage_email_templates", "order_index": 20, "layout_scope": "admin", "risk_level": "normal", "is_system": 1 },
    { "id": 5, "parent_id": 2, "label": "Catalogo Comercios", "page_title": "Catálogo de Comercios", "path": "/admin/dashboard/commerce", "icon": null, "required_permission": "view_commerces", "order_index": 30, "layout_scope": "admin", "risk_level": "normal", "is_system": 1 },
    { "id": 6, "parent_id": 2, "label": "Catálogo de Mejoras", "page_title": "Catálogo de Mejoras", "path": "/admin/dashboard/system/upgrades", "icon": null, "required_permission": "manage_upgrades_catalog", "order_index": 40, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 7, "parent_id": null, "label": "Caja y Bancos", "page_title": null, "path": null, "icon": "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 12H9v-2h6v2zm0-4H9V10h6v2z", "required_permission": null, "order_index": 30, "layout_scope": "admin", "risk_level": "normal", "is_system": 1 },
    { "id": 8, "parent_id": 7, "label": "Movimientos de Caja", "page_title": "Movimientos de Caja", "path": "/admin/dashboard/cash", "icon": null, "required_permission": "view_cash_vault", "order_index": 10, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 9, "parent_id": null, "label": "Seguridad y RBAC", "page_title": null, "path": null, "icon": "M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z", "required_permission": null, "order_index": 40, "layout_scope": "admin", "risk_level": "normal", "is_system": 1 },
    { "id": 10, "parent_id": 9, "label": "Usuarios y Permisos", "page_title": "Gestión de Usuarios", "path": "/admin/dashboard/users", "icon": null, "required_permission": "create_system_user", "order_index": 10, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 11, "parent_id": 9, "label": "Roles y Accesos", "page_title": "Roles y Accesos", "path": "/admin/dashboard/roles", "icon": null, "required_permission": "manage_rbac", "order_index": 20, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 12, "parent_id": 9, "label": "Análisis de Permisos", "page_title": "Análisis de Permisos", "path": "/admin/dashboard/roles/analysis", "icon": null, "required_permission": "manage_rbac", "order_index": 30, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 13, "parent_id": 9, "label": "Bitácora Antifraude", "page_title": "Bitácora de Seguridad", "path": "/admin/dashboard/security", "icon": null, "required_permission": "view_security_logs", "order_index": 40, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 14, "parent_id": null, "label": "Motor Financiero", "page_title": null, "path": null, "icon": "M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z", "required_permission": null, "order_index": 50, "layout_scope": "admin", "risk_level": "normal", "is_system": 1 },
    { "id": 15, "parent_id": 14, "label": "Billetera Global", "page_title": "Billetera Global", "path": "/admin/dashboard/wallet", "icon": null, "required_permission": "view_ledger", "order_index": 10, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 16, "parent_id": 14, "label": "Parametros del Protocolo", "page_title": "Parámetros del Protocolo", "path": "/admin/dashboard/domi/parameters", "icon": null, "required_permission": "manage_protocol_rules", "order_index": 20, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 17, "parent_id": 14, "label": "Tesorería de DOMIs", "page_title": "Tesorería de DOMIs", "path": "/admin/dashboard/domi/treasury", "icon": null, "required_permission": "mint_domi_cash", "order_index": 30, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 18, "parent_id": 14, "label": "Libro Mayor (Ledger)", "page_title": "Libro Mayor", "path": "/admin/dashboard/ledger", "icon": null, "required_permission": "view_ledger", "order_index": 40, "layout_scope": "admin", "risk_level": "critical", "is_system": 1 },
    { "id": 19, "parent_id": null, "label": "Mantenimiento y Control", "page_title": null, "path": null, "icon": "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z", "required_permission": null, "order_index": 60, "layout_scope": "admin", "risk_level": "normal", "is_system": 1 },
    { "id": 20, "parent_id": 19, "label": "Estado Mantenimiento", "page_title": "Estado del Sistema", "path": "/admin/dashboard/system", "icon": null, "required_permission": "view_maintenance_status", "order_index": 10, "layout_scope": "admin", "risk_level": "critical", "is_system": 1 },
    { "id": 21, "parent_id": 19, "label": "Excepciones de Bypass", "page_title": "Reglas de Bypass", "path": "/admin/dashboard/system/bypass", "icon": null, "required_permission": "view_maintenance_status", "order_index": 20, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 22, "parent_id": 19, "label": "Cronjobs del Sistema", "page_title": "Cronjobs del Sistema", "path": "/admin/dashboard/cronjobs", "icon": null, "required_permission": "view_security_logs", "order_index": 30, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    { "id": 23, "parent_id": 19, "label": "Inteligencia Semántica", "page_title": "Inteligencia Semántica", "path": "/admin/dashboard/intelligence", "icon": null, "required_permission": "manage_intelligence", "order_index": 40, "layout_scope": "admin", "risk_level": "normal", "is_system": 1 },
    { "id": 40, "parent_id": 19, "label": "Gestión de Menú", "page_title": "Gestión de Menú", "path": "/admin/dashboard/system/navigation", "icon": null, "required_permission": "manage_system_navigation", "order_index": 50, "layout_scope": "admin", "risk_level": "high", "is_system": 1 },
    
    { "id": 24, "parent_id": null, "label": "Inicio", "page_title": "Panel de Control", "path": "/commerce/dashboard", "icon": "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", "required_permission": "access_commerce_dashboard", "order_index": 10, "layout_scope": "commerce", "risk_level": "normal", "is_system": 1 },
    { "id": 25, "parent_id": null, "label": "Resumen Financiero", "page_title": "Resumen Financiero", "path": "/commerce/financial-summary", "icon": "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z", "required_permission": "view_store_financial_summary", "order_index": 20, "layout_scope": "commerce", "risk_level": "normal", "is_system": 1 },
    { "id": 26, "parent_id": null, "label": "Mi Billetera", "page_title": "Mi Billetera DOMI", "path": "/commerce/wallet", "icon": "M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2-.9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z", "required_permission": "view_commerce_wallet", "order_index": 30, "layout_scope": "commerce", "risk_level": "normal", "is_system": 1 },
    { "id": 27, "parent_id": null, "label": "Administrar Sedes", "page_title": "Gestión de Sedes", "path": "/commerce/store-admins", "icon": "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z", "required_permission": "view_commerce_stores_menu", "order_index": 40, "layout_scope": "commerce", "risk_level": "normal", "is_system": 1 },
    { "id": 28, "parent_id": null, "label": "Mercado de Mejoras", "page_title": "Mercado de Mejoras", "path": "/commerce/upgrades", "icon": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z", "required_permission": "view_upgrades_market", "order_index": 50, "layout_scope": "commerce", "risk_level": "normal", "is_system": 1 },
    { "id": 29, "parent_id": null, "label": "Mi Perfil", "page_title": "Perfil del Comercio", "path": "/commerce/profile", "icon": "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", "required_permission": "view_commerce_profile", "order_index": 60, "layout_scope": "commerce", "risk_level": "normal", "is_system": 1 },

    { "id": 30, "parent_id": null, "label": "Inicio", "page_title": "Panel de Control", "path": "/commerce/dashboard", "icon": "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", "required_permission": "access_store_dashboard", "order_index": 10, "layout_scope": "store", "risk_level": "normal", "is_system": 1 },
    { "id": 31, "parent_id": null, "label": "Resumen Financiero", "page_title": "Resumen Financiero", "path": "/commerce/stores/:storeId/financial-summary", "icon": "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z", "required_permission": "view_store_financial_summary", "order_index": 20, "layout_scope": "store", "risk_level": "normal", "is_system": 1 },
    { "id": 32, "parent_id": null, "label": "Mi Sede", "page_title": "Perfil de la Sede", "path": "/commerce/stores/:storeId/profile", "icon": "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", "required_permission": "view_store_profile", "order_index": 30, "layout_scope": "store", "risk_level": "normal", "is_system": 1 },
    { "id": 33, "parent_id": null, "label": "Gestión de Catálogo", "page_title": "Catálogo de Productos", "path": "/commerce/stores/:storeId/catalog", "icon": "M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z", "required_permission": "view_store_catalog_menu", "order_index": 40, "layout_scope": "store", "risk_level": "normal", "is_system": 1 },
    { "id": 34, "parent_id": null, "label": "Mi Billetera", "page_title": "Mi Billetera DOMI", "path": "/commerce/wallet", "icon": "M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2-.9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z", "required_permission": "view_store_wallet", "order_index": 50, "layout_scope": "store", "risk_level": "normal", "is_system": 1 },
    { "id": 35, "parent_id": null, "label": "Mercado de Mejoras", "page_title": "Mercado de Mejoras", "path": "/commerce/upgrades", "icon": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z", "required_permission": "view_upgrades_market", "order_index": 60, "layout_scope": "store", "risk_level": "normal", "is_system": 1 },

    { "id": 36, "parent_id": null, "label": "Inicio", "page_title": "Panel de Control de Delivery", "path": "/delivery-company/dashboard", "icon": "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", "required_permission": "access_delivery_dashboard", "order_index": 10, "layout_scope": "delivery", "risk_level": "normal", "is_system": 1 },
    { "id": 37, "parent_id": null, "label": "Resumen Financiero", "page_title": "Resumen Financiero", "path": "/delivery-company/financial-summary", "icon": "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z", "required_permission": "view_delivery_financial_summary", "order_index": 20, "layout_scope": "delivery", "risk_level": "normal", "is_system": 1 },
    { "id": 38, "parent_id": null, "label": "Mi Billetera", "page_title": "Mi Billetera DOMI", "path": "/delivery-company/wallet", "icon": "M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2-.9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z", "required_permission": "view_delivery_wallet", "order_index": 30, "layout_scope": "delivery", "risk_level": "normal", "is_system": 1 },
    { "id": 39, "parent_id": null, "label": "Gestionar Repartidores", "page_title": "Afiliar y Administrar Repartidores", "path": "/delivery-company/drivers", "icon": "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z", "required_permission": "view_delivery_drivers_menu", "order_index": 40, "layout_scope": "delivery", "risk_level": "normal", "is_system": 1 }
  ]
};


async function seed(connection) {
  const c = connection;
  console.log('--- DB SEEDING STARTED ---');
  await c.query('SET @domi_bypass_security = 1');
  await c.query('SET @domi_is_root = 1');

  // 1. Categories
  console.log('Seeding permission categories...');
  for (const cat of rbacData.categories) {
    await c.query(
      'INSERT IGNORE INTO permission_categories (id, name, description) VALUES (?, ?, ?)',
      [cat.id, cat.name, cat.description]
    );
  }

  // 2. Permissions
  console.log('Seeding permissions...');
  for (const p of rbacData.permissions) {
    await c.query(
      'INSERT IGNORE INTO permissions (id, category_id, name, description, display_name, criticidad, tipo, scope, ui_restriction_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p.id, p.category_id, p.name, p.description, p.display_name, p.criticidad, p.tipo, p.scope, p.ui_restriction_mode]
    );
  }

  // 3. Permission Endpoints
  console.log('Seeding permission endpoints...');
  for (const ep of rbacData.endpoints) {
    await c.query(
      'INSERT IGNORE INTO permission_endpoints (id, permission_id, method_path) VALUES (?, ?, ?)',
      [ep.id, ep.permission_id, ep.method_path]
    );
  }

  // 4. Permission Impacted Tables
  console.log('Seeding permission impacted tables...');
  for (const t of rbacData.impacted_tables) {
    await c.query(
      'INSERT IGNORE INTO permission_impacted_tables (id, permission_id, table_name) VALUES (?, ?, ?)',
      [t.id, t.permission_id, t.table_name]
    );
  }

  // 5. Roles
  console.log('Seeding roles...');
  for (const r of rbacData.roles) {
    await c.query(
      'INSERT IGNORE INTO roles (id, name, code, description, is_system) VALUES (?, ?, ?, ?, ?)',
      [r.id, r.name, r.code, r.description, r.is_system]
    );
  }

  // 6. Role Permissions mapping (Standard)
  console.log('Seeding role permissions...');
  for (const rp of rbacData.role_permissions) {
    await c.query(
      'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      [rp.role_id, rp.permission_id]
    );
  }

  // 7. Root Privilege Mapping (CROSS JOIN for root = 100% permissions)
  console.log('Mapping 100% permissions to root role...');
  const [rootRole] = await c.query('SELECT id FROM roles WHERE code = "root"');
  if (rootRole.length > 0) {
    const rootId = rootRole[0].id;
    await c.query(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id)
       SELECT ?, id FROM permissions`,
      [rootId]
    );
  }

  // 8. Token Registry (Peg peg)
  console.log('Seeding token registry...');
  for (const tr of configData.token_registry) {
    await c.query(
      'INSERT IGNORE INTO token_registry (id, symbol, name, decimals, fiat_peg_cop, protocol_version, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tr.id, tr.symbol, tr.name, tr.decimals, tr.fiat_peg_cop, tr.protocol_version, tr.integrity_hash]
    );
  }

  // 9. Protocol Rules
  console.log('Seeding protocol rules...');
  for (const pr of configData.protocol_rules) {
    await c.query(
      'INSERT IGNORE INTO protocol_rules (id, threshold_fiat_cop, base_cost_domis, percentage_rate, retention_penalty_rate, refund_standard_rate, rescue_cashback_rate, store_fixed_fee_cop, driver_fixed_fee_domi, cashback_rate_customer, score_min_for_cashback, max_monthly_yield_pct, cash_mint_expiry_days, min_domi_balance_driver, cod_capital_min_cop, driver_fixed_fee_cop, delivery_base_fare_cop, delivery_base_distance_km, delivery_extra_rate_cop_per_km, delivery_max_distance_km, max_balance_cop, free_withdrawals_per_month, withdrawal_fee_cop, score_cashback_win_base, min_collateral_ratio_post_adjust, store_subscription_fee_domi, commerce_subscription_fee_domi, wompi_min_purchase_cop, score_earned_on_purchase, score_earned_on_domi_purchase, score_penalty_domi_cancel_accepted, score_penalty_domi_cancel_in_transit, block_meters, score_penalty_domi_cancel_dispatch, score_penalty_cash_cancel_accepted, score_penalty_cash_cancel_in_transit, score_penalty_cash_cancel_dispatch, driver_cancellation_compensation_rate, driver_cancel_pre_pickup_refund_rate, driver_cancel_post_pickup_penalty_rate, customer_cancel_store_refund_prep_rate, customer_cancel_client_refund_prep_rate, customer_cancel_sys_retain_prep_rate, customer_cancel_driver_commission_refund_transit_rate, customer_cancel_store_commission_refund_dispatch_rate, customer_cancel_driver_commission_refund_dispatch_rate, customer_cancel_driver_delivery_pct_dispatch, platform_processing_fee_rate, driver_rescue_commission_refund_rate, driver_rescue_timeout_minutes, driver_rescue_max_attempts, driver_penalty_points_rescue_original, driver_rescue_chain_penalty_points, minimum_delivery_rate, store_solvency_delivery_multiplier, solvency_commission_guarantee_fraction, store_cancel_client_indemnity_domi_amount, store_penalty_points_prep, store_penalty_points_dispatch, driver_penalty_points_prep, driver_penalty_points_dispatch, driver_penalty_points_transit, store_cancel_driver_delivery_pct_rate, store_cancel_client_indemnity_rate, customer_cancel_driver_delivery_pct_dispatch_rate, driver_commission_refund_on_store_cancel_rate, effective_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        pr.id, pr.threshold_fiat_cop, pr.base_cost_domis, pr.percentage_rate, pr.retention_penalty_rate, pr.refund_standard_rate, pr.rescue_cashback_rate, pr.store_fixed_fee_cop, pr.driver_fixed_fee_domi, pr.cashback_rate_customer, pr.score_min_for_cashback, pr.max_monthly_yield_pct, pr.cash_mint_expiry_days, pr.min_domi_balance_driver, pr.cod_capital_min_cop, pr.driver_fixed_fee_cop, pr.delivery_base_fare_cop, pr.delivery_base_distance_km, pr.delivery_extra_rate_cop_per_km, pr.delivery_max_distance_km, pr.max_balance_cop, pr.free_withdrawals_per_month, pr.withdrawal_fee_cop, pr.score_cashback_win_base, pr.min_collateral_ratio_post_adjust, pr.store_subscription_fee_domi, pr.commerce_subscription_fee_domi, pr.wompi_min_purchase_cop, pr.score_earned_on_purchase, pr.score_earned_on_domi_purchase, pr.score_penalty_domi_cancel_accepted, pr.score_penalty_domi_cancel_in_transit, pr.block_meters, pr.score_penalty_domi_cancel_dispatch, pr.score_penalty_cash_cancel_accepted, pr.score_penalty_cash_cancel_in_transit, pr.score_penalty_cash_cancel_dispatch, pr.driver_cancellation_compensation_rate, pr.driver_cancel_pre_pickup_refund_rate, pr.driver_cancel_post_pickup_penalty_rate, pr.customer_cancel_store_refund_prep_rate, pr.customer_cancel_client_refund_prep_rate, pr.customer_cancel_sys_retain_prep_rate, pr.customer_cancel_driver_commission_refund_transit_rate, pr.customer_cancel_store_commission_refund_dispatch_rate, pr.customer_cancel_driver_commission_refund_dispatch_rate, pr.customer_cancel_driver_delivery_pct_dispatch, pr.platform_processing_fee_rate, pr.driver_rescue_commission_refund_rate, pr.driver_rescue_timeout_minutes, pr.driver_rescue_max_attempts, pr.driver_penalty_points_rescue_original, pr.driver_rescue_chain_penalty_points, pr.minimum_delivery_rate, pr.store_solvency_delivery_multiplier, pr.solvency_commission_guarantee_fraction, pr.store_cancel_client_indemnity_domi_amount, pr.store_penalty_points_prep, pr.store_penalty_points_dispatch, pr.driver_penalty_points_prep, pr.driver_penalty_points_dispatch, pr.driver_penalty_points_transit, pr.store_cancel_driver_delivery_pct_rate, pr.store_cancel_client_indemnity_rate, pr.customer_cancel_driver_delivery_pct_dispatch_rate, pr.driver_commission_refund_on_store_cancel_rate, pr.effective_date, pr.notes
      ]
    );
  }

  // 10. Upgrade Catalog
  console.log('Seeding upgrade catalog...');
  for (const uc of configData.upgrade_catalog) {
    await c.query(
      'INSERT IGNORE INTO upgrade_catalog (id, upgrade_key, label, description, icon, price_domis, duration_days, is_subscription, max_per_commerce, max_per_entity, benefit_scope, target_role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uc.id, uc.upgrade_key, uc.label, uc.description, uc.icon, uc.price_domis, uc.duration_days, uc.is_subscription, uc.max_per_commerce, uc.max_per_entity, uc.benefit_scope, uc.target_role, uc.is_active]
    );
  }

  // 11. System Financial Flags
  console.log('Seeding system financial flags...');
  for (const flag of configData.system_financial_flags) {
    await c.query(
      'INSERT IGNORE INTO system_financial_flags (id, `key`, enabled, label, description) VALUES (?, ?, ?, ?, ?)',
      [flag.id, flag.key, flag.enabled, flag.label, flag.description]
    );
  }

  // 12. Payment Platforms
  console.log('Seeding payment platforms...');
  for (const plat of configData.payment_platforms) {
    await c.query(
      'INSERT IGNORE INTO payment_platforms (id, nombre, tipo_entidad) VALUES (?, ?, ?)',
      [plat.id, plat.nombre, plat.tipo_entidad]
    );
  }

  // 13. Maintenance Bypass Rules
  console.log('Seeding maintenance bypass rules...');
  for (const rule of configData.maintenance_bypass_rules) {
    await c.query(
      'INSERT IGNORE INTO maintenance_bypass_rules (id, pattern, type, description, is_system) VALUES (?, ?, ?, ?, ?)',
      [rule.id, rule.pattern, rule.type, rule.description, rule.is_system]
    );
  }

  // 14. Domi Tier Rules
  console.log('Seeding domi tier rules...');
  for (const tr of configData.domi_tier_rules) {
    await c.query(
      'INSERT IGNORE INTO domi_tier_rules (id, tier, max_balance_domi, min_monthly_tx_domi, large_withdrawal_threshold_domi, cooldown_days, free_withdrawals_per_month, withdrawal_fee_cop, daily_withdrawal_limit_cop) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tr.id, tr.tier, tr.max_balance_domi, tr.min_monthly_tx_domi, tr.large_withdrawal_threshold_domi, tr.cooldown_days, tr.free_withdrawals_per_month, tr.withdrawal_fee_cop, tr.daily_withdrawal_limit_cop]
    );
  }

  // 15. Email Templates
  console.log('Seeding email templates...');
  for (const template of configData.email_templates) {
    await c.query(
      'INSERT IGNORE INTO email_templates (id, name, label, category, subject, html_body, variables, is_system) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [template.id, template.name, template.label, template.category, template.subject, template.html_body, template.variables, template.is_system]
    );
  }

  // 16. System Parameters
  console.log('Seeding system parameters...');
  for (const param of configData.system_parameters) {
    await c.query(
      'INSERT IGNORE INTO system_parameters (id, `key`, `value`, description, category) VALUES (?, ?, ?, ?, ?)',
      [param.id, param.key, param.value, param.description, param.category]
    );
  }

  // 16b. Protocol Rules Metadata
  console.log('Seeding protocol rules metadata...');
  for (const meta of configData.protocol_rules_metadata) {
    await c.query(
      'INSERT IGNORE INTO protocol_rules_metadata (param_key, label, description, actor, initiator, flow_trigger, applicable_states, payment_methods, formula_hint, impact_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [meta.param_key, meta.label, meta.description, meta.actor, meta.initiator || 'Sistema', meta.flow_trigger, meta.applicable_states, meta.payment_methods || 'Ambos', meta.formula_hint, meta.impact_note]
    );
  }
  // 16c. System Navigation Menu Items
  console.log('Seeding system navigation menu items...');
  for (const nav of configData.system_navigation) {
    await c.query(
      'INSERT IGNORE INTO system_navigation (id, parent_id, label, page_title, path, icon, required_permission, order_index, layout_scope, risk_level, is_system) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nav.id, nav.parent_id, nav.label, nav.page_title, nav.path, nav.icon, nav.required_permission, nav.order_index, nav.layout_scope, nav.risk_level, nav.is_system]
    );
  }


  // 17. System Users
  console.log('Seeding system users...');
  const passHash = await bcrypt.hash('admin123', 10);
  
  // Root user
  const [rootCheck] = await c.query('SELECT id FROM system_users WHERE email = "root@trendy.sytes.net"');
  let rootUserId;
  if (rootCheck.length === 0) {
    const [res] = await c.query(
      'INSERT INTO system_users (email, password_hash, nombres, apellidos, nivel, estado) VALUES ("root@trendy.sytes.net", ?, "Root", "SuperAdmin", "root", "activo")',
      [passHash]
    );
    rootUserId = res.insertId;
  } else {
    rootUserId = rootCheck[0].id;
  }
  
  const [rootRoleRecord] = await c.query('SELECT id FROM roles WHERE code = "root"');
  if (rootRoleRecord.length > 0) {
    await c.query(
      'INSERT IGNORE INTO user_roles (system_user_id, role_id) VALUES (?, ?)',
      [rootUserId, rootRoleRecord[0].id]
    );
  }

  // System user
  const [sysCheck] = await c.query('SELECT id FROM system_users WHERE email = "system@trendy.sytes.net"');
  let sysUserId;
  if (sysCheck.length === 0) {
    const [res] = await c.query(
      'INSERT INTO system_users (email, password_hash, nombres, apellidos, nivel, estado) VALUES ("system@trendy.sytes.net", ?, "System", "Admin", "system", "activo")',
      [passHash]
    );
    sysUserId = res.insertId;
  } else {
    sysUserId = sysCheck[0].id;
  }
  
  const [sysRoleRecord] = await c.query('SELECT id FROM roles WHERE code = "system_manager"');
  if (sysRoleRecord.length > 0) {
    await c.query(
      'INSERT IGNORE INTO user_roles (system_user_id, role_id) VALUES (?, ?)',
      [sysUserId, sysRoleRecord[0].id]
    );
  }

  // Seeding system wallet (Treasury)
  console.log('Seeding system wallet...');
  await c.query(
    'INSERT IGNORE INTO wallets (is_system, tier) VALUES (1, "system")'
  );

  // 18. Local Environment test data
  if (process.env.NODE_ENV !== 'production') {
    console.log('Seeding local development test data...');
    // Add local test data seeding logic here if needed
    await seedLocalTestData(c);
  }

  await c.query('SET @domi_bypass_security = NULL');
  await c.query('SET @domi_is_root = NULL');

  console.log('--- DB SEEDING COMPLETED SUCCESSFULLY ---');
}

async function seedLocalTestData(c) {
  // Encriptar contraseña para usuarios de prueba
  const passHash = await bcrypt.hash('admin123', 10);
  const customerPassHash = await bcrypt.hash('user123', 10);
  const driverPassHash = await bcrypt.hash('driver123', 10);

  // 1. Roles preestablecidos
  const [roles] = await c.query('SELECT code, id FROM roles');
  const roleIds = {};
  for (const r of roles) {
    roleIds[r.code] = r.id;
  }

  // 2. Crear usuarios administradores de comercios y sedes
  const testUsers = [
    { email: 'admin_commerce_1@trendy.sytes.net', nombres: 'Carlos Andrés', apellidos: 'Gómez Restrepo', cedula: '1000000001', telefono: '3000000001' },
    { email: 'admin_store_1@trendy.sytes.net', nombres: 'Sandro Rafael', apellidos: 'Gutiérrez Díaz', cedula: '1000000002', telefono: '3000000002' },
    { email: 'admin_store_2@trendy.sytes.net', nombres: 'Silvia Patricia', apellidos: 'Palacios Ortiz', cedula: '1000000003', telefono: '3000000003' },
    { email: 'admin_commerce_2@trendy.sytes.net', nombres: 'Tomás Alberto', apellidos: 'Mendoza Ruiz', cedula: '1000000004', telefono: '3000000004' },
    { email: 'admin_store_3@trendy.sytes.net', nombres: 'Yuli Andrea', apellidos: 'Rincón Castiblanco', cedula: '1000000005', telefono: '3000000005' },
    { email: 'admin_delivery_1@trendy.sytes.net', nombres: 'Diego Alejandro', apellidos: 'Torres Beltrán', cedula: '1000000006', telefono: '3000000006' }
  ];

  const adminUserIds = {};
  for (const tu of testUsers) {
    const [check] = await c.query('SELECT id FROM users WHERE email = ?', [tu.email]);
    if (check.length === 0) {
      const [res] = await c.query(
        'INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, "admin", "activo")',
        [tu.email, passHash]
      );
      const userId = res.insertId;
      adminUserIds[tu.email] = userId;

      // Crear Perfil
      await c.query(
        'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
        [userId, tu.nombres, tu.apellidos, tu.cedula, tu.telefono]
      );
    } else {
      const uId = check[0].id;
      adminUserIds[tu.email] = uId;
      // Asegurar que el perfil esté actualizado con datos reales de la semilla
      await c.query(
        'UPDATE profiles SET nombres = ?, apellidos = ?, cedula = ?, telefono = ? WHERE usuario_id = ?',
        [tu.nombres, tu.apellidos, tu.cedula, tu.telefono, uId]
      );
    }
  }

  // 3. Crear Comercios
  const commercesData = [
    { 
      email: 'admin_commerce_1@trendy.sytes.net', 
      nombre: 'Trattoria & Gourmet', 
      nit: '901234567-1', 
      nit_dv: '1', 
      type: 'Empresarial',
      telefono: '3102345678',
      ciudad: 'Bogotá',
      direccion: 'Carrera 7 # 100 - 01',
      logo_url: 'https://picsum.photos/600/400'
    },
    { 
      email: 'admin_commerce_2@trendy.sytes.net', 
      nombre: 'Taco Loco', 
      nit: '901234567-2', 
      nit_dv: '2', 
      type: 'Comercial',
      telefono: '3159876543',
      ciudad: 'Bogotá',
      direccion: 'Calle 85 # 11 - 53',
      logo_url: 'https://picsum.photos/600/400'
    }
  ];

  const commerceIds = {};
  for (const cd of commercesData) {
    const uId = adminUserIds[cd.email];
    const [check] = await c.query('SELECT id FROM commerces WHERE nit = ?', [cd.nit]);
    if (check.length === 0) {
      const [res] = await c.query(
        'INSERT INTO commerces (usuario_id, nombre, nit, nit_dv, status, type, telefono, ciudad, direccion, logo_url) VALUES (?, ?, ?, ?, "active", ?, ?, ?, ?, ?)',
        [uId, cd.nombre, cd.nit, cd.nit_dv, cd.type, cd.telefono, cd.ciudad, cd.direccion, cd.logo_url]
      );
      commerceIds[cd.nombre] = res.insertId;
      // Asignar rol commerce_manager
      await c.query(
        'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [uId, roleIds['commerce_manager']]
      );
    } else {
      commerceIds[cd.nombre] = check[0].id;
      // Actualizar todos los campos con información real
      await c.query(
        'UPDATE commerces SET nombre = ?, type = ?, telefono = ?, ciudad = ?, direccion = ?, logo_url = ? WHERE id = ?',
        [cd.nombre, cd.type, cd.telefono, cd.ciudad, cd.direccion, cd.logo_url, check[0].id]
      );
    }
  }

  // 4. Crear Sedes (Stores)
  const storesData = [
    { commerce: 'Trattoria & Gourmet', email: 'admin_store_1@trendy.sytes.net', sucursal: 'Chapinero', matricula: 'MAT-ST-001', direccion: 'Calle 62 #7-35, Bogotá', lat: 4.6482, lng: -74.0612, telefono: '3009998881', telefono_domicilio: '3009998881', image_url: 'https://picsum.photos/600/400', contacto_directo: 'Sandro Rafael Gutiérrez Díaz' },
    { commerce: 'Trattoria & Gourmet', email: 'admin_store_2@trendy.sytes.net', sucursal: 'Cedritos', matricula: 'MAT-ST-002', direccion: 'Calle 142 #19-20, Bogotá', lat: 4.7212, lng: -74.0412, telefono: '3009998882', telefono_domicilio: '3009998882', image_url: 'https://picsum.photos/600/400', contacto_directo: 'Silvia Patricia Palacios Ortiz' },
    { commerce: 'Taco Loco', email: 'admin_store_3@trendy.sytes.net', sucursal: 'Centro Yopal', matricula: 'MAT-ST-003', direccion: 'Carrera 20 #9-45, Yopal', lat: 5.3378, lng: -72.3958, telefono: '3009998883', telefono_domicilio: '3009998883', image_url: 'https://picsum.photos/600/400', contacto_directo: 'Yuli Andrea Rincón Castiblanco' }
  ];

  const storeIds = {};
  for (const sd of storesData) {
    const cId = commerceIds[sd.commerce];
    const uId = adminUserIds[sd.email];
    const [check] = await c.query('SELECT id FROM stores WHERE matricula = ?', [sd.matricula]);
    let storeId;
    if (check.length === 0) {
      const [res] = await c.query(
        'INSERT INTO stores (commerce_id, usuario_id, nombre_sucursal, matricula, direccion, latitud, longitud, estado, telefono, telefono_domicilio, image_url, contacto_directo) VALUES (?, ?, ?, ?, ?, ?, ?, "operativo", ?, ?, ?, ?)',
        [cId, uId, sd.sucursal, sd.matricula, sd.direccion, sd.lat, sd.lng, sd.telefono, sd.telefono_domicilio, sd.image_url, sd.contacto_directo]
      );
      storeId = res.insertId;
      storeIds[sd.sucursal] = storeId;
      // Asignar rol store_admin
      await c.query(
        'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [uId, roleIds['store_admin']]
      );
      // Vincular user_stores
      await c.query(
        'INSERT IGNORE INTO user_stores (user_id, store_id) VALUES (?, ?)',
        [uId, storeId]
      );
    } else {
      storeId = check[0].id;
      storeIds[sd.sucursal] = storeId;
      // Asegurar que el teléfono, el teléfono de domicilio, el nombre, la dirección, la imagen y el contacto directo estén actualizados
      await c.query(
        'UPDATE stores SET telefono = ?, telefono_domicilio = ?, nombre_sucursal = ?, direccion = ?, image_url = ?, contacto_directo = ? WHERE id = ?',
        [sd.telefono, sd.telefono_domicilio, sd.sucursal, sd.direccion, sd.image_url, sd.contacto_directo, storeId]
      );
    }

    // Seedar horarios de atención por defecto (Lunes a Domingo, 8am a 10pm)
    for (let day = 0; day <= 6; day++) {
      await c.query(
        'INSERT IGNORE INTO store_operating_hours (store_id, day_index, status, open_time, close_time, is_24h) VALUES (?, ?, "abierto", "08:00:00", "22:00:00", 0)',
        [storeId, day]
      );
    }
  }



  // 5. Crear Delivery Company
  const [dcCheck] = await c.query('SELECT id FROM delivery_companies WHERE nit = "900999888-1"');
  let dcId;
  const dcUserId = adminUserIds['admin_delivery_1@trendy.sytes.net'];
  if (dcCheck.length === 0) {
    const [res] = await c.query(
      'INSERT INTO delivery_companies (usuario_id, nit, razon_social, estado) VALUES (?, "900999888-1", "Servicios de Reparto Bogotá", "activo")',
      [dcUserId]
    );
    dcId = res.insertId;
    await c.query(
      'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [dcUserId, roleIds['delivery_company_admin']]
    );
  } else {
    dcId = dcCheck[0].id;
  }

  // 6. Crear Repartidores
  const drivers = [
    { email: 'driver_1@trendy.sytes.net', nombres: 'Danilo', apellidos: 'Driver Uno', cedula: '2000000001', telefono: '3100000001' },
    { email: 'driver_2@trendy.sytes.net', nombres: 'Doris', apellidos: 'Driver Dos', cedula: '2000000002', telefono: '3100000002' },
    { email: 'driver_3@trendy.sytes.net', nombres: 'Darío', apellidos: 'Driver Tres', cedula: '2000000003', telefono: '3100000003' }
  ];

  for (const dr of drivers) {
    const [check] = await c.query('SELECT id FROM users WHERE email = ?', [dr.email]);
    if (check.length === 0) {
      const [res] = await c.query(
        'INSERT INTO users (email, password_hash, rol, es_repartidor, repartidor_activo, estado) VALUES (?, ?, "customer", 1, 1, "activo")',
        [dr.email, driverPassHash]
      );
      const userId = res.insertId;
      await c.query(
        'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono, delivery_company_id) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, dr.nombres, dr.apellidos, dr.cedula, dr.telefono, dcId]
      );
      await c.query(
        'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [userId, roleIds['driver']]
      );
    }
  }

  // 7. Crear Clientes
  const customers = [
    { email: 'customer_1@trendy.sytes.net', nombres: 'Camila', apellidos: 'Cliente Uno', cedula: '3000000001', telefono: '3200000001' },
    { email: 'customer_2@trendy.sytes.net', nombres: 'César', apellidos: 'Cliente Dos', cedula: '3000000002', telefono: '3200000002' }
  ];

  for (const cust of customers) {
    const [check] = await c.query('SELECT id FROM users WHERE email = ?', [cust.email]);
    if (check.length === 0) {
      const [res] = await c.query(
        'INSERT INTO users (email, password_hash, rol, es_repartidor, estado) VALUES (?, ?, "customer", 0, "activo")',
        [cust.email, customerPassHash]
      );
      const userId = res.insertId;
      await c.query(
        'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
        [userId, cust.nombres, cust.apellidos, cust.cedula, cust.telefono]
      );
      await c.query(
        'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [userId, roleIds['customer']]
      );
    }
  }

  // 8. Crear Catálogos, Ingredientes y Productos de prueba
  console.log('Seeding test ingredients...');
  const testIngredients = [
    { nombre: 'Carne Angus', es_alergeno: 0 },
    { nombre: 'Queso Cheddar', es_alergeno: 1 },
    { nombre: 'Pan Brioche', es_alergeno: 1 },
    { nombre: 'Tomate', es_alergeno: 0 },
    { nombre: 'Lechuga', es_alergeno: 0 },
    { nombre: 'Salchicha Alemana', es_alergeno: 0 },
    { nombre: 'Papas en Cabello de Ángel', es_alergeno: 0 }
  ];

  const ingredientIds = {};
  for (const ing of testIngredients) {
    const [ingCheck] = await c.query('SELECT id FROM ingredients WHERE nombre = ?', [ing.nombre]);
    if (ingCheck.length === 0) {
      const [res] = await c.query('INSERT INTO ingredients (nombre, es_alergeno) VALUES (?, ?)', [ing.nombre, ing.es_alergeno]);
      ingredientIds[ing.nombre] = res.insertId;
    } else {
      ingredientIds[ing.nombre] = ingCheck[0].id;
    }
  }

  console.log('Seeding menus, categories, and products for test stores...');
  const menuNames = ['Menú Principal'];
  for (const storeName of Object.keys(storeIds)) {
    const storeId = storeIds[storeName];
    for (const mn of menuNames) {
      const [menuCheck] = await c.query('SELECT id FROM menus WHERE store_id = ? AND nombre = ? AND deleted_at IS NULL', [storeId, mn]);
      let menuId;
      if (menuCheck.length === 0) {
        const [res] = await c.query(
          'INSERT INTO menus (store_id, nombre, descripcion, disponible) VALUES (?, ?, "Catálogo principal de la sede", 1)',
          [storeId, mn]
        );
        menuId = res.insertId;
      } else {
        menuId = menuCheck[0].id;
      }

      // Crear exactamente 3 Categorías
      const catNames = ['Platos Fuertes', 'Entradas', 'Bebidas y Postres'];
      for (const cn of catNames) {
        const [catCheck] = await c.query('SELECT id FROM categorias WHERE menu_id = ? AND nombre = ? AND deleted_at IS NULL', [menuId, cn]);
        let catId;
        if (catCheck.length === 0) {
          const [res] = await c.query(
            'INSERT INTO categorias (menu_id, nombre, descripcion, disponible) VALUES (?, ?, ?, 1)',
            [menuId, cn, `Variedad de ${cn.toLowerCase()} seleccionados.`]
          );
          catId = res.insertId;
        } else {
          catId = catCheck[0].id;
        }

        // Crear exactamente 5 Productos por Categoría
        const prodData = cn === 'Platos Fuertes' ? [
          { name: 'Hamburguesa Angus Premium', price: 24900.00, prep_time: 15, description: 'Hamburguesa con 150g de carne Angus premium, queso cheddar derretido, lechuga fresca, tomate en rodajas y salsa de la casa en pan brioche artesanal.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Pizza Especial de la Casa', price: 28900.00, prep_time: 18, description: 'Pizza artesanal mediana con salsa pomodoro, queso mozzarella, pepperoni, jamón, champiñones y pimentón fresco.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Tacos al Pastor (3 Unidades)', price: 18900.00, prep_time: 12, description: 'Tres deliciosos tacos con carne de cerdo marinada al pastor, piña, cebolla, cilantro fresco y salsa verde sobre tortillas de maíz.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Lasaña de Carne al Horno', price: 21900.00, prep_time: 20, description: 'Lasaña clásica con capas de pasta, carne boloñesa casera, salsa bechamel y abundante queso mozzarella gratinado.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Pollo Teriyaki con Arroz', price: 22900.00, prep_time: 15, description: 'Jugoso filete de pechuga de pollo bañado en salsa teriyaki, servido con arroz blanco y vegetales al wok.', image_url: 'https://picsum.photos/600/400' }
        ] : cn === 'Entradas' ? [
          { name: 'Papas Fritas Rústicas', price: 7900.00, prep_time: 8, description: 'Papas fritas de corte grueso sazonadas con sal marina y finas hierbas aromáticas.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Aros de Cebolla Crujientes', price: 8900.00, prep_time: 8, description: 'Aros de cebolla apanados y fritos a la perfección, acompañados de salsa BBQ de la casa.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Nachos con Guacamole', price: 12900.00, prep_time: 8, description: 'Totopos crujientes de maíz acompañados de guacamole fresco con pico de gallo y queso cheddar fundido.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Deditos de Queso (5 Und)', price: 9900.00, prep_time: 7, description: 'Cinco deditos de masa hojaldrada rellenos de queso mozzarella derretido, acompañados de salsa de piña.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Empanaditas Criollas (4 Und)', price: 8500.00, prep_time: 8, description: 'Cuatro empanaditas crocantes rellenas de carne desmechada y papa, acompañadas de ají casero.', image_url: 'https://picsum.photos/600/400' }
        ] : [
          { name: 'Coca-Cola Sabor Original 350ml', price: 4200.00, prep_time: 3, description: 'Refrescante Coca-Cola sabor original en botella de vidrio.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Jugo Natural de Lulo', price: 5500.00, prep_time: 5, description: 'Jugo natural de lulo fresco preparado al instante en agua purificada.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Limonada de Coco Fria', price: 7500.00, prep_time: 5, description: 'Deliciosa limonada cremosa de coco natural, hielo frapeado y leche condensada.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Volcán de Chocolate con Helado', price: 12500.00, prep_time: 12, description: 'Delicioso bizcocho de chocolate con centro líquido caliente, acompañado de helado de vainilla.', image_url: 'https://picsum.photos/600/400' },
          { name: 'Cheesecake de Frutos Rojos', price: 11900.00, prep_time: 5, description: 'Tarta cremosa de queso sobre base crujiente de galleta, cubierta con coulis artesanal de frutos rojos.', image_url: 'https://picsum.photos/600/400' }
        ];

        for (const pd of prodData) {
          const [prodCheck] = await c.query('SELECT id FROM products WHERE store_id = ? AND nombre = ? AND deleted_at IS NULL', [storeId, pd.name]);
          let productId;
          if (prodCheck.length === 0) {
            const [res] = await c.query(
              'INSERT INTO products (store_id, menu_id, categoria_id, nombre, precio_base, disponible, es_vegetariano, tiempo_prep_estimado, descripcion_larga, image_url) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?)',
              [storeId, menuId, catId, pd.name, pd.price, pd.prep_time, pd.description, pd.image_url]
            );
            productId = res.insertId;
          } else {
            productId = prodCheck[0].id;
            await c.query(
              'UPDATE products SET tiempo_prep_estimado = ?, descripcion_larga = ?, precio_base = ?, image_url = ? WHERE id = ?',
              [pd.prep_time, pd.description, pd.price, pd.image_url, productId]
            );
          }

          // Vincular ingredientes
          const ingNames = pd.name === 'Hamburguesa Angus Premium'
            ? ['Carne Angus', 'Queso Cheddar', 'Pan Brioche', 'Tomate', 'Lechuga']
            : [];

          for (const ingName of ingNames) {
            const ingId = ingredientIds[ingName];
            if (ingId) {
              await c.query(
                'INSERT IGNORE INTO product_ingredients (product_id, ingredient_id) VALUES (?, ?)',
                [productId, ingId]
              );
            }
          }
        }
      }
    }

    console.log('Depositing 100 DOMIs to all stores, drivers, and customers...');
    const emailsToFund = [
      ...storesData.map(s => s.email),
      ...drivers.map(d => d.email),
      ...customers.map(cu => cu.email)
    ];

    const [tokenRows] = await c.query('SELECT * FROM token_registry LIMIT 1');
    const [ruleRows] = await c.query('SELECT * FROM protocol_rules LIMIT 1');
    const snapshot = { token: tokenRows[0], rules: ruleRows[0] };
    const fiatPeg = parseFloat(tokenRows[0]?.fiat_peg_cop || 400.0000);

    for (const email of emailsToFund) {
      const [userRows] = await c.query('SELECT id FROM users WHERE email = ?', [email]);
      if (userRows.length > 0) {
        const userId = userRows[0].id;
        
        const [wCheck] = await c.query('SELECT id FROM wallets WHERE user_id = ?', [userId]);
        let walletId;
        if (wCheck.length === 0) {
          const [res] = await c.query(
            'INSERT INTO wallets (user_id, is_system, balance_custody, balance_utility, tx_nonce) VALUES (?, 0, 100.0000, 0.0000, 0)',
            [userId]
          );
          walletId = res.insertId;
        } else {
          walletId = wCheck[0].id;
          await c.query(
            'UPDATE wallets SET balance_custody = 100.0000 WHERE id = ?',
            [walletId]
          );
        }

        const [txCheck] = await c.query(
          'SELECT id FROM domi_ledger WHERE to_wallet_id = ? AND tx_type = "mint" LIMIT 1',
          [walletId]
        );
        if (txCheck.length === 0) {
          await ledger.appendLedger(c, {
            txType: 'mint',
            fromWalletId: null,
            toWalletId: walletId,
            amountDomis: 100.0000,
            amountFiatCop: 100.0000 * fiatPeg,
            referenceType: 'manual',
            referenceId: userId,
            protocolSnapshot: snapshot,
            notes: `Carga inicial de 100 DOMIs vía Pasarela de Pago para ${email}`
          });
        }
      }
    }
  }
}

module.exports = { seed };

if (require.main === module) {
  (async () => {
    const c = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await seed(c);
    } catch (err) {
      console.error('Seeding failed:', err);
    } finally {
      await c.end();
    }
  })();
}
