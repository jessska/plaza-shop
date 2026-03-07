const express = require('express');
const router = express.Router();
const { query } = require('../database/postgres');

// Каталог с пагинацией
router.get('/catalog', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const offset = (page - 1) * limit;
        
        // Товары
        const productsResult = await query(
            'SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        const products = productsResult.rows;
        
        // Общее количество
        const totalResult = await query('SELECT COUNT(*) as count FROM products');
        const totalProducts = parseInt(totalResult.rows[0].count);
        const totalPages = Math.ceil(totalProducts / limit);
        
        // Данные для фильтров
        const sneakersResult = await query("SELECT COUNT(*) as count FROM products WHERE category = 'SNEAKERS'");
        const sneakersCount = parseInt(sneakersResult.rows[0].count);
        
        const easyResult = await query("SELECT COUNT(*) as count FROM products WHERE hunt_level = 'EASY'");
        const easyCount = parseInt(easyResult.rows[0].count);
        
        const mediumResult = await query("SELECT COUNT(*) as count FROM products WHERE hunt_level = 'MEDIUM'");
        const mediumCount = parseInt(mediumResult.rows[0].count);
        
        const hardResult = await query("SELECT COUNT(*) as count FROM products WHERE hunt_level = 'HARD'");
        const hardCount = parseInt(hardResult.rows[0].count);
        
        res.render('catalog', {
            title: 'Каталог кроссовок | PLAZA',
            products: products,
            currentPage: page,
            totalPages: totalPages,
            totalProducts: totalProducts,
            sneakersCount: sneakersCount,
            easyCount: easyCount,
            mediumCount: mediumCount,
            hardCount: hardCount,
            user: req.session.user || null
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка загрузки каталога');
    }
});

// Страница товара
router.get('/product/:id', async (req, res) => {
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
        
        // Похожие товары
        let similarProducts = [];
        try {
            const similarResult = await query(
                'SELECT * FROM products WHERE brand = $1 AND id != $2 ORDER BY created_at DESC LIMIT 4',
                [product.brand, product.id]
            );
            similarProducts = similarResult.rows;
        } catch (e) {
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
});

module.exports = router;