const db = require('../src/config/db');

async function migrate() {
    console.log('Iniciando migraciÃ³n de Fase 2 (Con Categorias, ejecutando desde volumen ./data)...');
    
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS categorias (
                id INT PRIMARY KEY AUTO_INCREMENT,
                menu_id INT NOT NULL,
                nombre VARCHAR(100) NOT NULL,
                descripcion TEXT,
                orden_visual INT DEFAULT 0
            )
        `);
        console.log('Tabla categorias creada o ya existe.');

        await db.query(`
            CREATE TABLE IF NOT EXISTS ingredients (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL,
                es_alergeno BOOLEAN DEFAULT FALSE
            )
        `);
        console.log('Tabla ingredients creada o ya existe.');

        await db.query(`
            CREATE TABLE IF NOT EXISTS product_ingredients (
                product_id INT,
                ingredient_id INT,
                PRIMARY KEY (product_id, ingredient_id),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
            )
        `);
        console.log('Tabla product_ingredients creada o ya existe.');

        // Alter products table
        try {
            await db.query('ALTER TABLE products ADD COLUMN categoria_id INT;');
            console.log('Columna categoria_id aÃ±adida a products.');
        } catch(e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }

        try {
            await db.query('ALTER TABLE products ADD COLUMN disponible BOOLEAN DEFAULT TRUE;');
            console.log('Columna disponible aÃ±adida a products.');
        } catch(e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }

        try {
            await db.query('ALTER TABLE products ADD COLUMN image_url VARCHAR(255);');
            console.log('Columna image_url aÃ±adida a products.');
        } catch(e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }

        console.log('MigraciÃ³n Fase 2 completada exitosamente.');
    } catch (error) {
        console.error('Error durante la migraciÃ³n:', error);
    } finally {
        process.exit();
    }
}

migrate();
