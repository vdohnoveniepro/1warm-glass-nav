const Database = require('better-sqlite3');
const path = require('path');

// Путь к базе данных SQLite
const dbPath = path.join(process.cwd(), 'src', 'database', 'vdohnovenie.db');
console.log('Путь к базе данных:', dbPath);

// Открываем соединение с базой данных
try {
  const db = new Database(dbPath);
  
  // Проверяем существование таблицы users
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Таблицы в базе данных:', tables.map(t => t.name));
  
  // Получаем структуру таблицы users
  const columns = db.prepare('PRAGMA table_info(users)').all();
  console.log('\nКолонки таблицы users:');
  columns.forEach(c => {
    console.log(`- ${c.name} (${c.type})`);
  });
  
  // Проверяем наличие колонки favorites
  const hasFavoritesColumn = columns.some(c => c.name === 'favorites');
  console.log(`\nКолонка favorites ${hasFavoritesColumn ? 'существует' : 'не существует'}`);
  
  // Получаем первого пользователя для примера
  const users = db.prepare('SELECT * FROM users LIMIT 1').all();
  if (users.length > 0) {
    console.log('\nПример пользователя:');
    const user = users[0];
    
    // Выводим основные поля пользователя
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Имя:', user.firstName, user.lastName);
    console.log('Роль:', user.role);
    
    // Проверяем наличие и формат избранного
    if (user.favorites) {
      console.log('Избранное (тип):', typeof user.favorites);
      try {
        if (typeof user.favorites === 'string') {
          const favorites = JSON.parse(user.favorites);
          console.log('Избранное (разобрано):', {
            articles: favorites.articles?.length || 0,
            services: favorites.services?.length || 0,
            specialists: favorites.specialists?.length || 0
          });
        } else {
          console.log('Избранное (объект):', {
            articles: user.favorites.articles?.length || 0,
            services: user.favorites.services?.length || 0,
            specialists: user.favorites.specialists?.length || 0
          });
        }
      } catch (e) {
        console.error('Ошибка при разборе избранного:', e.message);
      }
    } else {
      console.log('Избранное: отсутствует');
    }
  } else {
    console.log('\nПользователи не найдены');
  }
  
  // Закрываем соединение с базой данных
  db.close();
} catch (error) {
  console.error('Ошибка при работе с базой данных:', error.message);
} 