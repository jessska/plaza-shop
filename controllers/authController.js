const bcrypt = require('bcrypt');
const db = require('../database/sqlite');

// ===== РЕГИСТРАЦИЯ =====
exports.showRegister = (req, res) => {
    res.render('register', { 
        title: 'Регистрация', 
        error: null, 
        user: req.session.user || null 
    });
};

exports.register = async (req, res) => {
    const { username, email, password, fullname, phone } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const existing = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
        if (existing) {
            return res.render('register', { 
                title: 'Регистрация', 
                error: 'Пользователь уже существует', 
                user: null 
            });
        }
        
        db.prepare('INSERT INTO users (username, email, password, fullname, phone) VALUES (?, ?, ?, ?, ?)')
            .run(username, email, hashedPassword, fullname, phone);
        
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.render('register', { 
            title: 'Регистрация', 
            error: 'Ошибка при регистрации', 
            user: null 
        });
    }
};

// ===== ВХОД =====
exports.showLogin = (req, res) => {
    res.render('login', { 
        title: 'Вход', 
        error: null, 
        user: req.session.user || null 
    });
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
        
        if (!user) {
            return res.render('login', { 
                title: 'Вход', 
                error: 'Неверное имя пользователя или пароль', 
                user: null 
            });
        }
        
        const match = await bcrypt.compare(password, user.password);
        
        if (match) {
            req.session.user = {
                id: user.id,
                username: user.username,
                fullname: user.fullname,
                email: user.email
            };
            res.redirect('/cabinet');
        } else {
            res.render('login', { 
                title: 'Вход', 
                error: 'Неверное имя пользователя или пароль', 
                user: null 
            });
        }
    } catch (error) {
        console.error(error);
        res.render('login', { 
            title: 'Вход', 
            error: 'Ошибка при входе', 
            user: null 
        });
    }
};

// ===== ВЫХОД =====
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/');
};

// ===== ЛИЧНЫЙ КАБИНЕТ (С ДАННЫМИ) =====
exports.cabinet = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    try {
        // Данные пользователя
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
        
        // Адреса
        let addresses = [];
        try {
            addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC').all(req.session.user.id);
        } catch (e) {
            console.log('Таблица addresses еще не создана');
        }
        
        // Избранное
        // Избранное с названием и ценой
let favorites = [];
try {
    favorites = db.prepare(`
        SELECT f.*, p.name, p.price, p.brand 
        FROM favorites f
        JOIN products p ON f.product_id = p.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
    `).all(req.session.user.id);
} catch (e) {
    console.log('Таблица favorites еще не создана');
}
        
        // Охота
        let hunts = [];
        try {
            hunts = db.prepare("SELECT * FROM hunts WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC").all(req.session.user.id);
        } catch (e) {
            console.log('Таблица hunts еще не создана');
        }
        
        // Отправляем всё в шаблон
        res.render('cabinet', {
            title: 'Личный кабинет',
            user: user,
            addresses: addresses,
            favorites: favorites,
            hunts: hunts,
            sessionUser: req.session.user
        });
        
    } catch (error) {
        console.error('Ошибка кабинета:', error);
        res.redirect('/login');
    }
};