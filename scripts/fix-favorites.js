const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Путь к базе данных SQLite
const DB_PATH = path.join(process.cwd(), 'src', 'database', 'vdohnovenie.db');

/**
 * Функция для проверки и исправления данных избранного в SQLite
 */
async function checkAndFixFavorites() {
  console.log('Начинаем проверку и исправление избранного в базе данных...');

  // Проверка существования базы данных
  if (!fs.existsSync(DB_PATH)) {
    console.error(`База данных не найдена по пути: ${DB_PATH}`);
    return;
  }

  // Подключение к базе данных
  let db;
  try {
    db = new Database(DB_PATH);
    console.log('Успешное подключение к базе данных SQLite.');
  } catch (dbError) {
    console.error('Ошибка при подключении к базе данных:', dbError);
    return;
  }

  // Проверка наличия колонки favorites в таблице users
  try {
    const columnsInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasFavoritesColumn = columnsInfo.some(column => column.name === 'favorites');

    if (!hasFavoritesColumn) {
      console.log('Колонка favorites отсутствует в таблице users. Добавляем её...');
      db.prepare("ALTER TABLE users ADD COLUMN favorites TEXT").run();
      console.log('Колонка favorites успешно добавлена.');
    } else {
      console.log('Колонка favorites существует в таблице users.');
    }
  } catch (columnError) {
    console.error('Ошибка при проверке колонки favorites:', columnError);
    return;
  }

  // Получаем всех пользователей из базы данных
  let users = [];
  try {
    users = db.prepare('SELECT id, email, favorites FROM users').all();
    console.log(`В базе данных найдено ${users.length} пользователей.`);
  } catch (usersError) {
    console.error('Ошибка при получении пользователей:', usersError);
    return;
  }

  // Счетчики для статистики
  let updatedCount = 0;
  let alreadyValidCount = 0;
  let nullFavoritesCount = 0;
  let invalidJsonCount = 0;

  // Проверяем и исправляем избранное для каждого пользователя
  for (const user of users) {
    console.log(`\nПроверка пользователя ${user.email} (ID: ${user.id})`);
    
    // Если избранное отсутствует, инициализируем его
    if (user.favorites === null || user.favorites === undefined) {
      console.log('  У пользователя отсутствует поле favorites. Инициализируем...');
      const emptyFavorites = JSON.stringify({ articles: [], services: [], specialists: [] });
      
      try {
        db.prepare('UPDATE users SET favorites = ? WHERE id = ?').run(emptyFavorites, user.id);
        console.log('  Инициализировано пустое избранное.');
        nullFavoritesCount++;
        updatedCount++;
      } catch (updateError) {
        console.error('  Ошибка при инициализации избранного:', updateError);
      }
      continue;
    }

    // Проверяем, является ли избранное корректным JSON
    let favoritesObj;
    try {
      // Если уже строка JSON, парсим её
      if (typeof user.favorites === 'string') {
        favoritesObj = JSON.parse(user.favorites);
      } 
      // Если это объект, используем его напрямую
      else if (typeof user.favorites === 'object') {
        favoritesObj = user.favorites;
      }
    } catch (parseError) {
      console.error('  Ошибка при парсинге JSON избранного:', parseError);
      invalidJsonCount++;
      
      // Инициализируем пустое избранное при ошибке парсинга
      const emptyFavorites = JSON.stringify({ articles: [], services: [], specialists: [] });
      
      try {
        db.prepare('UPDATE users SET favorites = ? WHERE id = ?').run(emptyFavorites, user.id);
        console.log('  Исправлено некорректное избранное.');
        updatedCount++;
      } catch (updateError) {
        console.error('  Ошибка при исправлении избранного:', updateError);
      }
      continue;
    }

    // Проверяем структуру избранного
    const isValidStructure = 
      favoritesObj && 
      Array.isArray(favoritesObj.articles) && 
      Array.isArray(favoritesObj.services) && 
      Array.isArray(favoritesObj.specialists);

    if (!isValidStructure) {
      console.log('  Некорректная структура избранного. Исправляем...');
      
      // Создаем корректную структуру избранного
      const correctFavorites = {
        articles: Array.isArray(favoritesObj?.articles) ? favoritesObj.articles : [],
        services: Array.isArray(favoritesObj?.services) ? favoritesObj.services : [],
        specialists: Array.isArray(favoritesObj?.specialists) ? favoritesObj.specialists : []
      };
      
      const totalItems = correctFavorites.articles.length + 
                        correctFavorites.services.length + 
                        correctFavorites.specialists.length;
      
      console.log(`  Исправленное избранное содержит ${totalItems} элементов.`);
      
      try {
        const favoritesJson = JSON.stringify(correctFavorites);
        db.prepare('UPDATE users SET favorites = ? WHERE id = ?').run(favoritesJson, user.id);
        console.log('  Структура избранного успешно исправлена.');
        updatedCount++;
      } catch (updateError) {
        console.error('  Ошибка при исправлении структуры избранного:', updateError);
      }
    } else {
      console.log('  Избранное имеет корректную структуру.');
      
      // Если избранное корректно, но хранится как объект, сериализуем его
      if (typeof user.favorites === 'object') {
        try {
          const favoritesJson = JSON.stringify(favoritesObj);
          db.prepare('UPDATE users SET favorites = ? WHERE id = ?').run(favoritesJson, user.id);
          console.log('  Сериализовано избранное из объекта в JSON-строку.');
          updatedCount++;
        } catch (updateError) {
          console.error('  Ошибка при сериализации избранного:', updateError);
        }
      } else {
        alreadyValidCount++;
      }
      
      // Отображаем статистику по избранному
      const totalItems = favoritesObj.articles.length + 
                        favoritesObj.services.length + 
                        favoritesObj.specialists.length;
      
      console.log(`  Избранное содержит ${totalItems} элементов:`);
      console.log(`    Статьи: ${favoritesObj.articles.length}`);
      console.log(`    Услуги: ${favoritesObj.services.length}`);
      console.log(`    Специалисты: ${favoritesObj.specialists.length}`);
    }
  }

  // Выводим общую статистику
  console.log('\n===== РЕЗУЛЬТАТЫ ПРОВЕРКИ =====');
  console.log(`Всего пользователей: ${users.length}`);
  console.log(`Обновлено: ${updatedCount}`);
  console.log(`Уже корректно: ${alreadyValidCount}`);
  console.log(`Не имели избранного: ${nullFavoritesCount}`);
  console.log(`Имели некорректный JSON: ${invalidJsonCount}`);

  // Закрываем соединение с базой данных
  db.close();
  console.log('\nПроверка и исправление данных избранного завершены.');
}

// Запускаем проверку и исправление
checkAndFixFavorites()
  .catch(error => {
    console.error('Ошибка при выполнении скрипта:', error);
  }); 