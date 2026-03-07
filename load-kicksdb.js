const KicksDB = require('./services/kicksdb');
const db = require('./database/sqlite');

const API_KEY = 'KICKS-A507-718D-B241-AF687E44443B';
const MARKUP = 1.3;
const TOTAL_PAGES = 5; // Сколько страниц загрузить (20 * 5 = 100 товаров)

async function loadFromKicksDB() {
    console.log('='.repeat(60));
    console.log('🚀 ЗАГРУЗКА ТОВАРОВ ИЗ KICKSDB (С ПАГИНАЦИЕЙ)');
    console.log('='.repeat(60));

    const kicksdb = new KicksDB(API_KEY);
    let allProducts = [];
    
    // Загружаем несколько страниц
    for (let page = 1; page <= TOTAL_PAGES; page++) {
        console.log(`\n📦 Загружаем страницу ${page}...`);
        
        // Передаём номер страницы в метод getTrendingProducts
        const products = await kicksdb.getTrendingProducts(20, page);
        
        if (!products || products.length === 0) {
            console.log(`⚠️ На странице ${page} товаров нет, останавливаемся.`);
            break;
        }
        
        allProducts = [...allProducts, ...products];
        console.log(`✅ Загружено товаров со страницы ${page}: ${products.length}`);
        
        // Небольшая пауза, чтобы не перегружать API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Всего загружено товаров: ${allProducts.length}`);

    if (allProducts.length === 0) {
        console.log('\n❌ Не удалось получить товары');
        return;
    }

    console.log('\n💾 Сохраняем в базу данных...');
    const result = await kicksdb.saveProductsToDb(allProducts, MARKUP);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Добавлено новых товаров: ${result.added}`);
    console.log(`⏩ Пропущено (уже были): ${result.skipped}`);
    console.log('='.repeat(60));
}

loadFromKicksDB().catch(console.error);