const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

const categories = [
  { name: 'Seguridad', code: 'security', description: 'Bitácora de auditoría y gestión de roles' },
  { name: 'Afiliaciones', code: 'affiliations', description: 'Registro y aprobación de comercios y delivery' },
  { name: 'Catálogo Maestro', code: 'catalog', description: 'Gestión de comercios, sedes y catálogos globales' },
  { name: 'Operaciones', code: 'operations', description: 'Pedidos, asignaciones y gestión de personal de sedes' },
  { name: 'Videos/Reels', code: 'videos', description: 'Subida y gestión de videos' },
  { name: 'Planes', code: 'plans', description: 'Suscripciones y planes de comercios' },
  { name: 'Inteligencia', code: 'intelligence', description: 'Estadísticas, autotagging y stop-words' },
  { name: 'Finanzas DOMI', code: 'finances', description: 'Libro mayor y compra/gasto de DOMIs' },
  { name: 'Logística', code: 'logistics', description: 'Gestión de repartidores' },
  { name: 'IA Generativa', code: 'ai_generation', description: 'Uso de IA para autotags y generación de contenido' }
];

const permissions = [
  // Seguridad
  { category: 'security', name: 'view_security_logs', description: 'Ver bitácora de auditoría' },
  { category: 'security', name: 'manage_rbac', description: 'Gestionar roles y permisos del sistema' },
  { category: 'security', name: 'create_system_user', description: 'Crear personal administrativo del sistema' },
  { category: 'security', name: 'edit_system_user', description: 'Editar personal administrativo del sistema' },
  
  // Afiliaciones
  { category: 'affiliations', name: 'view_requests', description: 'Ver solicitudes de registro pendientes' },
  { category: 'affiliations', name: 'approve_requests', description: 'Aprobar solicitudes de registro' },
  { category: 'affiliations', name: 'reject_requests', description: 'Rechazar solicitudes de registro' },
  
  // Catálogo Maestro
  { category: 'catalog', name: 'view_commerces', description: 'Ver lista y detalle de comercios' },
  { category: 'catalog', name: 'create_commerce', description: 'Crear nuevo comercio' },
  { category: 'catalog', name: 'edit_commerce', description: 'Editar datos de comercio' },
  { category: 'catalog', name: 'view_stores', description: 'Ver lista y detalle de sedes' },
  { category: 'catalog', name: 'create_store', description: 'Crear nueva sede' },
  { category: 'catalog', name: 'edit_store', description: 'Editar datos de sede' },
  { category: 'catalog', name: 'view_catalog', description: 'Ver menús, categorías y productos' },
  { category: 'catalog', name: 'manage_catalog', description: 'Gestionar menús, categorías y productos' },
  { category: 'catalog', name: 'manage_store_catalog', description: 'Gestionar disponibilidad y precios por sede' },
  { category: 'catalog', name: 'clone_store_catalog', description: 'Clonar el catálogo completo de otra sede' },
  
  // Operaciones
  { category: 'operations', name: 'view_orders', description: 'Ver pedidos de la sede' },
  { category: 'operations', name: 'manage_orders', description: 'Gestionar estados de pedidos' },
  { category: 'operations', name: 'view_store_admins', description: 'Ver administradores de sede' },
  { category: 'operations', name: 'manage_store_admins', description: 'Gestionar administradores de sede' },
  { category: 'operations', name: 'manage_order_acceptance', description: 'Gestionar modo de aceptación de pedidos' },
  
  // Videos/Reels
  { category: 'videos', name: 'upload_videos', description: 'Subir y activar videos' },
  { category: 'videos', name: 'delete_videos', description: 'Eliminar videos' },
  
  // Planes
  { category: 'plans', name: 'manage_plans', description: 'Contratar y gestionar planes' },
  
  // Inteligencia
  { category: 'intelligence', name: 'view_analytics', description: 'Ver estadísticas y popularidad' },
  { category: 'intelligence', name: 'manage_intelligence', description: 'Gestionar autotags y stop-words' },
  
  // Finanzas DOMI
  { category: 'finances', name: 'view_ledger', description: 'Ver libro mayor y balance del sistema' },
  { category: 'finances', name: 'purchase_domis', description: 'Comprar/Acuñar tokens DOMI' },
  { category: 'finances', name: 'spend_domis', description: 'Gastar tokens DOMI' },
  { category: 'finances', name: 'withdraw_domis', description: 'Retirar tokens DOMI (máximo privilegio)' },
  
  // Logística
  { category: 'logistics', name: 'manage_drivers', description: 'Gestionar repartidores de la empresa de mensajería' },
  
  // IA Generativa
  { category: 'ai_generation', name: 'use_ai_generation', description: 'Usar Gemini para generación de textos' }
];

const roles = [
  { name: 'Super Administrador', code: 'root', description: 'Acceso total sin restricciones', is_system: 1 },
  { name: 'Gerente del Sistema', code: 'system_manager', description: 'Gestión operativa del sistema', is_system: 1 },
  { name: 'Auditor', code: 'auditor', description: 'Solo lectura de seguridad y finanzas', is_system: 1 },
  { name: 'Gerente de Comercio', code: 'commerce_manager', description: 'Administración total del comercio y sus sedes', is_system: 1 },
  { name: 'Admin de Sede', code: 'store_admin', description: 'Administración operativa de una sede', is_system: 1 },
  { name: 'Admin de Mensajería', code: 'delivery_company_admin', description: 'Gestión de repartidores', is_system: 1 },
  { name: 'Operador Completo', code: 'operator_full', description: 'Operador con acceso a pedidos y catálogo', is_system: 1 },
  { name: 'Operador de Pedidos', code: 'operator_orders', description: 'Operador dedicado a despachar pedidos', is_system: 1 },
  { name: 'Operador de Catálogo', code: 'operator_catalog', description: 'Operador enfocado en stock de productos', is_system: 1 },
  { name: 'Cliente', code: 'customer', description: 'Usuario consumidor final', is_system: 1 },
  { name: 'Repartidor', code: 'driver', description: 'Repartidor de domicilios', is_system: 1 }
];

const rolePermissionsMapping = {
  root: 'ALL',
  system_manager: [
    'view_security_logs', 'view_requests', 'approve_requests', 'reject_requests',
    'view_commerces', 'create_commerce', 'edit_commerce', 'view_stores', 'create_store', 'edit_store',
    'view_catalog', 'manage_catalog', 'manage_store_catalog', 'clone_store_catalog', 'view_orders', 'manage_orders',
    'view_store_admins', 'manage_store_admins', 'manage_order_acceptance', 'upload_videos',
    'delete_videos', 'manage_plans', 'view_analytics', 'manage_intelligence', 'view_ledger',
    'purchase_domis', 'spend_domis', 'manage_drivers', 'use_ai_generation'
  ],
  auditor: [
    'view_security_logs', 'view_analytics', 'view_ledger'
  ],
  commerce_manager: [
    'view_catalog', 'view_stores', 'create_store', 'edit_store', 'manage_store_catalog', 'clone_store_catalog', 'view_orders', 'manage_orders',
    'view_store_admins', 'manage_store_admins', 'manage_order_acceptance', 'upload_videos',
    'delete_videos', 'manage_plans'
  ],
  store_admin: [
    'view_catalog', 'manage_store_catalog', 'view_orders', 'manage_order_acceptance', 'upload_videos'
  ],
  delivery_company_admin: [
    'manage_drivers'
  ],
  operator_full: [
    'view_catalog', 'view_orders', 'manage_orders', 'manage_store_catalog', 'upload_videos', 'manage_order_acceptance'
  ],
  operator_orders: [
    'view_orders', 'manage_orders', 'manage_order_acceptance'
  ],
  operator_catalog: [
    'view_catalog', 'manage_store_catalog'
  ],
  customer: [],
  driver: []
};

async function migrate() {
  console.log('=== INICIANDO MIGRACIÓN DE SEMILLAS Y BACKFILL RBAC (FASE 2) ===');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  };

  const connection = await mysql.createConnection(config);

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('SET @domi_is_root = 1;');

    // 1. Insertar Categorías
    console.log('Insertando categorías de permisos...');
    const categoryIds = {};
    for (const cat of categories) {
      await connection.query(
        'INSERT INTO permission_categories (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)',
        [cat.name, cat.description]
      );
      const [rows] = await connection.query('SELECT id FROM permission_categories WHERE name = ?', [cat.name]);
      categoryIds[cat.code] = rows[0].id;
    }
    console.log('Categorías creadas.');

    // 2. Insertar Permisos
    console.log('Insertando permisos...');
    const permissionIds = {};
    for (const perm of permissions) {
      const catId = categoryIds[perm.category];
      if (!catId) {
        throw new Error(`Categoría no encontrada para el permiso: ${perm.name}`);
      }
      await connection.query(
        'INSERT INTO permissions (category_id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE category_id = VALUES(category_id), description = VALUES(description)',
        [catId, perm.name, perm.description]
      );
      const [rows] = await connection.query('SELECT id FROM permissions WHERE name = ?', [perm.name]);
      permissionIds[perm.name] = rows[0].id;
    }
    console.log('Permisos creados.');

    // 3. Insertar Roles
    console.log('Insertando roles...');
    const roleIds = {};
    for (const role of roles) {
      await connection.query(
        'INSERT INTO roles (name, code, description, is_system) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_system = VALUES(is_system)',
        [role.name, role.code, role.description, role.is_system]
      );
      const [rows] = await connection.query('SELECT id FROM roles WHERE code = ?', [role.code]);
      roleIds[role.code] = rows[0].id;
    }
    console.log('Roles creados.');

    // 4. Mapear Permisos a Roles
    console.log('Asociando permisos a roles...');
    // Limpiamos los mapeos anteriores para evitar conflictos
    await connection.query('DELETE FROM role_permissions');

    for (const [roleCode, permNames] of Object.entries(rolePermissionsMapping)) {
      const roleId = roleIds[roleCode];
      if (permNames === 'ALL') {
        // Asignar todos los permisos
        for (const permId of Object.values(permissionIds)) {
          await connection.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
        }
      } else {
        for (const name of permNames) {
          const permId = permissionIds[name];
          if (permId) {
            await connection.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
          }
        }
      }
    }
    console.log('Asociación de permisos completada.');

    // 5. Backfill de Usuarios
    console.log('Iniciando Backfill de usuarios...');

    // Limpiamos pivote user_roles por si acaso
    await connection.query('DELETE FROM user_roles');

    // A. system_users
    console.log('Migrando system_users...');
    const [systemUsers] = await connection.query('SELECT id, nivel FROM system_users');
    for (const su of systemUsers) {
      let roleCode = 'auditor'; // fallback seguro
      if (su.nivel === 'root') roleCode = 'root';
      else if (su.nivel === 'system') roleCode = 'system_manager';

      const roleId = roleIds[roleCode];
      await connection.query(
        'INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)',
        ['system_user', su.id, roleId]
      );
    }

    // B. users (admin, customer, delivery)
    console.log('Migrando users...');
    const [users] = await connection.query('SELECT id, rol, es_repartidor FROM users');
    for (const u of users) {
      if (u.rol === 'root') {
        await connection.query('INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)', ['user', u.id, roleIds['root']]);
      } else if (u.rol === 'system') {
        await connection.query('INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)', ['user', u.id, roleIds['system_manager']]);
      } else if (u.rol === 'customer') {
        if (u.es_repartidor === 1) {
          await connection.query('INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)', ['user', u.id, roleIds['driver']]);
        } else {
          await connection.query('INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)', ['user', u.id, roleIds['customer']]);
        }
      } else if (u.rol === 'admin') {
        // Determinar si es commerce_manager, store_admin o delivery_company_admin
        // Chequear en commerces
        const [commerces] = await connection.query('SELECT id FROM commerces WHERE usuario_id = ?', [u.id]);
        if (commerces.length > 0) {
          await connection.query('INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)', ['user', u.id, roleIds['commerce_manager']]);
          continue;
        }

        // Chequear en stores
        const [stores] = await connection.query('SELECT id FROM stores WHERE usuario_id = ?', [u.id]);
        if (stores.length > 0) {
          await connection.query('INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)', ['user', u.id, roleIds['store_admin']]);
          continue;
        }

        // Chequear en delivery_companies
        const [deliveries] = await connection.query('SELECT id FROM delivery_companies WHERE usuario_id = ?', [u.id]);
        if (deliveries.length > 0) {
          await connection.query('INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)', ['user', u.id, roleIds['delivery_company_admin']]);
          continue;
        }

        // Si es admin y no está en ninguna, le ponemos store_admin por defecto
        await connection.query('INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)', ['user', u.id, roleIds['store_admin']]);
      }
    }

    // C. store_operators
    console.log('Migrando store_operators...');
    const [operators] = await connection.query('SELECT * FROM store_operators');
    for (const op of operators) {
      let rolesAsignados = [];
      if (op.permiso_pedidos) rolesAsignados.push('operator_orders');
      if (op.permiso_catalogo) rolesAsignados.push('operator_catalog');
      
      // Si no tiene ninguno, le ponemos operator_orders como básico
      if (rolesAsignados.length === 0) rolesAsignados.push('operator_orders');

      // Si tiene todos los permisos básicos del operador, le asignamos operator_full
      if (op.permiso_pedidos && op.permiso_catalogo && op.permiso_videos && op.permiso_horarios) {
        rolesAsignados = ['operator_full'];
      }

      for (const roleCode of rolesAsignados) {
        const roleId = roleIds[roleCode];
        await connection.query(
          'INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)',
          ['operator', op.id, roleId]
        );
      }
    }

    console.log('Backfill completado.');

    // 6. Eliminar columnas booleanas de permisos obsoletas en store_operators
    console.log('Eliminando columnas obsoletas en store_operators...');
    const [columns] = await connection.query("SHOW COLUMNS FROM store_operators LIKE 'permiso_%'");
    if (columns.length > 0) {
      await connection.query(`
        ALTER TABLE store_operators 
        DROP COLUMN IF EXISTS permiso_pedidos,
        DROP COLUMN IF EXISTS permiso_catalogo,
        DROP COLUMN IF EXISTS permiso_videos,
        DROP COLUMN IF EXISTS permiso_horarios,
        DROP COLUMN IF EXISTS permiso_cuentas
      `);
      console.log('Columnas obsoletas eliminadas.');
    } else {
      console.log('No se encontraron columnas permiso_* en store_operators. Omitiendo.');
    }

    console.log('\n--- VERIFICACIÓN DE FASE 2 ---');
    const [[{ count: countCategories }]] = await connection.query('SELECT COUNT(*) as count FROM permission_categories');
    const [[{ count: countPermissions }]] = await connection.query('SELECT COUNT(*) as count FROM permissions');
    const [[{ count: countRoles }]] = await connection.query('SELECT COUNT(*) as count FROM roles');
    const [[{ count: countRolePerms }]] = await connection.query('SELECT COUNT(*) as count FROM role_permissions');
    const [[{ count: countUserRoles }]] = await connection.query('SELECT COUNT(*) as count FROM user_roles');

    console.log('Categorías registradas:', countCategories);
    console.log('Permisos registrados:', countPermissions);
    console.log('Roles registrados:', countRoles);
    console.log('Asociaciones rol-permiso:', countRolePerms);
    console.log('Usuarios con roles asignados:', countUserRoles);

    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    await connection.end();
    console.log('=== FASE 2 COMPLETADA CON ÉXITO ===');
  } catch (error) {
    console.error('✖ ERROR EN LA MIGRACIÓN:', error);
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
      await connection.end();
    } catch (_) {}
    process.exit(1);
  }
}

migrate();
