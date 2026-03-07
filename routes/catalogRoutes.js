const express = require('express');
const router = express.Router();
const db = require('../database/sqlite');

// Каталог с пагинацией
router.get('/catalog', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const offset = (page - 1) * limit;
        
        // Товары
        const products = db.prepare(`
            SELECT * FROM products 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `).all(limit, offset);
        
        // Общее количество
        const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        const totalPages = Math.ceil(totalProducts / limit);
        
        // ===== ДАННЫЕ ДЛЯ ФИЛЬТРОВ =====
        // Количество по категориям
        const sneakersCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE category = 'SNEAKERS'").get().count;
        
        // Количество по уровням охоты
        const easyCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE hunt_level = 'EASY'").get().count;
        const mediumCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE hunt_level = 'MEDIUM'").get().count;
        const hardCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE hunt_level = 'HARD'").get().count;
        
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

// Страница товара (без изменений)
router.get('/product/:id', (req, res) => {
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        
        if (!product) {
            return res.status(404).send('Товар не найден');
        }
        
        try {
            product.sizes = JSON.parse(product.sizes);
        } catch (e) {
            product.sizes = ['40','41','42','43','44'];
        }
        
        // Похожие товары
        let similarProducts = [];
        try {
            similarProducts = db.prepare(`
                SELECT * FROM products 
                WHERE brand = ? AND id != ? 
                ORDER BY created_at DESC 
                LIMIT 4
            `).all(product.brand, product.id);
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