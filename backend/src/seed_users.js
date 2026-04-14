const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mariadb',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db',
  });

  try {
    console.log('🛠️ Iniciando la migración de esquema de Usuarios...');
    // Realizamos el ALTER TABLE si es necesario
    try {
      await pool.query(
        "ALTER TABLE users ADD COLUMN apellido VARCHAR(100), ADD COLUMN cedula_numero VARCHAR(50), ADD COLUMN url_imagen_cedula TEXT"
      );
      console.log('✅ Columnas de perfil legal (apellido, cedula) añadidas con éxito a MariaDB.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚡ Las columnas ya existen en MariaDB, saltando alteración de esquema...');
      } else {
        throw e;
      }
    }

    console.log('\n🌱 Seed: Iniciando inserción de usuarios reales...');
    
    // Usuarios predefinidos (Perfiles Completos)
    const users = [
      { 
        email: 'root@trendy.com', 
        password: 'admin123', 
        nombre: 'CEO Principal', 
        apellido: 'Trendy',
        telefono: '3000000000',
        cedula_numero: '1000000000',
        url_imagen_cedula: 'https://trendy.sytes.net/uploads/cedula_root_placeholder.jpg',
        rol: 'admin' 
      },
      { 
        email: 'system@trendy.com', 
        password: 'system123', 
        nombre: 'Sistema', 
        apellido: 'Automático',
        telefono: '3000000001',
        cedula_numero: '0000000000',
        url_imagen_cedula: 'NO_APLICA',
        rol: 'admin' 
      },
      { 
        email: 'vendor@trendy.com', 
        password: 'vendor123', 
        nombre: 'Entre', 
        apellido: 'Cazuelas Market',
        telefono: '3151234567',
        cedula_numero: '901234567', // NIT o CC del dueño
        url_imagen_cedula: 'https://picsum.photos/seed/rut/400/300',
        rol: 'vendor' 
      },
      { 
        email: 'delivery@trendy.com', 
        password: 'delivery123', 
        nombre: 'Carlos', 
        apellido: 'Pérez',
        telefono: '3109876543',
        cedula_numero: '1023456789',
        url_imagen_cedula: 'https://picsum.photos/seed/cedula_repartidor/800/600',
        rol: 'delivery' 
      },
    ];

    for (const user of users) {
      const hash = await bcrypt.hash(user.password, 10);
      await pool.query(
        `INSERT INTO users 
          (email, password_hash, nombre, apellido, telefono, cedula_numero, url_imagen_cedula, rol, estado) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
          password_hash = VALUES(password_hash),
          nombre = VALUES(nombre),
          apellido = VALUES(apellido),
          telefono = VALUES(telefono),
          cedula_numero = VALUES(cedula_numero),
          url_imagen_cedula = VALUES(url_imagen_cedula)`,
        [user.email, hash, user.nombre, user.apellido, user.telefono, user.cedula_numero, user.url_imagen_cedula, user.rol, 'activo']
      );
      console.log(`✅ Usuario creado/actualizado: ${user.email} (${user.rol}) - ${user.nombre} ${user.apellido}`);
    }

    console.log('✨ Seed finalizado con éxito.');
  } catch (error) {
    console.error('❌ Error en el proceso de migración o seeding:', error);
  } finally {
    await pool.end();
  }
}

seed();
