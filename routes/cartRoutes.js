const express = require('express');
const router = express.Router();
const { query } = require('../database/postgres');

// Проверка авторизации
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    next();
};

// ===== ПОЛУЧИТЬ КОРЗИНУ =====
router.get('/cart', requireAuth, (req, res) => {
    try {
        const cartItems = db.prepare(`
            SELECT 
                c.*,
                p.name,
                p.brand,
                p.price,
                p.image,
                p.hunt_level
            FROM carts c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `).all(req.session.user.id);
        
        // Считаем общую сумму
        const total = cartItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        
        res.render('cart', {
            title: 'Корзина | PLAZA',
            user: req.session.user,
            cartItems: cartItems,
            total: total,
            error: null
        });
        
    } catch (error) {
        console.error('Ошибка загрузки корзины:', error);
        res.status(500).send('Ошибка загрузки корзины');
    }
});

// ===== ДОБАВИТЬ В КОРЗИНУ =====
router.post('/cart/add', requireAuth, (req, res) => {
    const { productId, size } = req.body;
    
    if (!productId) {
        return res.status(400).json({ error: 'Не указан товар' });
    }
    
    try {
        // Проверяем, есть ли уже такой товар в корзине
        const existing = db.prepare(`
            SELECT * FROM carts 
            WHERE user_id = ? AND product_id = ? AND size = ?
        `).get(req.session.user.id, productId, size || null);
        
        if (existing) {
            // Если есть — увеличиваем количество
            db.prepare(`
                UPDATE carts 
                SET quantity = quantity + 1 
                WHERE id = ?
            `).run(existing.id);
        } else {
            // Если нет — добавляем
            db.prepare(`
                INSERT INTO carts (user_id, product_id, quantity, size)
                VALUES (?, ?, 1, ?)
            `).run(req.session.user.id, productId, size || null);
        }
        
        // Получаем общее количество товаров в корзине
        const count = db.prepare(`
            SELECT SUM(quantity) as total 
            FROM carts 
            WHERE user_id = ?
        `).get(req.session.user.id);
        
        res.json({ 
            success: true, 
            message: 'Товар добавлен в корзину',
            cartCount: count.total || 0
        });
        
    } catch (error) {
        console.error('Ошибка добавления в корзину:', error);
        res.status(500).json({ error: 'Ошибка добавления в корзину' });
    }
});

// ===== ОБНОВИТЬ КОЛИЧЕСТВО =====
router.post('/cart/update', requireAuth, (req, res) => {
    const { itemId, quantity } = req.body;
    
    if (!itemId || quantity < 1) {
        return res.status(400).json({ error: 'Неверные данные' });
    }
    
    try {
        db.prepare(`
            UPDATE carts 
            SET quantity = ? 
            WHERE id = ? AND user_id = ?
        `).run(quantity, itemId, req.session.user.id);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Ошибка обновления корзины:', error);
        res.status(500).json({ error: 'Ошибка обновления' });
    }
});

// ===== УДАЛИТЬ ИЗ КОРЗИНЫ =====
router.post('/cart/remove/:id', requireAuth, (req, res) => {
    try {
        db.prepare(`
            DELETE FROM carts 
            WHERE id = ? AND user_id = ?
        `).run(req.params.id, req.session.user.id);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Ошибка удаления из корзины:', error);
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

// ===== ОЧИСТИТЬ КОРЗИНУ =====
router.post('/cart/clear', requireAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM carts WHERE user_id = ?').run(req.session.user.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка очистки корзины:', error);
        res.status(500).json({ error: 'Ошибка очистки' });
    }
});

module.exports = router;