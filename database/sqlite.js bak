const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'plaza.db');
const db = new Database(dbPath);

// ==================== ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ ====================
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        fullname TEXT,
        phone TEXT,
        eu_size TEXT,
        us_size TEXT,
        foot_length TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

try {
    db.exec(`ALTER TABLE users ADD COLUMN phone TEXT`);
} catch (e) {}

// ==================== ТАБЛИЦА АДРЕСОВ ====================
db.exec(`
    CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        recipient TEXT NOT NULL,
        phone TEXT NOT NULL,
        country TEXT NOT NULL,
        city TEXT NOT NULL,
        address TEXT NOT NULL,
        postal_code TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// ==================== ТАБЛИЦА ИЗБРАННОГО ====================
db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// ==================== ТАБЛИЦА ОХОТЫ ====================
db.exec(`
    CREATE TABLE IF NOT EXISTS hunts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_url TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_image TEXT,
        current_price INTEGER,
        target_price INTEGER,
        last_checked DATETIME,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// ==================== ТАБЛИЦА НАСТРОЕК ====================
db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        email_notifications INTEGER DEFAULT 1,
        hunt_notifications INTEGER DEFAULT 1,
        language TEXT DEFAULT 'ru',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// ==================== ТАБЛИЦА ТОВАРОВ ====================
db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT,
        price INTEGER NOT NULL,
        old_price INTEGER,
        description TEXT,
        category TEXT,
        sizes TEXT,
        hunt_level TEXT DEFAULT 'MEDIUM',
        image TEXT,
        images TEXT,
        source_url TEXT,
        source TEXT,
        in_stock INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

try {
    db.exec(`ALTER TABLE products ADD COLUMN images TEXT`);
    db.exec(`ALTER TABLE products ADD COLUMN source_url TEXT`);
    db.exec(`ALTER TABLE products ADD COLUMN source TEXT`);
} catch (e) {}

// ==================== ТАБЛИЦА КОРЗИНЫ (ОЧЕНЬ ВАЖНО!) ====================
db.exec(`
    CREATE TABLE IF NOT EXISTS carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        size TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id, size)
    )
`);
console.log('✅ Таблица carts создана или уже существует');

// ==================== ТЕСТОВЫЕ ТОВАРЫ ====================
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productCount.count === 0) {
    console.log('📦 Добавляем тестовые товары...');
    const insertProduct = db.prepare(`
        INSERT INTO products (name, brand, price, old_price, description, category, sizes, hunt_level, image, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const testProducts = [
        ['Nike Air Force 1 Low Tiffany', 'Nike', 167000, null, 'Коллаборация Tiffany & Co. и Nike. Лимитированный дроп.', 'SNEAKERS', JSON.stringify(['41','42','43']), 'HARD', '', 'poizon'],
        ['Travis Scott Air Jordan 1 Low', 'Jordan', 57990, null, 'Air Jordan 1 Low OG SP Travis Scott Velvet Brown', 'SNEAKERS', JSON.stringify(['41','42','43','44']), 'HARD', '', 'poizon'],
        ['Yeezy 350 V2 Beluga', 'Adidas', 24990, 29990, 'Yeezy 350 V2 Beluga Reflective', 'SNEAKERS', JSON.stringify(['41','42','43','44']), 'MEDIUM', '', 'poizon'],
        ['Li-Ning Way of Wade 10', 'Li-Ning', 18990, 22990, 'Лимитированная серия баскетбольных кроссовок', 'SNEAKERS', JSON.stringify(['42','43','44','45']), 'HARD', '', 'poizon'],
        ['New Balance 990v6 Grey', 'New Balance', 19990, 22990, 'Made in USA. Премиальный комфорт.', 'SNEAKERS', JSON.stringify(['41','42','43','44']), 'MEDIUM', '', 'poizon'],
    ];
    
    testProducts.forEach(p => insertProduct.run(...p));
    console.log('✅ Тестовые товары добавлены');
}

console.log('✅ База данных подключена');
module.exports = db;