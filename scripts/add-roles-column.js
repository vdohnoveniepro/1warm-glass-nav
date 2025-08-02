const path = require('path');
const Database = require('better-sqlite3');

// Путь к базе данных
const DB_PATH = path.join(process.cwd(), 'src', 'database', 'vdohnovenie.db');
console.log(`Путь к базе данных: ${DB_PATH}`);

try {
  // Подключаемся к базе данных
  const db = new Database(DB_PATH);
  
  console.log('\nДобавляем колонку roles в таблицу users...');
  
  // Проверяем, существует ли колонка roles
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  const columns = tableInfo.map(col => `${col.name} (${col.type})`);
  
  console.log('Структура таблицы users:', columns);
  
  // Получаем всех пользователей для дебага
  const users = db.prepare('SELECT id, email, role FROM users').all();
  console.log(`\nНайдено ${users.length} пользователей в базе данных.`);
  console.log('Пользователи:', users.map(u => `${u.email} (${u.role})`));
  
  // Проверяем, есть ли колонка roles
  const hasRolesColumn = tableInfo.some(col => col.name === 'roles');
  
  if (!hasRolesColumn) {
    console.log('\nКолонка roles отсутствует. Добавляем...');
    // Добавляем колонку roles
    db.prepare('ALTER TABLE users ADD COLUMN roles TEXT').run();
    console.log('Колонка roles успешно добавлена!');
  } else {
    console.log('\nКолонка roles уже существует в таблице users.');
  }
  
  // Обновляем значения в колонке roles на основании колонки role
  console.log('\nОбновляем значения roles для всех пользователей...\n');
  
  users.forEach(user => {
    // Для каждого пользователя устанавливаем значение roles
    // на основе основной роли (приводим к нижнему регистру)
    const role = user.role.toLowerCase();
    const rolesJson = JSON.stringify([role]);
    
    console.log(`Обновляем пользователя ${user.email}: роль ${role} -> roles ${rolesJson}`);
    
    const updateSql = `UPDATE users SET roles = ? WHERE id = ?`;
    console.log(`  Запрос: UPDATE users SET roles = '${rolesJson}' WHERE id = '${user.id}'`);
    
    const result = db.prepare(updateSql).run(rolesJson, user.id);
    console.log(`  Результат:`, result);
    
    if (result.changes > 0) {
      console.log(`  Успешно обновлен!`);
    }
  });
  
  // Закрываем соединение с базой данных
  db.close();
  
} catch (error) {
  console.error(`Ошибка при выполнении миграции: ${error}`);
} finally {
  console.log('Миграция завершена.');
} 