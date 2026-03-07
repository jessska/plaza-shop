const KicksDB = require('./services/kicksdb');
const db = require('./database/sqlite');

// ВСТАВЬ СВОЙ API-КЛЮЧ СЮДА!
const API_KEY = 'твой_ключ_сюда';

async function main() {
    console.log('='.repeat(50));
    console.log('🚀 ЗАГРУЗКА ТОВАРОВ ИЗ KICKSDB');
    console.log('='.repeat(50));

    const kicksdb = new KicksDB(API_KEY);
    
    // Получаем популярные товары
    console.log('\n📦 Получаем популярные кроссовки...');
    const products = await kicksdb.getTrendingProducts(20);
    
    if (products.length === 0) {
        console.log('\n❌ Не удалось получить товары. Проверь API-ключ.');
        return;
    }

    console.log(`\n📊 Получено товаров: ${products.length}`);
    
    // Сохраняем в базу с наценкой 30%
    console.log('\n💾 Сохраняем в базу данных...');
    const { added, skipped } = await kicksdb.saveProductsToDb(products, 1.3);
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Добавлено новых товаров: ${added}`);
    console.log(`⏩ Пропущено (уже были): ${skipped}`);
    console.log('='.repeat(50));
}

main().catch(console.error);