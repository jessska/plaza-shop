const express = require('express');
const router = express.Router();
const { query } = require('../database/postgres');

const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    next();
};

// ===== ПОЛУЧИТЬ КОРЗИНУ =====
router.get('/cart', requireAuth, async (req, res) => {
    try {
        const cartResult = await query(`
            SELECT 
                c.*,
                p.name,
                p.brand,
                p.price,
                p.image,
                p.hunt_level
            FROM carts c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
        `, [req.session.user.id]);
        
        const cartItems = cartResult.rows;
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        res.render('cart', {
            title: 'Корзина | PLAZA',
            user: req.session.user,
            cartItems: cartItems,
            total: total,
            error: null
        });
        
    } catch (error) {
        console.error('❌ Ошибка загрузки корзины:', error);
        res.status(500).render('cart', {
            title: 'Корзина | PLAZA',
            user: req.session.user,
            cartItems: [],
            total: 0,
            error: 'Не удалось загрузить корзину'
        });
    }
});

// ===== ДОБАВИТЬ В КОРЗИНУ =====
router.post('/cart/add', requireAuth, async (req, res) => {
    const { productId, size } = req.body;
    
    if (!productId) {
        return res.status(400).json({ error: 'Не указан товар' });
    }
    
    try {
        // Проверяем, есть ли уже
        const existingResult = await query(
            'SELECT * FROM carts WHERE user_id = $1 AND product_id = $2 AND size = $3',
            [req.session.user.id, productId, size || null]
        );
        
        if (existingResult.rows.length > 0) {
            await query(
                'UPDATE carts SET quantity = quantity + 1 WHERE id = $1',
                [existingResult.rows[0].id]
            );
        } else {
            await query(
                'INSERT INTO carts (user_id, product_id, quantity, size) VALUES ($1, $2, 1, $3)',
                [req.session.user.id, productId, size || null]
            );
        }
        
        const countResult = await query(
            'SELECT COALESCE(SUM(quantity), 0) as total FROM carts WHERE user_id = $1',
            [req.session.user.id]
        );
        
        res.json({ 
            success: true, 
            message: 'Товар добавлен в корзину',
            cartCount: parseInt(countResult.rows[0].total)
        });
        
    } catch (error) {
        console.error('❌ Ошибка добавления в корзину:', error);
        res.status(500).json({ error: 'Ошибка добавления в корзину' });
    }
});

// ===== ОБНОВИТЬ КОЛИЧЕСТВО =====
router.post('/cart/update', requireAuth, async (req, res) => {
    const { itemId, quantity } = req.body;
    
    if (!itemId || quantity < 1) {
        return res.status(400).json({ error: 'Неверные данные' });
    }
    
    try {
        await query(
            'UPDATE carts SET quantity = $1 WHERE id = $2 AND user_id = $3',
            [quantity, itemId, req.session.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка обновления:', error);
        res.status(500).json({ error: 'Ошибка обновления' });
    }
});

// ===== УДАЛИТЬ ИЗ КОРЗИНЫ =====
router.post('/cart/remove/:id', requireAuth, async (req, res) => {
    try {
        await query(
            'DELETE FROM carts WHERE id = $1 AND user_id = $2',
            [req.params.id, req.session.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

// ===== ОЧИСТИТЬ КОРЗИНУ =====
router.post('/cart/clear', requireAuth, async (req, res) => {
    try {
        await query('DELETE FROM carts WHERE user_id = $1', [req.session.user.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка очистки:', error);
        res.status(500).json({ error: 'Ошибка очистки' });
    }
});

module.exports = router;