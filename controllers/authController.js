const bcrypt = require('bcrypt');
const { query } = require('../database/postgres');

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
        
        // Проверяем, есть ли уже пользователь
        const existingResult = await query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        if (existingResult.rows.length > 0) {
            return res.render('register', { 
                title: 'Регистрация', 
                error: 'Пользователь уже существует', 
                user: null 
            });
        }
        
        // Добавляем пользователя
        await query(
            'INSERT INTO users (username, email, password, fullname, phone) VALUES ($1, $2, $3, $4, $5)',
            [username, email, hashedPassword, fullname, phone]
        );
        
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
        const userResult = await query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [username]
        );
        
        const user = userResult.rows[0];
        
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

// ===== ЛИЧНЫЙ КАБИНЕТ =====
exports.cabinet = async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    try {
        // Данные пользователя
        const userResult = await query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
        const user = userResult.rows[0];
        
        // Адреса
        let addresses = [];
        try {
            const addressesResult = await query(
                'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC',
                [req.session.user.id]
            );
            addresses = addressesResult.rows;
        } catch (e) {
            console.log('Таблица addresses еще не создана');
        }
        
        // Избранное
        let favorites = [];
        try {
            const favoritesResult = await query(
                `SELECT f.*, p.name, p.price, p.brand 
                FROM favorites f
                JOIN products p ON f.product_id = p.id
                WHERE f.user_id = $1
                ORDER BY f.created_at DESC`,
                [req.session.user.id]
            );
            favorites = favoritesResult.rows;
        } catch (e) {
            console.log('Таблица favorites еще не создана');
        }
        
        // Охота
        let hunts = [];
        try {
            const huntsResult = await query(
                "SELECT * FROM hunts WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC",
                [req.session.user.id]
            );
            hunts = huntsResult.rows;
        } catch (e) {
            console.log('Таблица hunts еще не создана');
        }
        
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