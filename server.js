const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDB, query } = require('./database/postgres');
const { query } = require('./database/postgres');

const app = express();
const PORT = 3000;

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

const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const profileRoutes = require('./routes/profileRoutes');
const cartRoutes = require('./routes/cartRoutes');

app.use('/', authRoutes);
app.use('/', catalogRoutes);
app.use('/', profileRoutes);
app.use('/', cartRoutes);

app.get('/', (req, res) => {
    try {
        const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC LIMIT 4').all();
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

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});

const PORT = process.env.PORT || 3000;

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
    });
}).catch(err => {
    console.error('❌ Ошибка запуска сервера:', err);
    process.exit(1);
});