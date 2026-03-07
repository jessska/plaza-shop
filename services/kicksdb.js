const axios = require('axios');
const { query } = require('../database/postgres');

class KicksDB {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.kicks.dev/v3/stockx';
    }

    // Получить товары с поддержкой пагинации
    async getTrendingProducts(limit = 20, page = 1) {
        try {
            console.log(`🔄 Загружаем страницу ${page} из KicksDB...`);
            
            const response = await axios.get(`${this.baseUrl}/products`, {
                params: {
                    limit: limit,
                    page: page
                },
                headers: {
                    'Authorization': this.apiKey
                }
            });

            if (response.data && response.data.data) {
                console.log(`✅ Получено товаров: ${response.data.data.length}`);
                return response.data.data;
            }
            return [];
            
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error.message);
            return [];
        }
    }

    // Сохранить товары в базу (ИСПРАВЛЕНО: конвертация в рубли)
    async saveProductsToDb(products, markup = 1.3) {
        let added = 0;
        let skipped = 0;

        for (const product of products) {
            try {
                const existing = db.prepare('SELECT id FROM products WHERE name = ?').get(product.title);
                
                if (existing) {
                    console.log(`⏩ Уже есть: ${product.title?.substring(0, 30)}...`);
                    skipped++;
                    continue;
                }

                // Цена в долларах из API
                let priceUSD = product.min_price || product.avg_price || 200;
                
                // КОНВЕРТАЦИЯ В РУБЛИ (курс 90₽ + наценка)
                const USD_TO_RUB = 90;
                let priceRUB = Math.round(priceUSD * USD_TO_RUB * markup);
                
                // Определяем уровень охоты
                let huntLevel = 'MEDIUM';
                const title = product.title?.toLowerCase() || '';
                if (title.includes('travis') || title.includes('limited') || title.includes('tiffany')) {
                    huntLevel = 'HARD';
                } else if (title.includes('yeezy') || title.includes('jordan') || priceUSD > 200) {
                    huntLevel = 'MEDIUM';
                } else {
                    huntLevel = 'EASY';
                }

                const sizes = ['40', '41', '42', '43', '44'];

                db.prepare(`
                    INSERT INTO products (
                        name, brand, price, description, category, 
                        sizes, hunt_level, image, source_url, source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    product.title || 'Без названия',
                    product.brand || 'Unknown',
                    priceRUB,  // ← Теперь цена в рублях
                    product.description || product.title || '',
                    'SNEAKERS',
                    JSON.stringify(sizes),
                    huntLevel,
                    product.image || '',
                    `https://stockx.com/${product.slug}`,
                    'kicksdb'
                );

                console.log(`✅ Добавлен: ${product.title?.substring(0, 30)}...`);
                added++;

            } catch (e) {
                console.error(`❌ Ошибка сохранения:`, e.message);
                skipped++;
            }
        }

        return { added, skipped };
    }
}

module.exports = KicksDB;