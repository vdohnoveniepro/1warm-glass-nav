// Скрипт для обновления роли пользователя до ADMIN
// Использование: node src/scripts/set-admin-role.js bakeevd@yandex.ru

const path = require('path');
const BetterSqlite3 = require('better-sqlite3');

// Получаем email пользователя из параметров командной строки
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Необходимо указать email пользователя');
  console.error('Использование: node src/scripts/set-admin-role.js email@example.com');
  process.exit(1);
}

// Путь к файлу базы данных
const dbPath = path.join(__dirname, '../../src/database/vdohnovenie.db');
console.log(`Используется база данных: ${dbPath}`);

try {
  // Подключаемся к базе данных
  const db = new BetterSqlite3(dbPath, { verbose: console.log });
  
  console.log('Проверяем существование таблицы users...');
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  
  if (!tableExists) {
    console.error('Таблица users не найдена в базе данных!');
    process.exit(1);
  }
  
  console.log('Таблица users существует, ищем пользователя...');
  
  // Проверяем существование пользователя
  const user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(userEmail);
  
  if (!user) {
    console.error(`Пользователь с email ${userEmail} не найден в базе данных`);
    
    // Попробуем найти похожие email для подсказки
    const similarUsers = db.prepare('SELECT email FROM users WHERE email LIKE ?').all(`%${userEmail.split('@')[0]}%`);
    if (similarUsers.length > 0) {
      console.log('Возможно, вы имели в виду один из этих email:');
      similarUsers.forEach(u => console.log(`- ${u.email}`));
    }
    
    process.exit(1);
  }
  
  console.log('Найден пользователь:');
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`Текущая роль: ${user.role}`);
  console.log();
  
  // Если пользователь уже ADMIN, не обновляем
  if (user.role === 'ADMIN') {
    console.log(`Пользователь ${userEmail} уже имеет роль ADMIN`);
    process.exit(0);
  }
  
  // Обновляем роль пользователя на ADMIN
  console.log('Обновляем роль пользователя...');
  const updateResult = db.prepare('UPDATE users SET role = ? WHERE email = ?').run('ADMIN', userEmail);
  console.log(`Результат обновления: изменено строк: ${updateResult.changes}`);
  
  // Проверяем, что роль обновлена
  const updatedUser = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(userEmail);
  
  if (updatedUser.role === 'ADMIN') {
    console.log(`Роль пользователя ${userEmail} успешно обновлена до ADMIN`);
    console.log(`Проверка: новая роль пользователя - ${updatedUser.role}`);
  } else {
    console.error(`Не удалось обновить роль пользователя. Текущая роль: ${updatedUser.role}`);
  }
  
  // Закрываем соединение с базой данных
  db.close();
} catch (error) {
  console.error(`Произошла ошибка: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
} 