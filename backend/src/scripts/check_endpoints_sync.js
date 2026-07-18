// Script de sincronización y auditoría de endpoints de seguridad
require('dotenv').config();
const mysql = require('mysql2/promise');
const express = require('express');
const db = require('../config/db');

// Metaprogramación: Envolver el middleware hasPermission para rastrear permisos requeridos
const authMiddleware = require('../middleware/auth');
const originalHasPermission = authMiddleware.hasPermission;

authMiddleware.hasPermission = function (permissionName) {
  const fn = originalHasPermission(permissionName);
  fn._requiredPermission = permissionName;
  return fn;
};

// Routers definidos en src/index.js
const routers = [
  { prefix: '/api/generate', path: '../domains/intelligence/generate.router' },
  { prefix: '/api/auth', path: '../domains/auth/auth.router' },
  { prefix: '/api', path: '../domains/public/public.home.router' },
  { prefix: '/api/manage', path: '../domains/role/role.router' },
  { prefix: '/api/manage/commerces', path: '../domains/commerce/commerce.router' },
  { prefix: '/api/manage', path: '../domains/store/store.router' },
  { prefix: '/api/manage/upgrades', path: '../domains/upgrades/upgrades.router' },
  { prefix: '/api/manage', path: '../domains/catalog/catalog.router' },
  { prefix: '/api/manage', path: '../domains/user/user.router' },
  { prefix: '/api/cash', path: '../domains/cash/cash.routes' },
  { prefix: '/api/manage', path: '../domains/order/order.router' },
  { prefix: '/api/manage', path: '../domains/intelligence/intelligence.router' },
  { prefix: '/api/manage', path: '../domains/admin/admin.router' },
  { prefix: '/api/upload', path: '../domains/upload/upload.router' },
  { prefix: '/api/public', path: '../domains/public/public.router' },
  { prefix: '/api/domi', path: '../domains/domi/domi.router' },
  { prefix: '/api/domi/treasury', path: '../domains/domi/domi.treasury.router' },
  { prefix: '/api/public/orders', path: '../domains/order/order.public.router' },
  { prefix: '/api/payments', path: '../domains/domi/domi.payment.router' },
  { prefix: '/api/delivery-company', path: '../domains/delivery-company/delivery-company.router' }
];

async function main() {
  console.log('=== AUDITORÍA Y COMPARACIÓN DE ENDPOINTS DE SEGURIDAD ===\n');

  // 1. Extraer endpoints definidos en Express de forma recursiva
  console.log('Cargando routers de Express...');
  const expressEndpoints = [];

  function traverseRouter(routerInstance, prefix) {
    if (!routerInstance.stack) return;
    
    routerInstance.stack.forEach((layer) => {
      if (layer.route) {
        const path = layer.route.path;
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());

        // Buscar si requiere un permiso específico en su cadena de handlers
        let requiredPermission = null;
        layer.route.stack.forEach((handler) => {
          if (handler.handle && handler.handle._requiredPermission) {
            requiredPermission = handler.handle._requiredPermission;
          }
        });

        let fullPath = (prefix + path).replace(/\/+/g, '/');
        if (fullPath.endsWith('/') && fullPath.length > 1) {
          fullPath = fullPath.slice(0, -1);
        }

        methods.forEach(method => {
          expressEndpoints.push({
            method,
            path: fullPath,
            requiredPermission,
            methodPath: `${method} ${fullPath}`
          });
        });
      } else if (layer.name === 'router' && layer.handle) {
        // Es un sub-router. Deducir su path de montaje.
        let mountPath = '';
        if (layer.regexp) {
          const regString = layer.regexp.toString();
          // Express regex para '/system/maintenance' -> /^\/system\/maintenance\/?(?=\/|$)/i
          const match = regString.match(/^\/\^\\\/([a-zA-Z0-9_\-\\\/]+)/);
          if (match) {
            mountPath = '/' + match[1].replace(/\\/g, '');
          }
        }
        traverseRouter(layer.handle, (prefix + mountPath).replace(/\/+/g, '/'));
      }
    });
  }
  
  for (const rDef of routers) {
    try {
      const router = require(rDef.path);
      traverseRouter(router, rDef.prefix);
    } catch (err) {
      console.error(`Error cargando router ${rDef.path}:`, err.message);
    }
  }

  console.log(`Se detectaron ${expressEndpoints.length} endpoints activos en la aplicación Express.`);

  // 2. Conectarse a la base de datos y leer los endpoints de permisos
  let dbConnection;
  try {
    dbConnection = await db.getConnection();
  } catch (err) {
    console.error('No se pudo conectar a la Base de Datos:', err.message);
    process.exit(1);
  }

  try {
    // Obtener todos los endpoints mapeados a permisos en DB
    const [dbEndpointsRows] = await dbConnection.query(`
      SELECT pe.id, pe.permission_id, p.name AS permission_name, pe.method_path
      FROM permission_endpoints pe
      JOIN permissions p ON pe.permission_id = p.id
    `);

    // Obtener lista de todos los permisos existentes en la DB para fácil asociación
    const [permissionsRows] = await dbConnection.query(`
      SELECT id, name FROM permissions
    `);
    const permissionsMap = {};
    permissionsRows.forEach(row => {
      permissionsMap[row.name] = row.id;
    });

    console.log(`Se encontraron ${dbEndpointsRows.length} endpoints mapeados en la Base de Datos.\n`);

    // 3. Comparar
    const dbEndpoints = dbEndpointsRows.map(r => r.method_path.trim());
    const expressMethodPaths = expressEndpoints.map(e => e.methodPath);

    const missingInDb = [];
    const obsoleteInDb = [];

    // Faltantes en la DB
    expressEndpoints.forEach(exp => {
      // Ignorar endpoints que no tienen permiso asociado (públicos)
      if (!exp.requiredPermission) {
        return;
      }
      
      const isRegistered = dbEndpointsRows.some(dbEp => {
        return dbEp.method_path.trim() === exp.methodPath && dbEp.permission_name === exp.requiredPermission;
      });

      if (!isRegistered) {
        missingInDb.push(exp);
      }
    });

    // Obsoletos en la DB (registrados pero no existen en Express)
    dbEndpointsRows.forEach(dbEp => {
      const existsInExpress = expressEndpoints.some(exp => exp.methodPath === dbEp.method_path.trim());
      if (!existsInExpress) {
        obsoleteInDb.push(dbEp);
      }
    });

    // Imprimir resultados
    console.log('--- 1. ENDPOINTS FALTANTES EN LA BASE DE DATOS (Requieren registro) ---');
    if (missingInDb.length === 0) {
      console.log('Ninguno. ¡Todos los endpoints protegidos están registrados!');
    } else {
      missingInDb.forEach(ep => {
        console.log(`[+] ${ep.methodPath} -> Permiso requerido: ${ep.requiredPermission} (Permiso ID: ${permissionsMap[ep.requiredPermission] || 'NO ENCONTRADO'})`);
      });
    }
    console.log();

    console.log('--- 2. ENDPOINTS OBSOLETOS EN LA BASE DE DATOS (Registrados pero no existen en Express) ---');
    if (obsoleteInDb.length === 0) {
      console.log('Ninguno. ¡No hay basura en la Base de Datos!');
    } else {
      obsoleteInDb.forEach(ep => {
        console.log(`[-] ID: ${ep.id} | ${ep.method_path} (Asociado a permiso: ${ep.permission_name})`);
      });
    }
    console.log();

    // Si se pasa el flag --apply y hay cambios
    const apply = process.argv.includes('--apply');
    if (apply) {
      if (missingInDb.length === 0 && obsoleteInDb.length === 0) {
        console.log('Nada que sincronizar.');
      } else {
        console.log('Aplicando cambios en la Base de Datos...');
        
        // Registrar nuevos
        for (const ep of missingInDb) {
          const permId = permissionsMap[ep.requiredPermission];
          if (permId) {
            await dbConnection.query(
              'INSERT INTO permission_endpoints (permission_id, method_path) VALUES (?, ?)',
              [permId, ep.methodPath]
            );
            console.log(`[Sync] Registrado: ${ep.methodPath}`);
          } else {
            console.warn(`[Sync Warning] No se pudo registrar ${ep.methodPath} porque el permiso '${ep.requiredPermission}' no existe en la DB.`);
          }
        }

        // Eliminar obsoletos
        for (const ep of obsoleteInDb) {
          await dbConnection.query(
            'DELETE FROM permission_endpoints WHERE id = ?',
            [ep.id]
          );
          console.log(`[Sync] Eliminado obsoleto: ${ep.method_path}`);
        }

        console.log('\n¡Sincronización de Base de Datos completada con éxito!');
      }
    } else {
      if (missingInDb.length > 0 || obsoleteInDb.length > 0) {
        console.log('Use el parámetro --apply para sincronizar estos cambios en la base de datos automáticamente.');
      }
    }

  } catch (error) {
    console.error('Error durante la ejecución:', error);
  } finally {
    dbConnection.release();
    await db.end();
  }
}

main().catch(console.error);
