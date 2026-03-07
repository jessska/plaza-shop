const { Pool } = require('pg');

let pool;

async function initDB() {
    try {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false // обязательно для Render
            }
        });

        // Проверяем подключение
        await pool.query('SELECT NOW()');
        console.log('✅ Подключено к PostgreSQL');

        // Создаём таблицы, если их нет
        await createTables();
        
        return pool;
    } catch (error) {
        console.error('❌ Ошибка подключения к PostgreSQL:', error);
        throw error;
    }
}

async function createTables() {
    try {
        // Пользователи
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                fullname VARCHAR(100),
                phone VARCHAR(20),
                eu_size VARCHAR(10),
                us_size VARCHAR(10),
                foot_length VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Адреса
        await pool.query(`
            CREATE TABLE IF NOT EXISTS addresses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                recipient VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                country VARCHAR(50) NOT NULL,
                city VARCHAR(50) NOT NULL,
                address TEXT NOT NULL,
                postal_code VARCHAR(20),
                is_default INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Избранное
        await pool.query(`
            CREATE TABLE IF NOT EXISTS favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Охота
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hunts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                product_url TEXT NOT NULL,
                product_name TEXT NOT NULL,
                product_image TEXT,
                current_price INTEGER,
                target_price INTEGER,
                last_checked TIMESTAMP,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Настройки
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                email_notifications INTEGER DEFAULT 1,
                hunt_notifications INTEGER DEFAULT 1,
                language VARCHAR(10) DEFAULT 'ru',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Товары
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                brand VARCHAR(100),
                price INTEGER NOT NULL,
                old_price INTEGER,
                description TEXT,
                category VARCHAR(50),
                sizes TEXT,
                hunt_level VARCHAR(20) DEFAULT 'MEDIUM',
                image TEXT,
                images TEXT,
                source_url TEXT,
                source VARCHAR(50),
                in_stock INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Все таблицы созданы');

        // Добавляем тестовые товары, если таблица пуста
        const { rows } = await pool.query('SELECT COUNT(*) FROM products');
        if (parseInt(rows[0].count) === 0) {
            await addTestProducts();
        }

    } catch (error) {
        console.error('❌ Ошибка создания таблиц:', error);
    }
}

async function addTestProducts() {
    const testProducts = [
        ['Nike Air Force 1 Low Tiffany', 'Nike', 167000, null, 'Коллаборация Tiffany & Co.', 'SNEAKERS', JSON.stringify(['41','42','43']), 'HARD', '', 'poizon'],
        ['Travis Scott Air Jordan 1 Low', 'Jordan', 57990, null, 'Air Jordan 1 Low OG SP Travis Scott', 'SNEAKERS', JSON.stringify(['41','42','43','44']), 'HARD', '', 'poizon'],
        ['Yeezy 350 V2 Beluga', 'Adidas', 24990, 29990, 'Yeezy 350 V2 Beluga Reflective', 'SNEAKERS', JSON.stringify(['41','42','43','44']), 'MEDIUM', '', 'poizon'],
        ['Li-Ning Way of Wade 10', 'Li-Ning', 18990, 22990, 'Лимитированная серия', 'SNEAKERS', JSON.stringify(['42','43','44','45']), 'HARD', '', 'poizon'],
        ['New Balance 990v6 Grey', 'New Balance', 19990, 22990, 'Made in USA', 'SNEAKERS', JSON.stringify(['41','42','43','44']), 'MEDIUM', '', 'poizon']
    ];

    const query = `
        INSERT INTO products (name, brand, price, old_price, description, category, sizes, hunt_level, image, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    for (const p of testProducts) {
        await pool.query(query, p);
    }
    console.log('✅ Тестовые товары добавлены');
}

async function query(sql, params = []) {
    try {
        const result = await pool.query(sql, params);
        return { rows: result.rows };
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        throw error;
    }
}

module.exports = { initDB, query, pool };