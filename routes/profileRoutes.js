const express = require('express');
const router = express.Router();
const db = require('../database/sqlite');
const bcrypt = require('bcrypt');

// Middleware: проверка авторизации
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// ===== НАСТРОЙКИ ПРОФИЛЯ =====
router.get('/settings', requireAuth, (req, res) => {
    try {
        let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.session.user.id);
        
        if (!settings) {
            db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(req.session.user.id);
            settings = { email_notifications: 1, hunt_notifications: 1, language: 'ru' };
        }
        
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
        
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

router.post('/settings', requireAuth, (req, res) => {
    const { email_notifications, hunt_notifications, language } = req.body;
    
    try {
        db.prepare(`
            UPDATE user_settings 
            SET email_notifications = ?, hunt_notifications = ?, language = ?
            WHERE user_id = ?
        `).run(
            email_notifications ? 1 : 0,
            hunt_notifications ? 1 : 0,
            language || 'ru',
            req.session.user.id
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
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
        
        const match = await bcrypt.compare(current_password, user.password);
        if (!match) {
            return res.redirect('/settings?error=wrong_password');
        }
        
        if (new_password !== confirm_password) {
            return res.redirect('/settings?error=password_mismatch');
        }
        
        const hashedPassword = await bcrypt.hash(new_password, 10);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.session.user.id);
        
        res.redirect('/settings?success=password_changed');
    } catch (error) {
        console.error(error);
        res.redirect('/settings?error=1');
    }
});

// ===== ОБНОВЛЕНИЕ ПРОФИЛЯ (имя, телефон) =====
router.post('/update-profile', requireAuth, (req, res) => {
    const { fullname, phone } = req.body;
    
    try {
        db.prepare('UPDATE users SET fullname = ?, phone = ? WHERE id = ?').run(
            fullname,
            phone,
            req.session.user.id
        );
        
        req.session.user.fullname = fullname;
        
        console.log('✅ Профиль обновлен:', fullname, phone);
        
        res.redirect('/settings?success=profile_updated');
    } catch (error) {
        console.error('❌ Ошибка обновления профиля:', error);
        res.redirect('/settings?error=1');
    }
});

// ===== АДРЕСА ДОСТАВКИ =====
router.get('/addresses', requireAuth, (req, res) => {
    try {
        const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC').all(req.session.user.id);
        
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

router.post('/addresses', requireAuth, (req, res) => {
    const { name, recipient, phone, country, city, address, postal_code, is_default } = req.body;
    
    try {
        if (is_default) {
            db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.session.user.id);
        }
        
        db.prepare(`
            INSERT INTO addresses (user_id, name, recipient, phone, country, city, address, postal_code, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            req.session.user.id,
            name,
            recipient,
            phone,
            country,
            city,
            address,
            postal_code,
            is_default ? 1 : 0
        );
        
        res.redirect('/addresses?success=added');
    } catch (error) {
        console.error(error);
        res.redirect('/addresses/new?error=1');
    }
});

router.get('/addresses/:id/edit', requireAuth, (req, res) => {
    try {
        const address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.session.user.id);
        
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

router.post('/addresses/:id', requireAuth, (req, res) => {
    const { name, recipient, phone, country, city, address, postal_code, is_default } = req.body;
    
    try {
        if (is_default) {
            db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.session.user.id);
        }
        
        db.prepare(`
            UPDATE addresses 
            SET name = ?, recipient = ?, phone = ?, country = ?, city = ?, address = ?, postal_code = ?, is_default = ?
            WHERE id = ? AND user_id = ?
        `).run(
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
        );
        
        res.redirect('/addresses?success=updated');
    } catch (error) {
        console.error(error);
        res.redirect(`/addresses/${req.params.id}/edit?error=1`);
    }
});

router.post('/addresses/:id/delete', requireAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.session.user.id);
        res.redirect('/addresses?success=deleted');
    } catch (error) {
        console.error(error);
        res.redirect('/addresses?error=1');
    }
});

// ===== РАЗМЕРЫ =====
router.get('/sizes', requireAuth, (req, res) => {
    try {
        const user = db.prepare('SELECT eu_size, us_size, foot_length FROM users WHERE id = ?').get(req.session.user.id);
        
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

router.post('/sizes', requireAuth, (req, res) => {
    const { eu_size, us_size, foot_length } = req.body;
    
    try {
        db.prepare('UPDATE users SET eu_size = ?, us_size = ?, foot_length = ? WHERE id = ?').run(
            eu_size,
            us_size,
            foot_length,
            req.session.user.id
        );
        
        res.redirect('/sizes?success=1');
    } catch (error) {
        console.error(error);
        res.redirect('/sizes?error=1');
    }
});

// ===== ИЗБРАННОЕ =====
router.get('/favorites', requireAuth, (req, res) => {
    try {
        const favorites = db.prepare(`
            SELECT f.*, p.name, p.price, p.image, p.brand 
            FROM favorites f
            JOIN products p ON f.product_id = p.id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        `).all(req.session.user.id);
        
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

router.post('/favorites/add/:product_id', requireAuth, (req, res) => {
    try {
        const exists = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(
            req.session.user.id,
            req.params.product_id
        );
        
        if (!exists) {
            db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(
                req.session.user.id,
                req.params.product_id
            );
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

router.post('/favorites/remove/:product_id', requireAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(
            req.session.user.id,
            req.params.product_id
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// ===== ОХОТА (ИСПРАВЛЕННАЯ) =====
router.get('/hunts', requireAuth, (req, res) => {
    try {
        // Проверяем, существует ли таблица
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='hunts'").get();
        
        if (!tableCheck) {
            // Таблицы нет - создаем
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
            console.log('✅ Таблица hunts создана');
        }
        
        const hunts = db.prepare(`
            SELECT * FROM hunts 
            WHERE user_id = ? AND status = 'active' 
            ORDER BY created_at DESC
        `).all(req.session.user.id);
        
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
router.post('/hunts/add/:productId', requireAuth, (req, res) => {
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.productId);
        
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        // Проверяем, есть ли уже в охоте
        const existing = db.prepare('SELECT id FROM hunts WHERE user_id = ? AND product_name = ?').get(
            req.session.user.id,
            product.name
        );
        
        if (existing) {
            return res.json({ success: false, error: 'Уже в охоте' });
        }
        
        // Добавляем в охоту
        db.prepare(`
            INSERT INTO hunts (user_id, product_url, product_name, target_price, status)
            VALUES (?, ?, ?, ?, 'active')
        `).run(
            req.session.user.id,
            product.source_url || '',
            product.name,
            product.price
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Ошибка добавления в охоту:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/hunts/:id/delete', requireAuth, (req, res) => {
    try {
        db.prepare("UPDATE hunts SET status = 'archived' WHERE id = ? AND user_id = ?").run(
            req.params.id,
            req.session.user.id
        );
        
        res.redirect('/hunts?success=deleted');
    } catch (error) {
        console.error(error);
        res.redirect('/hunts?error=1');
    }
});

module.exports = router;