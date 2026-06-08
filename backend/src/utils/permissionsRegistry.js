const permissionsAnalysis = [
  {
    code: 'view_security_logs',
    name: 'Ver Bitácora de Seguridad',
    category: 'Seguridad',
    criticidad: 'Media',
    tipo: 'Lectura',
    impactedTables: ['security_audit_logs', 'users', 'system_users'],
    endpoints: ['GET /api/management/security-logs'],
    scope: 'Permite auditar accesos e intentos de intrusión, pero expone metadatos de IP y actividades de otros administradores.'
  },
  {
    code: 'manage_rbac',
    name: 'Gestionar Roles y Permisos (RBAC)',
    category: 'Seguridad',
    criticidad: 'Crítica',
    tipo: 'Escritura',
    impactedTables: ['roles', 'role_permissions', 'user_roles'],
    endpoints: [
      'GET /api/manage/roles',
      'POST /api/manage/roles',
      'PUT /api/manage/roles/:id',
      'DELETE /api/manage/roles/:id',
      'PUT /api/manage/users/:id/roles'
    ],
    scope: 'Máximo privilegio de autorización. Permite alterar la matriz de acceso de cualquier rol e indirectamente escalar privilegios. Protegido en DB por triggers.'
  },
  {
    code: 'create_system_user',
    name: 'Crear Usuario de Sistema',
    category: 'Seguridad',
    criticidad: 'Alta',
    tipo: 'Escritura',
    impactedTables: ['system_users', 'user_roles'],
    endpoints: ['POST /api/manage/users (implícito)'],
    scope: 'Permite dar de alta a nuevos empleados en la casa matriz con roles de sistema.'
  },
  {
    code: 'edit_system_user',
    name: 'Editar Usuario de Sistema',
    category: 'Seguridad',
    criticidad: 'Alta',
    tipo: 'Escritura',
    impactedTables: ['system_users', 'user_roles'],
    endpoints: ['PUT /api/manage/users/:id'],
    scope: 'Permite modificar datos operativos o suspender cuentas de personal de casa matriz.'
  },
  {
    code: 'view_requests',
    name: 'Ver Solicitudes de Registro',
    category: 'Afiliaciones',
    criticidad: 'Baja',
    tipo: 'Lectura',
    impactedTables: ['registration_requests'],
    endpoints: ['GET /api/management/requests'],
    scope: 'Lectura de solicitudes enviadas por prospectos de comercio o delivery.'
  },
  {
    code: 'approve_requests',
    name: 'Aprobar Solicitudes',
    category: 'Afiliaciones',
    criticidad: 'Alta',
    tipo: 'Escritura',
    impactedTables: ['registration_requests', 'users', 'profiles', 'commerces', 'delivery_companies'],
    endpoints: ['POST /api/management/requests/:id/approve'],
    scope: 'Crea cuentas oficiales de administradores comerciales o empresas de delivery. El NIT ingresado es inmutable tras la inserción.'
  },
  {
    code: 'reject_requests',
    name: 'Rechazar Solicitudes',
    category: 'Afiliaciones',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['registration_requests'],
    endpoints: ['POST /api/management/requests/:id/reject'],
    scope: 'Permite denegar la afiliación de un comercio con notas aclaratorias.'
  },
  {
    code: 'view_commerces',
    name: 'Ver Comercios',
    category: 'Catálogo Maestro',
    criticidad: 'Baja',
    tipo: 'Lectura',
    impactedTables: ['commerces', 'users'],
    endpoints: ['GET /api/management/commerces', 'GET /api/management/commerces/:id'],
    scope: 'Visualización de información comercial y cuentas vinculadas.'
  },
  {
    code: 'create_commerce',
    name: 'Crear Comercio',
    category: 'Catálogo Maestro',
    criticidad: 'Alta',
    tipo: 'Escritura',
    impactedTables: ['commerces', 'users', 'profiles'],
    endpoints: ['POST /api/management/commerces'],
    scope: 'Creación directa de comercios asociados a administradores sin pasar por solicitudes.'
  },
  {
    code: 'edit_commerce',
    name: 'Editar Comercio',
    category: 'Catálogo Maestro',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['commerces'],
    endpoints: ['PUT /api/management/commerces/:id', 'PATCH /api/management/commerces/:id/status'],
    scope: 'Permite modificar datos fiscales, teléfonos y estado operacional (activo/inactivo) de un comercio. El NIT se valida como inmutable.'
  },
  {
    code: 'view_stores',
    name: 'Ver Sedes',
    category: 'Catálogo Maestro',
    criticidad: 'Baja',
    tipo: 'Lectura',
    impactedTables: ['stores', 'user_stores'],
    endpoints: [
      'GET /api/management/my-stores',
      'GET /api/management/stores/:commerceId',
      'GET /api/management/store/:id'
    ],
    scope: 'Lectura de sucursales físicas asociadas a comercios.'
  },
  {
    code: 'create_store',
    name: 'Crear Sede',
    category: 'Catálogo Maestro',
    criticidad: 'Alta',
    tipo: 'Escritura',
    impactedTables: ['stores', 'user_stores', 'users', 'profiles'],
    endpoints: ['POST /api/management/stores'],
    scope: 'Registra una nueva sucursal comercial y asocia/crea su administrador. Requiere matrícula mercantil única.'
  },
  {
    code: 'edit_store_basic',
    name: 'Editar Datos Básicos Sede',
    category: 'Catálogo Maestro',
    criticidad: 'Baja',
    tipo: 'Escritura',
    impactedTables: ['stores', 'store_operating_hours'],
    endpoints: ['POST /api/management/stores (modo edición básico)'],
    scope: 'Editar datos básicos de la sede (Teléfonos, foto, horarios, estado y fecha de regreso)'
  },
  {
    code: 'edit_store_advanced',
    name: 'Editar Datos Avanzados Sede',
    category: 'Catálogo Maestro',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['stores', 'store_accounts', 'profiles', 'users'],
    endpoints: ['POST /api/management/stores (modo edición avanzado)'],
    scope: 'Editar datos avanzados de la sede (Nombres/apellidos del admin, dirección, geolocalización, billeteras y cuentas bancarias)'
  },
  {
    code: 'view_catalog',
    name: 'Ver Catálogo Global',
    category: 'Catálogo Maestro',
    criticidad: 'Baja',
    tipo: 'Lectura',
    impactedTables: ['menus', 'categorias', 'products', 'product_ingredients', 'store_menus', 'store_categories', 'store_products'],
    endpoints: [
      'GET /api/management/menus/:commerceId',
      'GET /api/management/categorias/:menuId',
      'GET /api/management/products',
      'GET /api/management/ingredients',
      'GET /api/management/store-menus/:storeId',
      'GET /api/management/store-categories/:storeId/:menuId',
      'GET /api/management/store-products/:storeId/:categoriaId'
    ],
    scope: 'Acceso de lectura al catálogo global de productos y menús.'
  },
  {
    code: 'enable_store_catalog',
    name: 'Habilitar Catálogo en Sede',
    category: 'Catálogo Maestro',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['store_menus', 'store_categories'],
    endpoints: [
      'POST /api/management/store-menus',
      'POST /api/management/store-categories'
    ],
    scope: 'Habilitar menús y categorías para la sede'
  },
  {
    code: 'write_catalog',
    name: 'Crear/Editar Catálogo',
    category: 'Catálogo Maestro',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['menus', 'categorias', 'products', 'product_ingredients', 'store_products'],
    endpoints: [
      'POST /api/management/menus',
      'POST /api/management/categorias',
      'POST /api/management/products',
      'POST /api/management/store-products',
      'POST /api/upload/:entityType'
    ],
    scope: 'Crear y editar menús, categorías y productos'
  },
  {
    code: 'delete_catalog',
    name: 'Eliminar Catálogo',
    category: 'Catálogo Maestro',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['menus', 'categorias', 'products'],
    endpoints: [
      'DELETE /api/management/menus/:id',
      'DELETE /api/management/categorias/:id',
      'DELETE /api/management/products/:id'
    ],
    scope: 'Eliminar menús, categorías y productos'
  },
  {
    code: 'view_orders',
    name: 'Ver Pedidos',
    category: 'Operaciones',
    criticidad: 'Baja',
    tipo: 'Lectura',
    impactedTables: ['orders', 'order_items'],
    endpoints: ['GET /api/management/orders'],
    scope: 'Permite consultar el flujo de comandas entrantes.'
  },
  {
    code: 'manage_orders',
    name: 'Gestionar Pedidos',
    category: 'Operaciones',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['orders', 'domi_ledger'],
    endpoints: ['POST /api/orders/:id/status (implícito)'],
    scope: 'Permite aceptar, despachar o cancelar pedidos de clientes, impactando el flujo operativo de los repartidores.'
  },
  {
    code: 'view_store_admins',
    name: 'Ver Admins de Sede',
    category: 'Operaciones',
    criticidad: 'Baja',
    tipo: 'Lectura',
    impactedTables: ['users', 'profiles', 'user_stores'],
    endpoints: ['GET /api/management/store-admins'],
    scope: 'Consulta de gerentes a cargo de cada sucursal.'
  },
  {
    code: 'manage_store_admins',
    name: 'Gestionar Admins de Sede',
    category: 'Operaciones',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['users', 'profiles', 'user_stores'],
    endpoints: [
      'POST /api/management/store-admins',
      'PUT /api/management/store-admins/:id',
      'PUT /api/management/store-admins/:id/status'
    ],
    scope: 'Creación de cuentas y control operativo de acceso de los operadores de sede.'
  },
  {
    code: 'manage_order_acceptance',
    name: 'Gestionar Aceptación Automática',
    category: 'Operaciones',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['stores'],
    endpoints: ['PATCH /api/management/stores/:id/order-acceptance'],
    scope: 'Habilita que el backend asigne repartidores y apruebe de forma automatizada los pedidos.'
  },
  {
    code: 'upload_videos',
    name: 'Subir Videos Publicitarios',
    category: 'Videos/Reels',
    criticidad: 'Baja',
    tipo: 'Escritura',
    impactedTables: ['commerce_videos'],
    endpoints: ['POST /api/management/videos', 'PATCH /api/management/videos/:id/active'],
    scope: 'Gestión del contenido multimedia publicitario visible en la App Móvil.'
  },
  {
    code: 'delete_videos',
    name: 'Eliminar Videos Publicitarios',
    category: 'Videos/Reels',
    criticidad: 'Baja',
    tipo: 'Escritura',
    impactedTables: ['commerce_videos'],
    endpoints: ['DELETE /api/management/videos/:id'],
    scope: 'Remoción de videos promocionales del feed público.'
  },
  {
    code: 'manage_plans',
    name: 'Gestionar Suscripciones',
    category: 'Planes',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['commerce_plans', 'domi_ledger'],
    endpoints: ['POST /api/management/plans/subscribe'],
    scope: 'Contratación de planes que impacta el saldo de tokens DOMI del comercio.'
  },
  {
    code: 'view_analytics',
    name: 'Ver Analíticas y Popularidad',
    category: 'Inteligencia',
    criticidad: 'Baja',
    tipo: 'Lectura',
    impactedTables: ['product_popularity', 'orders', 'order_items'],
    endpoints: ['GET /api/management/analytics/popularity'],
    scope: 'Visualización de métricas de ventas agregadas para inteligencia comercial.'
  },
  {
    code: 'manage_intelligence',
    name: 'Gestionar Inteligencia y Stop Words',
    category: 'Inteligencia',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['stop_words', 'product_popularity', 'products'],
    endpoints: [
      'POST /api/management/analytics/trigger',
      'GET /api/management/intelligence/stop-words',
      'POST /api/management/intelligence/stop-words',
      'DELETE /api/management/intelligence/stop-words/:id',
      'POST /api/management/intelligence/generate-tags'
    ],
    scope: 'Configuración del indexador semántico y limpieza de palabras clave en productos.'
  },
  {
    code: 'view_ledger',
    name: 'Ver Libro Mayor',
    category: 'Finanzas DOMI',
    criticidad: 'Alta',
    tipo: 'Lectura',
    impactedTables: ['domi_ledger', 'token_registry'],
    endpoints: ['GET /api/domi/wallet/system', 'GET /api/domi/ledger'],
    scope: 'Lectura de saldos, movimientos y acuñación global de tokens. Privilegio de auditoría.'
  },
  {
    code: 'purchase_domis',
    name: 'Comprar/Acuñar Tokens DOMI',
    category: 'Finanzas DOMI',
    criticidad: 'Crítica',
    tipo: 'Escritura',
    impactedTables: ['domi_ledger', 'token_registry'],
    endpoints: ['POST /api/domi/mint', 'POST /api/domi/wallet/store/:storeId/topup'],
    scope: 'Permite emitir tokens del ecosistema. Afecta directamente el valor financiero circulante.'
  },
  {
    code: 'spend_domis',
    name: 'Gastar Tokens DOMI',
    category: 'Finanzas DOMI',
    criticidad: 'Alta',
    tipo: 'Escritura',
    impactedTables: ['domi_ledger'],
    endpoints: ['POST /api/orders/'],
    scope: 'Operación transaccional clave de débito de billetera del cliente a favor del comercio/repartidor.'
  },
  {
    code: 'withdraw_domis',
    name: 'Retirar/Fiar Tokens DOMI',
    category: 'Finanzas DOMI',
    criticidad: 'Crítica',
    tipo: 'Escritura',
    impactedTables: ['domi_ledger', 'token_registry'],
    endpoints: ['POST /api/domi/withdraw'],
    scope: 'Máximo privilegio financiero. Permite transferir capital fuera del libro mayor transaccional.'
  },
  {
    code: 'manage_drivers',
    name: 'Gestionar Repartidores',
    category: 'Logística',
    criticidad: 'Media',
    tipo: 'Escritura',
    impactedTables: ['users', 'profiles', 'delivery_companies'],
    endpoints: [
      'GET /api/delivery-company/drivers',
      'POST /api/delivery-company/drivers',
      'DELETE /api/delivery-company/drivers/:userId'
    ],
    scope: 'Permite afiliar conductores a empresas de mensajería para asignación de domicilios.'
  },
  {
    code: 'use_ai_generation',
    name: 'Usar Generación por IA',
    category: 'IA Generativa',
    criticidad: 'Baja',
    tipo: 'Escritura',
    impactedTables: ['products'],
    endpoints: ['POST /api/generate/'],
    scope: 'Utiliza el consumo de cuotas del backend para invocar a Gemini.'
  }
];

module.exports = {
  permissionsAnalysis
};
