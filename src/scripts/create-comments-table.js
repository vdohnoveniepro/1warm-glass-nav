// Скрипт для создания и проверки таблицы комментариев
const path = require('path');
const BetterSqlite3 = require('better-sqlite3');

// Путь к файлу базы данных
const dbPath = path.join(__dirname, '../../src/database/vdohnovenie.db');
console.log(`Используется база данных: ${dbPath}`);

try {
  // Подключаемся к базе данных
  const db = new BetterSqlite3(dbPath);
  
  // Проверяем существование таблицы comments
  console.log('Проверяем существование таблицы comments...');
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='comments'
  `).get();
  
  if (tableExists) {
    console.log('Таблица comments уже существует');
    
    // Выводим структуру таблицы
    const tableSchema = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='comments'
    `).get();
    
    console.log('Структура таблицы comments:');
    console.log(tableSchema.sql);
  } else {
    console.log('Таблица comments не существует, создаем...');
    
    // Создаем таблицу comments
    db.prepare(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userName TEXT NOT NULL,
        userAvatar TEXT,
        content TEXT NOT NULL,
        articleId TEXT NOT NULL,
        parentId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        likedBy TEXT,
        dislikedBy TEXT,
        photo TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (parentId) REFERENCES comments(id) ON DELETE CASCADE
      )
    `).run();
    
    console.log('Таблица comments успешно создана');
  }
  
  // Создаем индексы для ускорения поиска
  console.log('Создаем индексы для таблицы comments...');
  
  try {
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_comments_articleId ON comments(articleId)
    `).run();
    
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_comments_userId ON comments(userId)
    `).run();
    
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_comments_parentId ON comments(parentId)
    `).run();
    
    console.log('Индексы для таблицы comments созданы или уже существуют');
  } catch (indexError) {
    console.error('Ошибка при создании индексов:', indexError);
  }
  
  // Получаем количество комментариев
  const commentCount = db.prepare(`
    SELECT COUNT(*) as count FROM comments
  `).get();
  
  console.log(`Всего комментариев в базе: ${commentCount.count}`);
  
  // Добавляем тестовый комментарий, если необходимо
  const shouldAddTestComment = process.argv.includes('--add-test');
  if (shouldAddTestComment) {
    console.log('Добавляем тестовый комментарий...');
    
    // ID статьи для тестирования
    const testArticleId = '0eae10bc-7c57-41d8-9997-122c2079356b';
    
    // Создаем тестовый комментарий
    const testComment = {
      id: `test-${Date.now()}`,
      userId: '2',
      userName: 'Тестовый пользователь',
      userAvatar: null,
      content: `Тестовый комментарий ${new Date().toLocaleString()}`,
      articleId: testArticleId,
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      likes: 0,
      dislikes: 0,
      likedBy: '[]',
      dislikedBy: '[]',
      photo: null
    };
    
    try {
      // Подготавливаем SQL запрос
      const columns = Object.keys(testComment).join(', ');
      const placeholders = Object.keys(testComment).map(() => '?').join(', ');
      const values = Object.values(testComment);
      
      // Выполняем запрос на вставку
      const insertStmt = db.prepare(`
        INSERT INTO comments (${columns}) VALUES (${placeholders})
      `);
      
      const result = insertStmt.run(...values);
      
      if (result.changes > 0) {
        console.log('Тестовый комментарий успешно добавлен:');
        console.log(testComment);
      } else {
        console.error('Не удалось добавить тестовый комментарий');
      }
    } catch (insertError) {
      console.error('Ошибка при добавлении тестового комментария:', insertError);
    }
  }
  
  if (commentCount.count > 0) {
    // Выводим первый комментарий
    const firstComment = db.prepare(`
      SELECT * FROM comments LIMIT 1
    `).get();
    
    console.log('Пример комментария:');
    console.log(firstComment);
    
    // Проверяем, есть ли комментарии с NULL значениями в важных полях
    const invalidComments = db.prepare(`
      SELECT COUNT(*) as count FROM comments 
      WHERE articleId IS NULL OR content IS NULL OR userName IS NULL
    `).get();
    
    if (invalidComments.count > 0) {
      console.warn(`ВНИМАНИЕ: Обнаружено ${invalidComments.count} комментариев с NULL значениями в важных полях`);
    } else {
      console.log('Все комментарии имеют корректные значения в обязательных полях');
    }
  }
  
  // Закрываем соединение с базой данных
  db.close();
  console.log('Скрипт выполнен успешно.');
} catch (error) {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
} 