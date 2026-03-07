const express = require('express');
const router = express.Router();
const { query } = require('../database/postgres'); // ← изменили подключение
const bcrypt = require('bcrypt');

// Middleware: проверка авторизации
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// ===== НАСТРОЙКИ ПРОФИЛЯ =====
router.get('/settings', requireAuth, async (req, res) => {
    try {
        let settingsResult = await query('SELECT * FROM user_settings WHERE user_id = $1', [req.session.user.id]);
        let settings = settingsResult.rows[0];
        
        if (!settings) {
            await query('INSERT INTO user_settings (user_id) VALUES ($1)', [req.session.user.id]);
            settings = { email_notifications: 1, hunt_notifications: 1, language: 'ru' };
        }
        
        const userResult = await query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
        const user = userResult.rows[0];
        
        res.render('settings', {
            title: 'Настройки профиля',
            user: user,
            settings: settings,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error(error);
        res.redirect('/cabinet');
    }
});

router.post('/settings', requireAuth, async (req, res) => {
    const { email_notifications, hunt_notifications, language } = req.body;
    
    try {
        await query(
            `UPDATE user_settings 
            SET email_notifications = $1, hunt_notifications = $2, language = $3
            WHERE user_id = $4`,
            [
                email_notifications ? 1 : 0,
                hunt_notifications ? 1 : 0,
                language || 'ru',
                req.session.user.id
            ]
        );
        
        res.redirect('/settings?success=1');
    } catch (error) {
        console.error(error);
        res.redirect('/settings?error=1');
    }
});

router.post('/change-password', requireAuth, async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    
    try {
        const userResult = await query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
        const user = userResult.rows[0];
        
        const match = await bcrypt.compare(current_password, user.password);
        if (!match) {
            return res.redirect('/settings?error=wrong_password');
        }
        
        if (new_password !== confirm_password) {
            return res.redirect('/settings?error=password_mismatch');
        }
        
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.session.user.id]);
        
        res.redirect('/settings?success=password_changed');
    } catch (error) {
        console.error(error);
        res.redirect('/settings?error=1');
    }
});

// ===== ОБНОВЛЕНИЕ ПРОФИЛЯ (имя, телефон) =====
router.post('/update-profile', requireAuth, async (req, res) => {
    const { fullname, phone } = req.body;
    
    try {
        await query('UPDATE users SET fullname = $1, phone = $2 WHERE id = $3', [
            fullname,
            phone,
            req.session.user.id
        ]);
        
        req.session.user.fullname = fullname;
        
        console.log('✅ Профиль обновлен:', fullname, phone);
        
        res.redirect('/settings?success=profile_updated');
    } catch (error) {
        console.error('❌ Ошибка обновления профиля:', error);
        res.redirect('/settings?error=1');
    }
});

// ===== АДРЕСА ДОСТАВКИ =====
router.get('/addresses', requireAuth, async (req, res) => {
    try {
        const addressesResult = await query(
            'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
            [req.session.user.id]
        );
        const addresses = addressesResult.rows;
        
        res.render('addresses', {
            title: 'Мои адреса',
            user: req.session.user,
            addresses: addresses,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error(error);
        res.redirect('/cabinet');
    }
});

router.get('/addresses/new', requireAuth, (req, res) => {
    res.render('address-form', {
        title: 'Новый адрес',
        user: req.session.user,
        address: null,
        edit: false
    });
});

router.post('/addresses', requireAuth, async (req, res) => {
    const { name, recipient, phone, country, city, address, postal_code, is_default } = req.body;
    
    try {
        if (is_default) {
            await query('UPDATE addresses SET is_default = 0 WHERE user_id = $1', [req.session.user.id]);
        }
        
        await query(
            `INSERT INTO addresses (user_id, name, recipient, phone, country, city, address, postal_code, is_default)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                req.session.user.id,
                name,
                recipient,
                phone,
                country,
                city,
                address,
                postal_code,
                is_default ? 1 : 0
            ]
        );
        
        res.redirect('/addresses?success=added');
    } catch (error) {
        console.error(error);
        res.redirect('/addresses/new?error=1');
    }
});

router.get('/addresses/:id/edit', requireAuth, async (req, res) => {
    try {
        const addressResult = await query(
            'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
            [req.params.id, req.session.user.id]
        );
        const address = addressResult.rows[0];
        
        if (!address) {
            return res.redirect('/addresses');
        }
        
        res.render('address-form', {
            title: 'Редактировать адрес',
            user: req.session.user,
            address: address,
            edit: true
        });
    } catch (error) {
        console.error(error);
        res.redirect('/addresses');
    }
});

router.post('/addresses/:id', requireAuth, async (req, res) => {
    const { name, recipient, phone, country, city, address, postal_code, is_default } = req.body;
    
    try {
        if (is_default) {
            await query('UPDATE addresses SET is_default = 0 WHERE user_id = $1', [req.session.user.id]);
        }
        
        await query(
            `UPDATE addresses 
            SET name = $1, recipient = $2, phone = $3, country = $4, city = $5, address = $6, postal_code = $7, is_default = $8
            WHERE id = $9 AND user_id = $10`,
            [
                name,
                recipient,
                phone,
                country,
                city,
                address,
                postal_code,
                is_default ? 1 : 0,
                req.params.id,
                req.session.user.id
            ]
        );
        
        res.redirect('/addresses?success=updated');
    } catch (error) {
        console.error(error);
        res.redirect(`/addresses/${req.params.id}/edit?error=1`);
    }
});

router.post('/addresses/:id/delete', requireAuth, async (req, res) => {
    try {
        await query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [
            req.params.id,
            req.session.user.id
        ]);
        res.redirect('/addresses?success=deleted');
    } catch (error) {
        console.error(error);
        res.redirect('/addresses?error=1');
    }
});

// ===== РАЗМЕРЫ =====
router.get('/sizes', requireAuth, async (req, res) => {
    try {
        const userResult = await query(
            'SELECT eu_size, us_size, foot_length FROM users WHERE id = $1',
            [req.session.user.id]
        );
        const user = userResult.rows[0];
        
        res.render('sizes', {
            title: 'Мои размеры',
            user: req.session.user,
            sizes: user,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error(error);
        res.redirect('/cabinet');
    }
});

router.post('/sizes', requireAuth, async (req, res) => {
    const { eu_size, us_size, foot_length } = req.body;
    
    try {
        await query(
            'UPDATE users SET eu_size = $1, us_size = $2, foot_length = $3 WHERE id = $4',
            [eu_size, us_size, foot_length, req.session.user.id]
        );
        
        res.redirect('/sizes?success=1');
    } catch (error) {
        console.error(error);
        res.redirect('/sizes?error=1');
    }
});

// ===== ИЗБРАННОЕ =====
router.get('/favorites', requireAuth, async (req, res) => {
    try {
        const favoritesResult = await query(
            `SELECT f.*, p.name, p.price, p.image, p.brand 
            FROM favorites f
            JOIN products p ON f.product_id = p.id
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC`,
            [req.session.user.id]
        );
        const favorites = favoritesResult.rows;
        
        res.render('favorites', {
            title: 'Избранное',
            user: req.session.user,
            favorites: favorites,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error(error);
        res.render('favorites', {
            title: 'Избранное',
            user: req.session.user,
            favorites: [],
            success: req.query.success || null,
            error: req.query.error || null
        });
    }
});

router.post('/favorites/add/:product_id', requireAuth, async (req, res) => {
    try {
        const existsResult = await query(
            'SELECT id FROM favorites WHERE user_id = $1 AND product_id = $2',
            [req.session.user.id, req.params.product_id]
        );
        
        if (existsResult.rows.length === 0) {
            await query(
                'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2)',
                [req.session.user.id, req.params.product_id]
            );
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

router.post('/favorites/remove/:product_id', requireAuth, async (req, res) => {
    try {
        await query(
            'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2',
            [req.session.user.id, req.params.product_id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// ===== ОХОТА =====
router.get('/hunts', requireAuth, async (req, res) => {
    try {
        const huntsResult = await query(
            `SELECT * FROM hunts 
            WHERE user_id = $1 AND status = 'active' 
            ORDER BY created_at DESC`,
            [req.session.user.id]
        );
        const hunts = huntsResult.rows;
        
        console.log('Найдено охот:', hunts.length);
        
        res.render('hunts', {
            title: 'Моя охота',
            user: req.session.user,
            hunts: hunts,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Ошибка загрузки охоты:', error.message);
        res.render('hunts', {
            title: 'Моя охота',
            user: req.session.user,
            hunts: [],
            success: req.query.success || null,
            error: req.query.error || null
        });
    }
});

router.get('/hunts/new', requireAuth, (req, res) => {
    res.render('hunt-form', {
        title: 'Новая охота',
        user: req.session.user,
        hunt: null
    });
});

// Добавление в охоту со страницы товара
router.post('/hunts/add/:productId', requireAuth, async (req, res) => {
    try {
        const productResult = await query('SELECT * FROM products WHERE id = $1', [req.params.productId]);
        const product = productResult.rows[0];
        
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        // Проверяем, есть ли уже в охоте
        const existingResult = await query(
            'SELECT id FROM hunts WHERE user_id = $1 AND product_name = $2',
            [req.session.user.id, product.name]
        );
        
        if (existingResult.rows.length > 0) {
            return res.json({ success: false, error: 'Уже в охоте' });
        }
        
        // Добавляем в охоту
        await query(
            `INSERT INTO hunts (user_id, product_url, product_name, target_price, status)
            VALUES ($1, $2, $3, $4, 'active')`,
            [
                req.session.user.id,
                product.source_url || '',
                product.name,
                product.price
            ]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Ошибка добавления в охоту:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление в охоту из формы
router.post('/hunts', requireAuth, async (req, res) => {
    const { product_url, product_name, target_price } = req.body;
    
    try {
        if (!product_name || !product_url) {
            return res.redirect('/hunts/new?error=1');
        }
        
        await query(
            `INSERT INTO hunts (user_id, product_url, product_name, target_price, status)
            VALUES ($1, $2, $3, $4, 'active')`,
            [
                req.session.user.id,
                product_url,
                product_name,
                target_price ? parseInt(target_price) : null
            ]
        );
        
        console.log('✅ Охота добавлена:', product_name);
        
        res.redirect('/hunts?success=added');
    } catch (error) {
        console.error('❌ Ошибка добавления охоты:', error);
        res.redirect('/hunts/new?error=1');
    }
});

router.post('/hunts/:id/delete', requireAuth, async (req, res) => {
    try {
        await query(
            "UPDATE hunts SET status = 'archived' WHERE id = $1 AND user_id = $2",
            [req.params.id, req.session.user.id]
        );
        
        res.redirect('/hunts?success=deleted');
    } catch (error) {
        console.error(error);
        res.redirect('/hunts?error=1');
    }
});

module.exports = router;