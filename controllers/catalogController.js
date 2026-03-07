const { query } = require('../database/postgres');
const { parsePoizonProduct } = require('../services/poizonParser');

// Показать каталог
exports.showCatalog = async (req, res) => {
    try {
        // Получаем товары
        const productsResult = await query('SELECT * FROM products ORDER BY created_at DESC');
        const products = productsResult.rows;
        
        // Получаем уникальные бренды
        const brandsResult = await query('SELECT DISTINCT brand FROM products ORDER BY brand');
        const brands = brandsResult.rows;
        
        // Получаем уникальные категории
        const categoriesResult = await query('SELECT DISTINCT category FROM products ORDER BY category');
        const categories = categoriesResult.rows;
        
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

// Страница товара
exports.getProduct = async (req, res) => {
    try {
        const productResult = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        const product = productResult.rows[0];
        
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
            const similarResult = await query(
                'SELECT * FROM products WHERE brand = $1 AND id != $2 ORDER BY created_at DESC LIMIT 4',
                [product.brand, product.id]
            );
            similarProducts = similarResult.rows;
        } catch (e) {
            console.log('Ошибка загрузки похожих товаров:', e.message);
            similarProducts = [];
        }
        
        res.render('product', {
            title: product.name,
            product: product,
            similarProducts: similarProducts,
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
        await query(`
            INSERT INTO products 
            (name, brand, price, old_price, description, category, sizes, hunt_level, image, images, source_url, source)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
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
        ]);

        res.redirect('/catalog');
    } catch (error) {
        res.render('add-from-url', {
            title: 'Добавить товар из Poizon',
            user: req.session.user || null,
            error: 'Ошибка парсинга: ' + error.message,
            product: null
        });
    }
};