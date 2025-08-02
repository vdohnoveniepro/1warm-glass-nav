// Скрипт для обновления ArticleID в комментариях
const path = require('path');
const BetterSqlite3 = require('better-sqlite3');

// Путь к файлу базы данных
const dbPath = path.join(__dirname, '../../src/database/vdohnovenie.db');
console.log(`Используется база данных: ${dbPath}`);

// ID статьи из запроса
const articleId = '0eae10bc-7c57-41d8-9997-122c2079356b';

try {
  // Подключаемся к базе данных
  const db = new BetterSqlite3(dbPath);
  
  // Проверяем существование таблицы comments
  console.log('Проверяем существование таблицы comments...');
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='comments'
  `).get();
  
  if (!tableExists) {
    console.error('Таблица comments не существует!');
    process.exit(1);
  }
  
  // Получаем все комментарии для указанной статьи
  console.log(`Получаем комментарии для статьи с ID: ${articleId}`);
  const comments = db.prepare(`
    SELECT * FROM comments 
    WHERE articleId = ?
  `).all(articleId);
  
  console.log(`Найдено ${comments.length} комментариев для этой статьи`);
  
  if (comments.length > 0) {
    // Выводим детали первого комментария
    console.log('Детали первого комментария:');
    console.log(comments[0]);
    
    // Проверяем, есть ли у комментариев parentId
    const hasParents = comments.some(c => c.parentId !== null && c.parentId !== 'null');
    console.log(`Комментарии с родительскими: ${hasParents ? 'Да' : 'Нет'}`);
  } else {
    console.log('Комментарии не найдены. Проверяем все комментарии в базе...');
    
    // Получаем все комментарии
    const allComments = db.prepare(`SELECT * FROM comments`).all();
    console.log(`Всего в базе ${allComments.length} комментариев`);
    
    if (allComments.length > 0) {
      console.log('Уникальные articleId в базе:');
      const uniqueArticleIds = [...new Set(allComments.map(c => c.articleId))];
      uniqueArticleIds.forEach(id => {
        console.log(`- ${id}`);
      });
      
      // Исправляем комментарии, если они есть, но с неправильным articleId
      console.log('\nПроверяем, есть ли комментарии с похожим articleId...');
      
      // Функция для проверки схожести строк (простая имплементация)
      const similarity = (a, b) => {
        let matches = 0;
        const minLength = Math.min(a.length, b.length);
        for (let i = 0; i < minLength; i++) {
          if (a[i] === b[i]) matches++;
        }
        return matches / minLength;
      };
      
      // Ищем похожие articleId
      const similarArticleIds = uniqueArticleIds.filter(id => 
        id !== articleId && similarity(id, articleId) > 0.7
      );
      
      if (similarArticleIds.length > 0) {
        console.log('Найдены похожие articleId:');
        similarArticleIds.forEach(id => {
          console.log(`- ${id}`);
        });
        
        // Обновляем articleId для похожих комментариев
        console.log('\nОбновляем articleId для похожих комментариев...');
        
        for (const similarId of similarArticleIds) {
          const commentsToUpdate = db.prepare(`
            SELECT * FROM comments 
            WHERE articleId = ?
          `).all(similarId);
          
          console.log(`Найдено ${commentsToUpdate.length} комментариев с articleId: ${similarId}`);
          
          if (commentsToUpdate.length > 0) {
            const updateStmt = db.prepare(`
              UPDATE comments 
              SET articleId = ? 
              WHERE articleId = ?
            `);
            
            const result = updateStmt.run(articleId, similarId);
            console.log(`Обновлено ${result.changes} комментариев`);
          }
        }
      } else {
        console.log('Похожих articleId не найдено');
      }
    } else {
      console.log('База данных комментариев пуста');
    }
  }
  
  // Закрываем соединение с базой данных
  db.close();
  console.log('\nСкрипт выполнен успешно.');
} catch (error) {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
} 