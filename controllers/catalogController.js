const db = require('../database/sqlite');
const { parsePoizonProduct } = require('../services/poizonParser');

// Показать каталог
exports.showCatalog = (req, res) => {
    try {
        const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
        
        const brands = db.prepare('SELECT DISTINCT brand FROM products ORDER BY brand').all();
        const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
        
        res.render('catalog', {
            title: 'Каталог кроссовок | PLAZA',
            products: products,
            brands: brands,
            categories: categories,
            user: req.session.user || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка загрузки каталога');
    }
};

// Страница товара (ОБНОВЛЁННАЯ)
exports.getProduct = (req, res) => {
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        
        if (!product) {
            return res.status(404).send('Товар не найден');
        }
        
        // Парсим размеры из JSON
        try {
            product.sizes = JSON.parse(product.sizes);
        } catch (e) {
            product.sizes = ['40','41','42','43','44'];
        }
        
        // Получаем похожие товары (того же бренда, но не текущий)
        let similarProducts = [];
        try {
            similarProducts = db.prepare(`
                SELECT * FROM products 
                WHERE brand = ? AND id != ? 
                ORDER BY created_at DESC 
                LIMIT 4
            `).all(product.brand, product.id);
        } catch (e) {
            console.log('Ошибка загрузки похожих товаров:', e.message);
            similarProducts = [];
        }
        
        res.render('product', {
            title: product.name,
            product: product,
            similarProducts: similarProducts, // ← Теперь передаём
            user: req.session.user || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка загрузки товара');
    }
};

// Страница формы добавления товара по ссылке
exports.showAddFromUrl = (req, res) => {
    res.render('add-from-url', {
        title: 'Добавить товар из Poizon',
        user: req.session.user || null,
        error: null,
        product: null
    });
};

// Обработка POST запроса с ссылкой
exports.addFromUrl = async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.render('add-from-url', {
            title: 'Добавить товар из Poizon',
            user: req.session.user || null,
            error: 'Введите ссылку',
            product: null
        });
    }

    try {
        // Парсим товар
        const productData = await parsePoizonProduct(url);

        // Сохраняем в базу
        const stmt = db.prepare(`
            INSERT INTO products 
            (name, brand, price, old_price, description, category, sizes, hunt_level, image, images, source_url, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            productData.name,
            productData.brand,
            productData.price,
            productData.old_price,
            productData.description,
            productData.category,
            productData.sizes,
            productData.hunt_level,
            productData.image,
            JSON.stringify(productData.images),
            productData.source_url,
            'poizon'
        );

        res.redirect(`/product/${result.lastInsertRowid}`);
    } catch (error) {
        res.render('add-from-url', {
            title: 'Добавить товар из Poizon',
            user: req.session.user || null,
            error: 'Ошибка парсинга: ' + error.message,
            product: null
        });
    }
};