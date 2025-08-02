// Скрипт для диагностики проблемы с реакциями в комментариях
const path = require('path');
const BetterSqlite3 = require('better-sqlite3');
const fetch = require('node-fetch');

// Путь к файлу базы данных
const dbPath = path.join(__dirname, '../../src/database/vdohnovenie.db');
console.log(`Используется база данных: ${dbPath}`);

// Тестовые данные
const testCommentId = 'test-reaction-comment';
const testUserId = 'test-user-123';

async function debugReactions() {
  try {
    // Подключаемся к базе данных
    const db = new BetterSqlite3(dbPath);
    
    console.log('1. Проверяем существование таблицы comments...');
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='comments'
    `).get();
    
    if (!tableExists) {
      console.error('Таблица comments не существует!');
      process.exit(1);
    }
    
    console.log('Таблица comments существует');
    
    // Проверяем структуру таблицы comments
    console.log('\n2. Проверяем структуру таблицы comments...');
    const tableInfo = db.prepare(`PRAGMA table_info(comments)`).all();
    console.log('Колонки в таблице comments:');
    tableInfo.forEach(column => {
      console.log(`- ${column.name} (${column.type})`);
    });
    
    // Проверяем наличие необходимых полей
    const hasLikesField = tableInfo.some(col => col.name === 'likes');
    const hasDislikesField = tableInfo.some(col => col.name === 'dislikes');
    const hasLikedByField = tableInfo.some(col => col.name === 'likedBy');
    const hasDislikedByField = tableInfo.some(col => col.name === 'dislikedBy');
    
    if (!hasLikesField || !hasDislikesField || !hasLikedByField || !hasDislikedByField) {
      console.error('Ошибка: В таблице comments отсутствуют необходимые поля для реакций!');
      console.log(`- likes: ${hasLikesField ? 'есть' : 'отсутствует'}`);
      console.log(`- dislikes: ${hasDislikesField ? 'есть' : 'отсутствует'}`);
      console.log(`- likedBy: ${hasLikedByField ? 'есть' : 'отсутствует'}`);
      console.log(`- dislikedBy: ${hasDislikedByField ? 'есть' : 'отсутствует'}`);
      
      // Добавляем отсутствующие поля
      if (!hasLikesField) {
        console.log('Добавляем поле likes...');
        db.prepare(`ALTER TABLE comments ADD COLUMN likes INTEGER DEFAULT 0`).run();
      }
      
      if (!hasDislikesField) {
        console.log('Добавляем поле dislikes...');
        db.prepare(`ALTER TABLE comments ADD COLUMN dislikes INTEGER DEFAULT 0`).run();
      }
      
      if (!hasLikedByField) {
        console.log('Добавляем поле likedBy...');
        db.prepare(`ALTER TABLE comments ADD COLUMN likedBy TEXT DEFAULT '[]'`).run();
      }
      
      if (!hasDislikedByField) {
        console.log('Добавляем поле dislikedBy...');
        db.prepare(`ALTER TABLE comments ADD COLUMN dislikedBy TEXT DEFAULT '[]'`).run();
      }
      
      console.log('Структура таблицы comments обновлена');
    } else {
      console.log('Все необходимые поля для реакций присутствуют в таблице comments');
    }
    
    // Проверяем количество комментариев
    console.log('\n3. Проверяем количество комментариев в базе данных...');
    const commentCount = db.prepare(`SELECT COUNT(*) as count FROM comments`).get();
    console.log(`Всего комментариев в базе: ${commentCount.count}`);
    
    if (commentCount.count > 0) {
      // Проверяем формат полей likedBy и dislikedBy в первом комментарии
      console.log('\n4. Проверяем формат полей likedBy и dislikedBy в первом комментарии...');
      const firstComment = db.prepare(`SELECT id, likedBy, dislikedBy FROM comments LIMIT 1`).get();
      console.log(`ID комментария: ${firstComment.id}`);
      console.log(`likedBy: ${firstComment.likedBy}`);
      console.log(`dislikedBy: ${firstComment.dislikedBy}`);
      
      try {
        const likedBy = JSON.parse(firstComment.likedBy || '[]');
        const dislikedBy = JSON.parse(firstComment.dislikedBy || '[]');
        console.log('JSON.parse() успешно обработал поля likedBy и dislikedBy');
        console.log(`likedBy после JSON.parse(): ${JSON.stringify(likedBy)}`);
        console.log(`dislikedBy после JSON.parse(): ${JSON.stringify(dislikedBy)}`);
      } catch (jsonError) {
        console.error('Ошибка при парсинге JSON в полях likedBy/dislikedBy:', jsonError);
        console.log('Исправляем формат JSON...');
        
        // Исправляем формат JSON в полях likedBy и dislikedBy
        db.prepare(`UPDATE comments SET likedBy = '[]' WHERE likedBy IS NULL OR likedBy = ''`).run();
        db.prepare(`UPDATE comments SET dislikedBy = '[]' WHERE dislikedBy IS NULL OR dislikedBy = ''`).run();
        
        // Проверяем все комментарии с некорректным JSON в полях likedBy и dislikedBy
        const commentsWithInvalidJson = db.prepare(`
          SELECT id, likedBy, dislikedBy FROM comments 
          WHERE 
            (likedBy IS NOT NULL AND likedBy != '[]' AND likedBy != '[') AND
            (dislikedBy IS NOT NULL AND dislikedBy != '[]' AND dislikedBy != '[')
        `).all();
        
        console.log(`Найдено ${commentsWithInvalidJson.length} комментариев для проверки JSON формата`);
        
        for (const comment of commentsWithInvalidJson) {
          try {
            JSON.parse(comment.likedBy);
            JSON.parse(comment.dislikedBy);
          } catch (e) {
            console.log(`Исправляем комментарий ${comment.id} с некорректным JSON`);
            db.prepare(`UPDATE comments SET likedBy = '[]', dislikedBy = '[]' WHERE id = ?`).run(comment.id);
          }
        }
      }
    }
    
    // Создаем тестовый комментарий для проверки
    console.log('\n5. Создаем тестовый комментарий для проверки реакций...');
    
    // Сначала получим существующий articleId из базы данных
    console.log('Получаем существующий articleId из базы данных...');
    const existingArticle = db.prepare(`SELECT articleId FROM comments LIMIT 1`).get();
    
    if (!existingArticle || !existingArticle.articleId) {
      console.error('Не удалось найти существующую статью в базе данных');
      console.log('Пропускаем создание тестового комментария');
    } else {
      const articleId = existingArticle.articleId;
      console.log(`Найден articleId: ${articleId}`);
    
      // Проверяем, существует ли уже тестовый комментарий
      const existingTestComment = db.prepare(`SELECT id FROM comments WHERE id = ?`).get(testCommentId);
      
      if (existingTestComment) {
        console.log(`Тестовый комментарий с ID ${testCommentId} уже существует`);
        
        // Сбрасываем реакции для чистоты теста
        db.prepare(`
          UPDATE comments 
          SET likes = 0, dislikes = 0, likedBy = '[]', dislikedBy = '[]' 
          WHERE id = ?
        `).run(testCommentId);
        
        console.log('Реакции для тестового комментария сброшены');
      } else {
        // Создаем новый тестовый комментарий
        const testComment = {
          id: testCommentId,
          userId: testUserId,
          userName: 'Test User',
          userAvatar: null,
          content: 'Тестовый комментарий для проверки реакций',
          articleId: articleId, // Используем существующий articleId
          parentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: null,
          likes: 0,
          dislikes: 0,
          likedBy: '[]',
          dislikedBy: '[]',
          photo: null
        };
        
        // Подготавливаем SQL запрос
        const columns = Object.keys(testComment).join(', ');
        const placeholders = Object.keys(testComment).map(() => '?').join(', ');
        const values = Object.values(testComment);
        
        // Выполняем запрос на вставку
        const insertStmt = db.prepare(`
          INSERT INTO comments (${columns}) VALUES (${placeholders})
        `);
        
        try {
          const result = insertStmt.run(...values);
          if (result.changes > 0) {
            console.log('Тестовый комментарий успешно создан');
          } else {
            console.error('Не удалось создать тестовый комментарий');
          }
        } catch (insertError) {
          console.error('Ошибка при создании тестового комментария:', insertError);
          console.log('Пропускаем создание тестового комментария');
        }
      }
    }
    
    // Тест прямого обновления реакции через SQL
    console.log('\n6. Тестируем прямое обновление реакции через SQL...');
    try {
      // Добавляем лайк от тестового пользователя
      const testLikedBy = JSON.stringify([testUserId]);
      const updateStmt = db.prepare(`
        UPDATE comments 
        SET likes = 1, likedBy = ? 
        WHERE id = ?
      `);
      
      const updateResult = updateStmt.run(testLikedBy, testCommentId);
      
      if (updateResult.changes > 0) {
        console.log('Лайк успешно добавлен через прямой SQL запрос');
      } else {
        console.error('Не удалось добавить лайк через прямой SQL запрос');
      }
      
      // Проверяем обновленный комментарий
      const updatedComment = db.prepare(`SELECT id, likes, likedBy FROM comments WHERE id = ?`).get(testCommentId);
      console.log('Обновленный комментарий:');
      console.log(updatedComment);
      
      try {
        const likedBy = JSON.parse(updatedComment.likedBy);
        console.log(`likedBy после JSON.parse(): ${JSON.stringify(likedBy)}`);
        console.log(`Тестовый пользователь в списке лайков: ${likedBy.includes(testUserId)}`);
      } catch (jsonError) {
        console.error('Ошибка при парсинге JSON в обновленном комментарии:', jsonError);
      }
    } catch (sqlError) {
      console.error('Ошибка при выполнении SQL запроса для обновления реакции:', sqlError);
    }
    
    // Проверяем API маршрут для реакций
    console.log('\n7. Проверяем структуру файлов API маршрута для реакций...');
    
    // Путь к файлу маршрута API
    const apiRoutePath = path.join(__dirname, '../../src/app/api/comments/[id]/reaction/route.ts');
    const fs = require('fs');
    
    if (fs.existsSync(apiRoutePath)) {
      console.log(`API маршрут существует: ${apiRoutePath}`);
    } else {
      console.error(`API маршрут не найден: ${apiRoutePath}`);
      console.log('Проверяем наличие директории...');
      
      const apiDirPath = path.join(__dirname, '../../src/app/api/comments/[id]');
      if (!fs.existsSync(apiDirPath)) {
        console.log(`Создаем директорию: ${apiDirPath}`);
        fs.mkdirSync(apiDirPath, { recursive: true });
      }
      
      const reactionDirPath = path.join(apiDirPath, 'reaction');
      if (!fs.existsSync(reactionDirPath)) {
        console.log(`Создаем директорию: ${reactionDirPath}`);
        fs.mkdirSync(reactionDirPath, { recursive: true });
      }
      
      console.log('Директории созданы');
    }
    
    // Закрываем соединение с базой данных
    db.close();
    console.log('\nДиагностика завершена. База данных закрыта.');
    
  } catch (error) {
    console.error('Ошибка при выполнении скрипта диагностики:', error);
    process.exit(1);
  }
}

// Запускаем диагностику
debugReactions(); 