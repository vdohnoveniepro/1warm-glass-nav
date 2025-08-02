const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Путь к базе данных SQLite
const DB_PATH = path.join(process.cwd(), 'sqlite.db');

/**
 * Скрипт для миграции ролей пользователей
 * 
 * Добавляет колонку roles в таблицу users (если её ещё нет)
 * и инициализирует ее значениями на основе колонки role
 */
function migrateRoles() {
  console.log('Начинаем миграцию ролей пользователей...');

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

  // Проверка наличия колонки roles в таблице users
  try {
    const columnsInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasRolesColumn = columnsInfo.some(column => column.name === 'roles');

    if (!hasRolesColumn) {
      console.log('Колонка roles отсутствует в таблице users. Добавляем её...');
      db.prepare("ALTER TABLE users ADD COLUMN roles TEXT").run();
      console.log('Колонка roles успешно добавлена.');
    } else {
      console.log('Колонка roles уже существует в таблице users.');
    }
  } catch (columnError) {
    console.error('Ошибка при проверке колонки roles:', columnError);
    return;
  }

  // Получаем всех пользователей из базы данных
  let users = [];
  try {
    users = db.prepare('SELECT id, email, role, roles FROM users').all();
    console.log(`В базе данных найдено ${users.length} пользователей.`);
  } catch (usersError) {
    console.error('Ошибка при получении пользователей:', usersError);
    return;
  }

  // Счетчики для статистики
  let updatedCount = 0;
  let alreadyValidCount = 0;

  // Обновляем роли для каждого пользователя
  for (const user of users) {
    console.log(`\nОбработка пользователя ${user.email} (ID: ${user.id})`);
    
    // Проверяем, есть ли у пользователя уже заполненное поле roles
    if (user.roles && typeof user.roles === 'string') {
      try {
        // Парсим JSON строку, чтобы проверить её валидность
        const rolesArray = JSON.parse(user.roles);
        
        if (Array.isArray(rolesArray) && rolesArray.length > 0) {
          console.log(`  У пользователя уже установлены роли: ${rolesArray.join(', ')}`);
          alreadyValidCount++;
          continue;
        }
      } catch (e) {
        // Если ошибка при парсинге - поле не валидное, обновим его
        console.log(`  Невалидный формат поля roles: ${user.roles}. Будет обновлено.`);
      }
    }
    
    // Создаем массив ролей на основе текущей роли
    const normalizedRole = (user.role || 'user').toLowerCase();
    const rolesArray = [normalizedRole];
    const rolesJson = JSON.stringify(rolesArray);
    
    try {
      // Обновляем поле roles в базе данных
      db.prepare('UPDATE users SET roles = ? WHERE id = ?').run(rolesJson, user.id);
      console.log(`  Успешно установлены роли: ${rolesArray.join(', ')}`);
      updatedCount++;
    } catch (updateError) {
      console.error(`  Ошибка при обновлении ролей:`, updateError);
    }
  }

  // Выводим общую статистику
  console.log('\n===== РЕЗУЛЬТАТЫ МИГРАЦИИ =====');
  console.log(`Всего пользователей: ${users.length}`);
  console.log(`Обновлено: ${updatedCount}`);
  console.log(`Уже корректно: ${alreadyValidCount}`);

  // Закрываем соединение с базой данных
  db.close();
  console.log('\nМиграция ролей пользователей завершена.');
}

// Запуск миграции
migrateRoles(); 