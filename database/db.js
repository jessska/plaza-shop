const db = require('./sqlite');

async function connectToDB() {
    return Promise.resolve();
}

async function executeQuery(query, params = []) {
    try {
        const stmt = db.prepare(query);
        
        // Проверяем, есть ли параметры
        if (params.length > 0) {
            // Для better-sqlite3 параметры передаются как отдельные аргументы
            // Используем apply для передачи массива параметров
            if (query.trim().toUpperCase().startsWith('SELECT')) {
                const rows = stmt.all.apply(stmt, params);
                return { recordset: rows };
            } else {
                const info = stmt.run.apply(stmt, params);
                return { 
                    recordset: [],
                    rowsAffected: info.changes,
                    insertId: info.lastInsertRowid
                };
            }
        } else {
            // Без параметров
            if (query.trim().toUpperCase().startsWith('SELECT')) {
                const rows = stmt.all();
                return { recordset: rows };
            } else {
                const info = stmt.run();
                return { 
                    recordset: [],
                    rowsAffected: info.changes,
                    insertId: info.lastInsertRowid
                };
            }
        }
    } catch (err) {
        console.error('❌ Ошибка запроса:', err);
        console.error('Запрос:', query);
        console.error('Параметры:', params);
        throw err;
    }
}

module.exports = { connectToDB, executeQuery };