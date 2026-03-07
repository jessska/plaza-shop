const express = require('express');
const session = require('express-session');
const path = require('path');
const { query, initDB } = require('./database/postgres');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'plaza-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Подключаем маршруты
const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const profileRoutes = require('./routes/profileRoutes');
const cartRoutes = require('./routes/cartRoutes');

app.use('/', authRoutes);
app.use('/', catalogRoutes);
app.use('/', profileRoutes);
app.use('/', cartRoutes);

// Главная страница (ИСПРАВЛЕНО)
app.get('/', async (req, res) => {
    try {
        const productsResult = await query('SELECT * FROM products ORDER BY created_at DESC LIMIT 4');
        const products = productsResult.rows;
        
        res.render('index', {
            title: 'PLAZA - Главная',
            user: req.session.user || null,
            products: products
        });
    } catch (error) {
        console.error(error);
        res.render('index', {
            title: 'PLAZA - Главная',
            user: req.session.user || null,
            products: []
        });
    }
});

// Запуск сервера после подключения к базе
initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
    });
}).catch(err => {
    console.error('❌ Ошибка запуска сервера:', err);
    process.exit(1);
});