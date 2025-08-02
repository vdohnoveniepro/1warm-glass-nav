// Скрипт для добавления колонок telegramId и telegramUsername в таблицу users
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Путь к базе данных
const dbPath = path.join(process.cwd(), 'src', 'database', 'vdohnovenie.db');

console.log(`Проверка наличия базы данных по пути: ${dbPath}`);
if (!fs.existsSync(dbPath)) {
  console.error('ОШИБКА: База данных не найдена!');
  console.log('Убедитесь, что вы запускаете скрипт из корневой директории проекта.');
  process.exit(1);
}

// Открываем базу данных
const db = new Database(dbPath);

try {
  console.log('Начало миграции для добавления полей Telegram в таблицу users');
  
  // Проверяем, существуют ли уже нужные колонки
  let columnsInfo = db.prepare("PRAGMA table_info(users)").all();
  const columns = columnsInfo.map(col => col.name);
  
  const missingColumns = [];
  if (!columns.includes('telegramId')) missingColumns.push('telegramId');
  if (!columns.includes('telegramUsername')) missingColumns.push('telegramUsername');
  
  if (missingColumns.length === 0) {
    console.log('Все необходимые колонки уже существуют');
    process.exit(0);
  }
  
  // Начинаем транзакцию
  db.exec('BEGIN TRANSACTION');
  
  const columnsAdded = [];
  
  // Добавляем отсутствующие колонки
  if (missingColumns.includes('telegramId')) {
    db.exec('ALTER TABLE users ADD COLUMN telegramId TEXT');
    columnsAdded.push('telegramId');
    console.log('Добавлена колонка telegramId');
  }
  
  if (missingColumns.includes('telegramUsername')) {
    db.exec('ALTER TABLE users ADD COLUMN telegramUsername TEXT');
    columnsAdded.push('telegramUsername');
    console.log('Добавлена колонка telegramUsername');
  }
  
  // Фиксируем транзакцию
  db.exec('COMMIT');
  
  console.log('Миграция успешно завершена');
  console.log('Добавленные колонки:', columnsAdded.join(', '));
} catch (error) {
  // В случае ошибки откатываем транзакцию
  db.exec('ROLLBACK');
  console.error('Ошибка при миграции:', error);
  process.exit(1);
} finally {
  // Закрываем соединение с базой данных
  db.close();
} 