// Скрипт для проверки наличия таблицы отзывов в базе данных
const Database = require('better-sqlite3');
const path = require('path');

// Путь к базе данных
const dbPath = path.join(__dirname, '..', 'database', 'vdohnovenie.db');
console.log(`Путь к базе данных: ${dbPath}`);

try {
  // Подключаемся к базе данных
  const db = new Database(dbPath, { verbose: console.log });
  console.log('Подключение к базе данных успешно');
  
  // Проверяем наличие таблицы reviews
  const reviewsTable = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='reviews'
  `).get();
  
  if (reviewsTable) {
    console.log('Таблица reviews существует');
    
    // Подсчитываем количество записей
    const count = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
    console.log(`Количество отзывов: ${count.count}`);
    
    // Выводим структуру таблицы
    const tableInfo = db.prepare('PRAGMA table_info(reviews)').all();
    console.log('Структура таблицы reviews:');
    console.table(tableInfo);
    
    // Показываем несколько записей
    const sampleReviews = db.prepare('SELECT * FROM reviews LIMIT 3').all();
    console.log('Примеры отзывов:');
    console.log(JSON.stringify(sampleReviews, null, 2));
  } else {
    console.log('Таблица reviews НЕ существует');
    
    // Проверяем другие таблицы
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table'
    `).all();
    
    console.log('Доступные таблицы в базе данных:');
    console.table(tables);
  }
  
  // Проверяем наличие таблицы review_attachments
  const attachmentsTable = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='review_attachments'
  `).get();
  
  console.log(`Таблица review_attachments ${attachmentsTable ? 'существует' : 'НЕ существует'}`);
  
  // Проверяем наличие таблицы review_reactions
  const reactionsTable = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='review_reactions'
  `).get();
  
  console.log(`Таблица review_reactions ${reactionsTable ? 'существует' : 'НЕ существует'}`);
  
  // Проверяем наличие таблицы review_replies
  const repliesTable = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='review_replies'
  `).get();
  
  console.log(`Таблица review_replies ${repliesTable ? 'существует' : 'НЕ существует'}`);
  
  // Закрываем соединение с базой данных
  db.close();
} catch (error) {
  console.error('Ошибка при проверке базы данных:', error);
} 