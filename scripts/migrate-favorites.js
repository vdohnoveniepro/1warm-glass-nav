const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Путь к базе данных SQLite
const dbPath = path.join(process.cwd(), 'src', 'database', 'vdohnovenie.db');
console.log('Путь к базе данных:', dbPath);

// Открываем соединение с базой данных
const db = new Database(dbPath);

// Путь к JSON-файлу с пользователями
const usersFilePath = path.join(process.cwd(), 'public', 'data_backup_json', 'users', 'users.json');
console.log('Путь к файлу пользователей:', usersFilePath);

// Проверяем существование файла
if (!fs.existsSync(usersFilePath)) {
  console.error('Файл с пользователями не найден:', usersFilePath);
  process.exit(1);
}

// Загружаем данные пользователей из JSON
const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
console.log(`Начинаем миграцию ${users.length} пользователей...`);

// Проверяем, есть ли колонка favorites в таблице users
const columnsInfo = db.prepare("PRAGMA table_info(users)").all();
const hasFavoritesColumn = columnsInfo.some(column => column.name === 'favorites');

if (!hasFavoritesColumn) {
  console.log('Добавляем колонку favorites в таблицу users');
  db.prepare("ALTER TABLE users ADD COLUMN favorites TEXT").run();
}

// Счетчик обновленных пользователей
let count = 0;
let emptyCount = 0;

// Перебираем пользователей и обновляем их избранное
for (const user of users) {
  if (user.favorites) {
    // Создаем структуру данных для избранного
    const favorites = {
      articles: user.favorites.articles || [],
      services: user.favorites.services || [],
      specialists: user.favorites.specialists || []
    };
    
    const totalItems = favorites.articles.length + favorites.services.length + favorites.specialists.length;
    
    if (totalItems > 0) {
      console.log(`Пользователь ${user.id} имеет ${totalItems} элементов в избранном`);
      console.log('  Статьи:', favorites.articles.length);
      console.log('  Услуги:', favorites.services.length);
      console.log('  Специалисты:', favorites.specialists.length);
    } else {
      emptyCount++;
    }
    
    // Сериализуем избранное в JSON
    const favoritesJson = JSON.stringify(favorites);
    
    try {
      // Обновляем данные в базе SQLite
      db.prepare('UPDATE users SET favorites = ? WHERE id = ?').run(favoritesJson, user.id);
      count++;
    } catch (err) {
      console.error(`Ошибка при обновлении пользователя ${user.id}:`, err.message);
    }
  }
}

console.log(`Миграция избранного завершена.`);
console.log(`Обновлено ${count} пользователей с избранным.`);
console.log(`Из них ${emptyCount} с пустым списком избранного.`);

// Закрываем соединение с базой данных
db.close(); 