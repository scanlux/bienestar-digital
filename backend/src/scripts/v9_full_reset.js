const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function main() {
    console.log('=== INICIANDO RESET COMPLETO DE BASE DE DATOS (FASE 1) ===');

    const ddlPath = path.join(__dirname, 'v9_full_reset.sql');
    if (!fs.existsSync(ddlPath)) {
        console.error(`ERROR: No se encuentra el archivo DDL en ${ddlPath}`);
        process.exit(1);
    }

    const ddlSql = fs.readFileSync(ddlPath, 'utf8');

    // Conectar como root a la base de datos
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.DB_ROOT_PASSWORD || '',
        multipleStatements: true
    });

    try {
        // 1. Ejecutar DDL Estructural
        console.log('\n--- 1. Aplicando DDL estructural y recreando tablas ---');
        // Dividir el DDL por punto y coma para ejecutar sentencias individuales (evitando buffers gigantes)
        const ddlStatements = ddlSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
        for (const stmt of ddlStatements) {
            await connection.query(stmt);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        console.log('✔ Tablas y esquema recreados exitosamente.');

        // 2. Crear Triggers de Seguridad e Inmutabilidad
        console.log('\n--- 2. Creando triggers de seguridad y lógica ---');
        
        // Desactivamos restricciones de seguridad temporalmente para configurar todo
        await connection.query('SET @domi_bypass_security = 1;');
        
        const triggers = [
            // domi_ledger
            `CREATE OR REPLACE TRIGGER protect_ledger_update BEFORE UPDATE ON domi_ledger FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El libro mayor (domi_ledger) es inmutable. No se permite UPDATE.'; END IF; END`,
            `CREATE OR REPLACE TRIGGER protect_ledger_delete BEFORE DELETE ON domi_ledger FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El libro mayor (domi_ledger) es inmutable. No se permite DELETE.'; END IF; END`,
            // token_registry
            `CREATE OR REPLACE TRIGGER protect_token_registry_update BEFORE UPDATE ON token_registry FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El registro de tokens es inmutable. No se permite UPDATE.'; END IF; END`,
            `CREATE OR REPLACE TRIGGER protect_token_registry_delete BEFORE DELETE ON token_registry FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El registro de tokens es inmutable. No se permite DELETE.'; END IF; END`,
            // protocol_rules
            `CREATE OR REPLACE TRIGGER protect_protocol_rules_update BEFORE UPDATE ON protocol_rules FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: Reglas de protocolo protegidas. Operación UPDATE no autorizada en esta capa.'; END IF; END`,
            `CREATE OR REPLACE TRIGGER protect_protocol_rules_delete BEFORE DELETE ON protocol_rules FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: Reglas de protocolo protegidas. Operación DELETE no autorizada en esta capa.'; END IF; END`,
            // wallets
            `CREATE OR REPLACE TRIGGER enforce_single_wallet_per_user BEFORE INSERT ON wallets FOR EACH ROW BEGIN DECLARE wallet_count INT; IF NEW.usuario_id IS NOT NULL THEN SELECT COUNT(*) INTO wallet_count FROM wallets WHERE usuario_id = NEW.usuario_id; IF wallet_count > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Integridad: Este usuario ya posee una billetera DOMI. Solo se permite una por cuenta.'; END IF; END IF; END`,
            `CREATE OR REPLACE TRIGGER prevent_wallet_owner_change BEFORE UPDATE ON wallets FOR EACH ROW BEGIN IF OLD.usuario_id IS NOT NULL AND NEW.usuario_id IS NOT NULL AND OLD.usuario_id <> NEW.usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: La billetera no puede reasignarse a otro usuario. La propiedad es inmutable.'; END IF; END`,
            // auto_create_user_wallet
            `CREATE OR REPLACE TRIGGER auto_create_user_wallet AFTER INSERT ON users FOR EACH ROW BEGIN IF NEW.rol IN ('admin', 'customer') THEN INSERT INTO wallets (owner_type, owner_id, usuario_id, balance_custody, balance_utility, locked_balance) VALUES ('user', NEW.id, NEW.id, 0.0000, 0.0000, 0.0000); END IF; END`,
            // roles
            `CREATE OR REPLACE TRIGGER enforce_driver_role_insert BEFORE INSERT ON users FOR EACH ROW BEGIN IF NEW.es_repartidor = 1 AND NEW.rol <> 'customer' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede activar el modo repartidor.'; END IF; END`,
            `CREATE OR REPLACE TRIGGER enforce_driver_role_update BEFORE UPDATE ON users FOR EACH ROW BEGIN IF NEW.es_repartidor = 1 AND NEW.rol <> 'customer' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede activar el modo repartidor.'; END IF; END`,
            `CREATE OR REPLACE TRIGGER prevent_active_driver_without_flag BEFORE UPDATE ON users FOR EACH ROW BEGIN IF NEW.repartidor_activo = 1 AND NEW.es_repartidor = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: No se puede activar el turno de repartidor sin haber habilitado el modo repartidor primero.'; END IF; END`,
            // commerces
            `CREATE OR REPLACE TRIGGER enforce_single_commerce_insert BEFORE INSERT ON commerces FOR EACH ROW BEGIN DECLARE user_rol VARCHAR(20); IF NEW.usuario_id IS NOT NULL THEN SELECT rol INTO user_rol FROM users WHERE id = NEW.usuario_id; IF user_rol <> 'admin' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol admin puede ser propietario de un comercio.'; END IF; END IF; END`,
            `CREATE OR REPLACE TRIGGER prevent_commerce_owner_change BEFORE UPDATE ON commerces FOR EACH ROW BEGIN IF OLD.usuario_id IS NOT NULL AND NEW.usuario_id IS NOT NULL AND OLD.usuario_id <> NEW.usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El propietario de un comercio no puede reasignarse. Requiere proceso administrativo.'; END IF; END`,
            // stores
            `CREATE OR REPLACE TRIGGER prevent_store_manager_change BEFORE UPDATE ON stores FOR EACH ROW BEGIN IF OLD.usuario_id IS NOT NULL AND NEW.usuario_id IS NOT NULL AND OLD.usuario_id <> NEW.usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El gerente responsable de una sede no puede reasignarse directamente. Requiere proceso administrativo.'; END IF; END`
        ];

        for (const trig of triggers) {
            await connection.query(trig);
        }
        console.log('✔ Todos los triggers de integridad financiera y seguridad registrados.');

        // 3. Insertar Semillas Limpias (Seeds)
        console.log('\n--- 3. Sembrando datos iniciales limpios y consistentes ---');
        const passHash = await bcrypt.hash('admin123', 10);
        const driverPassHash = await bcrypt.hash('driver123', 10);

        // A. Insertar System Users
        console.log('  -> Sembrando usuarios de sistema (Casa Matriz)...');
        await connection.query(`
            INSERT INTO system_users (email, password_hash, nombres, apellidos, nivel, estado) VALUES 
            ('root@trendy.sytes.net', ?, 'Root', 'SuperAdmin', 'root', 'activo'),
            ('system@trendy.sytes.net', ?, 'System', 'Admin', 'system', 'activo')
        `, [passHash, passHash]);

        // B. Insertar Billetera del Sistema (Singleton)
        await connection.query(`
            INSERT INTO wallets (owner_type, owner_id, usuario_id, balance_custody, balance_utility, locked_balance)
            VALUES ('system', NULL, NULL, 0.0000, 100000.0000, 0.0000)
        `);

        // C. Insertar token_registry y protocol_rules
        const tokenFields = 'DOMI|DomiToken|2|400.0000|1.0.0';
        const integrityHash = crypto.createHash('sha256').update(tokenFields).digest('hex');
        await connection.query(`
            INSERT INTO token_registry (id, symbol, name, decimals, fiat_peg_cop, protocol_version, integrity_hash)
            VALUES (1, 'DOMI', 'DomiToken', 2, 400.0000, '1.0.0', ?)
        `, [integrityHash]);

        await connection.query(`
            INSERT INTO protocol_rules 
            (id, threshold_fiat_cop, base_cost_domis, percentage_rate, driver_base_cost_domis, driver_threshold_fiat_cop, driver_percentage_rate, retention_penalty_rate, refund_standard_rate, rescue_cashback_rate, effective_date, notes)
            VALUES (1, 50000.00, 1.0000, 0.010000, 0.7500, 30000.00, 0.010000, 0.300000, 0.700000, 0.300000, CURDATE(), 'Reglas iniciales del protocolo DOMI v1.0.0')
        `);

        // D. Insertar Usuarios Administradores de Negocio
        console.log('  -> Sembrando administradores de negocio y perfiles...');
        const admins = [
            { email: 'admin_commerce_1@trendy.sytes.net', nombres: 'Carlos', apellidos: 'Commerce Uno', cedula: '1000000001', telefono: '3000000001' },
            { email: 'admin_store_1@trendy.sytes.net', nombres: 'Sandro', apellidos: 'Sede Uno', cedula: '1000000002', telefono: '3000000002' },
            { email: 'admin_store_2@trendy.sytes.net', nombres: 'Silvia', apellidos: 'Sede Dos', cedula: '1000000003', telefono: '3000000003' },
            { email: 'admin_commerce_2@trendy.sytes.net', nombres: 'Tomás', apellidos: 'Taco Loco Admin', cedula: '1000000004', telefono: '3000000004' },
            { email: 'admin_store_3@trendy.sytes.net', nombres: 'Yuli', apellidos: 'Yopal Sede', cedula: '1000000005', telefono: '3000000005' },
            { email: 'admin_delivery_1@trendy.sytes.net', nombres: 'Diego', apellidos: 'Delivery Admin', cedula: '1000000006', telefono: '3000000006' }
        ];

        const adminUserIds = {};
        for (const admin of admins) {
            const [uResult] = await connection.query(`
                INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, 'admin', 'activo')
            `, [admin.email, passHash]);
            const userId = uResult.insertId;
            adminUserIds[admin.email] = userId;

            await connection.query(`
                INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)
            `, [userId, admin.nombres, admin.apellidos, admin.cedula, admin.telefono]);
        }

        // E. Insertar Comercios (Commerces)
        console.log('  -> Sembrando comercios...');
        const [c1Result] = await connection.query(`
            INSERT INTO commerces (usuario_id, nombre, nit, nit_dv, type, status, email) VALUES 
            (?, 'Alimentos S.A.S', '901234567-1', '1', 'Empresarial', 'active', 'admin_commerce_1@trendy.sytes.net')
        `, [adminUserIds['admin_commerce_1@trendy.sytes.net']]);
        const commerce1Id = c1Result.insertId;

        const [c2Result] = await connection.query(`
            INSERT INTO commerces (usuario_id, nombre, nit, nit_dv, type, status, email) VALUES 
            (?, 'Taco Loco S.A.S', '901234567-2', '2', 'Comercial', 'active', 'admin_commerce_2@trendy.sytes.net')
        `, [adminUserIds['admin_commerce_2@trendy.sytes.net']]);
        const commerce2Id = c2Result.insertId;

        // F. Insertar Sedes (Stores)
        console.log('  -> Sembrando sedes...');
        const [s1Result] = await connection.query(`
            INSERT INTO stores (commerce_id, usuario_id, nombre_sucursal, matricula, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, acceptance_mode) VALUES 
            (?, ?, 'Sede Chapinero', 'MAT-001', 'Sandro Sede', '3000000002', '3000000002', 'Calle 60 # 13-45', 4.6432, -74.0654, 'operativo', 'automatico')
        `, [commerce1Id, adminUserIds['admin_store_1@trendy.sytes.net']]);
        const store1Id = s1Result.insertId;

        const [s2Result] = await connection.query(`
            INSERT INTO stores (commerce_id, usuario_id, nombre_sucursal, matricula, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, acceptance_mode) VALUES 
            (?, ?, 'Sede Centro', 'MAT-002', 'Silvia Sede', '3000000003', '3000000003', 'Carrera 7 # 12-20', 4.5980, -74.0758, 'operativo', 'manual')
        `, [commerce1Id, adminUserIds['admin_store_2@trendy.sytes.net']]);
        const store2Id = s2Result.insertId;

        const [s3Result] = await connection.query(`
            INSERT INTO stores (commerce_id, usuario_id, nombre_sucursal, matricula, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, acceptance_mode) VALUES 
            (?, ?, 'Taco Loco Yopal', 'MAT-003', 'Yuli Yopal', '3000000005', '3000000005', 'Calle 10 # 20-30 Yopal', 5.3378, -72.3958, 'operativo', 'automatico')
        `, [commerce2Id, adminUserIds['admin_store_3@trendy.sytes.net']]);
        const store3Id = s3Result.insertId;

        // Registrar relaciones en user_stores
        await connection.query(`
            INSERT INTO user_stores (user_id, store_id) VALUES 
            (?, ?), (?, ?), (?, ?)
        `, [
            adminUserIds['admin_store_1@trendy.sytes.net'], store1Id,
            adminUserIds['admin_store_2@trendy.sytes.net'], store2Id,
            adminUserIds['admin_store_3@trendy.sytes.net'], store3Id
        ]);

        // G. Insertar Empresa de Domicilios (Delivery Company)
        console.log('  -> Sembrando empresa de domicilios...');
        const [dcResult] = await connection.query(`
            INSERT INTO delivery_companies (usuario_id, nit, razon_social, estado) VALUES 
            (?, '800888999-9', 'Domicilios Bogotá S.A.S', 'activo')
        `, [adminUserIds['admin_delivery_1@trendy.sytes.net']]);
        const deliveryCompanyId = dcResult.insertId;

        // H. Insertar Repartidores (Drivers)
        console.log('  -> Sembrando repartidores...');
        // Repartidor Afiliado
        const [d1Result] = await connection.query(`
            INSERT INTO users (email, password_hash, rol, es_repartidor, repartidor_activo, estado) VALUES 
            ('driver_1@trendy.sytes.net', ?, 'customer', 1, 1, 'activo')
        `, [driverPassHash]);
        const driver1Id = d1Result.insertId;
        await connection.query(`
            INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono, delivery_company_id) VALUES 
            (?, 'Camilo', 'Repartidor Afiliado', '80000001', '3200000001', ?)
        `, [driver1Id, deliveryCompanyId]);

        // Repartidor Independiente
        const [d2Result] = await connection.query(`
            INSERT INTO users (email, password_hash, rol, es_repartidor, repartidor_activo, estado) VALUES 
            ('driver_2@trendy.sytes.net', ?, 'customer', 1, 1, 'activo')
        `, [driverPassHash]);
        const driver2Id = d2Result.insertId;
        await connection.query(`
            INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono, delivery_company_id) VALUES 
            (?, 'Héctor', 'Repartidor Independiente', '80000002', '3200000002', NULL)
        `, [driver2Id]);

        // I. Sembrar Menús, Categorías y Productos para las sedes
        console.log('  -> Sembrando menús, categorías y productos para tiendas...');
        const seedMenuData = async (storeId, commerceId, storeSuffix) => {
            const [mResult] = await connection.query(`
                INSERT INTO menus (commerce_id, nombre, descripcion, orden) VALUES (?, 'Menú Principal', 'Nuestra selección exclusiva', 0)
            `, [commerceId]);
            const menuId = mResult.insertId;

            const [catResult] = await connection.query(`
                INSERT INTO categorias (menu_id, nombre, descripcion, orden_visual) VALUES (?, 'Platos Fuertes', 'Nuestros platos insignia', 0)
            `, [menuId]);
            const catId = catResult.insertId;

            const [pResult] = await connection.query(`
                INSERT INTO products (commerce_id, categoria_id, menu_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible) 
                VALUES (?, ?, ?, ?, 'Preparado fresco en el local.', 22000.00, 25, 'https://picsum.photos/600/400/food', 1)
            `, [commerceId, catId, menuId, `Bandeja Paisa - ${storeSuffix}`]);
            const productId = pResult.insertId;

            // Pivotes
            await connection.query(`INSERT INTO store_menus (store_id, menu_id, disponible) VALUES (?, ?, 1)`, [storeId, menuId]);
            await connection.query(`INSERT INTO store_categories (store_id, categoria_id, disponible) VALUES (?, ?, 1)`, [storeId, catId]);
            await connection.query(`INSERT INTO store_products (store_id, product_id, precio_local, disponible) VALUES (?, ?, NULL, 1)`, [storeId, productId]);
        };

        await seedMenuData(store1Id, commerce1Id, 'Chapinero');
        await seedMenuData(store2Id, commerce1Id, 'Centro');
        await seedMenuData(store3Id, commerce2Id, 'Yopal');

        // J. Cargar saldos de prueba en las wallets (Mints virtuales de simulación)
        console.log('  -> Asignando saldos iniciales (Mint DOMIs)...');
        const [ws] = await connection.query('SELECT * FROM wallets');
        for (const w of ws) {
            if (w.usuario_id) {
                // Asignar $500,000 COP en DOMIs ($500,000 / 400.00 peg = 1250.00 DOMIs)
                await connection.query('UPDATE wallets SET balance_custody = 1250.0000 WHERE id = ?', [w.id]);
            }
        }

        // K. Sembrar plataformas de pago y permisos
        await connection.query(`
            INSERT INTO payment_platforms (nombre, tipo_entidad) VALUES 
            ('Wopi', 'pasarela'), ('PSE', 'banco'), ('Efectivo', 'efectivo')
        `);

        // L. Sembrar horarios de atención
        const stores = [store1Id, store2Id, store3Id];
        for (const sId of stores) {
            for (let day = 0; day <= 6; day++) {
                await connection.query(`
                    INSERT INTO store_operating_hours (store_id, day_index, status, open_time, close_time, is_24h)
                    VALUES (?, ?, 'abierto', '08:00:00', '20:00:00', 0)
                `, [sId, day]);
            }
        }

        // Desactivamos el bypass al terminar el sembrado
        await connection.query('SET @domi_bypass_security = NULL;');
        console.log('✔ Sembrado completado exitosamente.');

        // 4. Configurar Privilegios y Permisos de BD
        console.log('\n--- 4. Configurando permisos y privilegios de base de datos ---');
        const deployerUser = 'bienestar_deployer';
        const adminProdUser = 'bienestar_admin_prod';

        const deployerTables = [
            'commerces', 'stores', 'products', 'product_images', 'categorias', 'menus', 
            'ingredients', 'product_ingredients', 'payment_platforms', 'users', 'profiles', 
            'store_accounts', 'store_operating_hours', 'system_users', 'store_operators', 
            'delivery_companies', 'registration_requests', 'product_popularity'
        ];

        const adminProdTables = [
            'commerces', 'stores', 'products', 'product_images', 'categorias', 'menus', 
            'ingredients', 'product_ingredients', 'payment_platforms', 'store_accounts', 
            'store_operating_hours', 'store_menus', 'store_categories', 'store_products', 
            'users', 'profiles', 'store_operators', 'delivery_companies', 'registration_requests',
            'user_permissions'
        ];

        // Revocar accesos globales y configurar
        try {
            await connection.query(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${deployerUser}'@'%'`);
            await connection.query(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${adminProdUser}'@'%'`);

            // Deployer
            for (const tbl of deployerTables) {
                await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON \`marketplace_db\`.\`${tbl}\` TO '${deployerUser}'@'%'`);
            }
            await connection.query(`GRANT SELECT, INSERT ON \`marketplace_db\`.\`domi_ledger\` TO '${deployerUser}'@'%'`);
            await connection.query(`GRANT SELECT, INSERT, UPDATE ON \`marketplace_db\`.\`wallets\` TO '${deployerUser}'@'%'`);
            await connection.query(`GRANT SELECT, INSERT, UPDATE ON \`marketplace_db\`.\`token_registry\` TO '${deployerUser}'@'%'`);
            await connection.query(`GRANT SELECT, INSERT, UPDATE ON \`marketplace_db\`.\`protocol_rules\` TO '${deployerUser}'@'%'`);
            await connection.query(`GRANT SELECT, INSERT, UPDATE ON \`marketplace_db\`.\`domi_packages\` TO '${deployerUser}'@'%'`);
            await connection.query(`GRANT SELECT, INSERT, UPDATE ON \`marketplace_db\`.\`order_incidents\` TO '${deployerUser}'@'%'`);
            await connection.query(`GRANT SELECT, INSERT, UPDATE ON \`marketplace_db\`.\`rescue_assignments\` TO '${deployerUser}'@'%'`);
            await connection.query(`GRANT SELECT, INSERT, UPDATE ON \`marketplace_db\`.\`orders\` TO '${deployerUser}'@'%'`);
            
            // Admin Prod
            await connection.query(`GRANT SELECT, INSERT ON \`marketplace_db\`.* TO '${adminProdUser}'@'%'`);
            for (const tbl of adminProdTables) {
                await connection.query(`GRANT UPDATE, DELETE ON \`marketplace_db\`.\`${tbl}\` TO '${adminProdUser}'@'%'`);
            }
            await connection.query(`GRANT UPDATE ON \`marketplace_db\`.\`orders\` TO '${adminProdUser}'@'%'`);
            await connection.query(`GRANT UPDATE ON \`marketplace_db\`.\`wallets\` TO '${adminProdUser}'@'%'`);
            await connection.query(`GRANT UPDATE ON \`marketplace_db\`.\`domi_packages\` TO '${adminProdUser}'@'%'`);
            await connection.query(`GRANT UPDATE ON \`marketplace_db\`.\`order_incidents\` TO '${adminProdUser}'@'%'`);
            await connection.query(`GRANT UPDATE ON \`marketplace_db\`.\`rescue_assignments\` TO '${adminProdUser}'@'%'`);
            await connection.query(`GRANT UPDATE ON \`marketplace_db\`.\`product_popularity\` TO '${adminProdUser}'@'%'`);

            // Restringir Ledger, Token Registry y Protocol Rules del app user
            await connection.query(`REVOKE INSERT, UPDATE, DELETE ON \`marketplace_db\`.\`token_registry\` FROM '${adminProdUser}'@'%'`);
            await connection.query(`REVOKE INSERT, UPDATE, DELETE ON \`marketplace_db\`.\`protocol_rules\` FROM '${adminProdUser}'@'%'`);
            await connection.query(`REVOKE UPDATE, DELETE ON \`marketplace_db\`.\`domi_ledger\` FROM '${adminProdUser}'@'%'`);

            await connection.query('FLUSH PRIVILEGES;');
            console.log('✔ Privilegios de base de datos restaurados y endurecidos.');
        } catch (privError) {
            console.warn('  [AVISO] No se pudieron otorgar todos los privilegios. Detalle:', privError.message);
        }

        console.log('\n======================================================');
        console.log('🎉 FASE 1: RESET DE BASE DE DATOS COMPLETADO CON ÉXITO');
        console.log('======================================================\n');
        
        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('✖ ERROR CRÍTICO DURANTE EL RESET:', error);
        await connection.end();
        process.exit(1);
    }
}

main();
