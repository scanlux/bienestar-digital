require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'marketplace_db'
    });

    try {
        console.log('--- Creando tabla store_operating_hours ---');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS store_operating_hours (
                id INT AUTO_INCREMENT PRIMARY KEY,
                store_id INT NOT NULL,
                day_index INT NOT NULL COMMENT '0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab',
                status ENUM('abierto', 'cerrado', 'vacaciones') DEFAULT 'abierto',
                open_time TIME DEFAULT '08:00:00',
                close_time TIME DEFAULT '20:00:00',
                is_24h TINYINT(1) DEFAULT 0,
                UNIQUE KEY unique_store_day (store_id, day_index),
                FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Tablas creadas correctamente.');

        // Opcional: Migrar datos existentes de 'stores' a la nueva tabla
        const [stores] = await connection.query('SELECT id, open_time, close_time, is_24h, estado FROM stores');
        
        for (const store of stores) {
            console.log(`Migrando horario para Sede ID: ${store.id}`);
            for (let i = 0; i <= 6; i++) {
                // Si el estado global es mantenimiento o cerrado, podríamos setearlo, 
                // pero por ahora usemos el horario configurado.
                await connection.query(`
                    INSERT IGNORE INTO store_operating_hours 
                    (store_id, day_index, status, open_time, close_time, is_24h)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    store.id, 
                    i, 
                    store.estado === 'cerrado' ? 'cerrado' : 'abierto',
                    store.open_time || '08:00:00',
                    store.close_time || '20:00:00',
                    store.is_24h || 0
                ]);
            }
        }
        
        console.log('Migración de datos finalizada.');

    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        await connection.end();
    }
}

migrate();
