// Скрипт для обновления структуры таблиц отзывов
const path = require('path');
const BetterSqlite3 = require('better-sqlite3');

// Путь к файлу базы данных
const dbPath = path.join(__dirname, '../../src/database/vdohnovenie.db');
console.log(`Используется база данных: ${dbPath}`);

try {
  // Подключаемся к базе данных
  const db = new BetterSqlite3(dbPath);
  
  // Проверяем текущую структуру таблицы reviews
  console.log('Проверяем структуру таблицы reviews...');
  const reviewsTableInfo = db.prepare(`PRAGMA table_info(reviews)`).all();
  console.log('Текущие колонки в таблице reviews:');
  reviewsTableInfo.forEach(column => {
    console.log(`- ${column.name} (${column.type})`);
  });
  
  // Проверяем наличие необходимых полей в таблице reviews
  const requiredColumns = {
    'serviceId': 'TEXT',
    'serviceName': 'TEXT',
    'appointmentId': 'TEXT'
  };
  
  // Добавляем недостающие колонки в таблицу reviews
  for (const [columnName, columnType] of Object.entries(requiredColumns)) {
    const columnExists = reviewsTableInfo.some(col => col.name === columnName);
    
    if (!columnExists) {
      console.log(`Добавляем колонку '${columnName}' в таблицу reviews...`);
      try {
        db.prepare(`ALTER TABLE reviews ADD COLUMN ${columnName} ${columnType}`).run();
        console.log(`Колонка '${columnName}' успешно добавлена`);
      } catch (alterError) {
        console.error(`Ошибка при добавлении колонки '${columnName}':`, alterError);
      }
    } else {
      console.log(`Колонка '${columnName}' уже существует в таблице reviews`);
    }
  }
  
  // Проверяем структуру таблицы review_attachments
  console.log('\nПроверяем структуру таблицы review_attachments...');
  const attachmentsTableInfo = db.prepare(`PRAGMA table_info(review_attachments)`).all();
  console.log('Текущие колонки в таблице review_attachments:');
  attachmentsTableInfo.forEach(column => {
    console.log(`- ${column.name} (${column.type})`);
  });
  
  // Проверяем наличие колонки 'url' в таблице review_attachments
  const hasUrlColumn = attachmentsTableInfo.some(col => col.name === 'url');
  const hasPathColumn = attachmentsTableInfo.some(col => col.name === 'path');
  
  // Если есть path, но нет url, добавляем url
  if (hasPathColumn && !hasUrlColumn) {
    console.log("Добавляем колонку 'url' в таблицу review_attachments...");
    try {
      db.prepare(`ALTER TABLE review_attachments ADD COLUMN url TEXT`).run();
      console.log("Колонка 'url' успешно добавлена");
      
      // Копируем данные из path в url
      console.log("Копируем данные из колонки 'path' в 'url'...");
      db.prepare(`UPDATE review_attachments SET url = path WHERE url IS NULL`).run();
      console.log("Данные успешно скопированы");
    } catch (alterError) {
      console.error("Ошибка при добавлении колонки 'url':", alterError);
    }
  }
  
  // Проверяем наличие других необходимых полей в таблице review_attachments
  const requiredAttachmentColumns = {
    'name': 'TEXT',
    'createdAt': 'TEXT'
  };
  
  // Добавляем недостающие колонки в таблицу review_attachments
  for (const [columnName, columnType] of Object.entries(requiredAttachmentColumns)) {
    const columnExists = attachmentsTableInfo.some(col => col.name === columnName);
    
    if (!columnExists) {
      console.log(`Добавляем колонку '${columnName}' в таблицу review_attachments...`);
      try {
        db.prepare(`ALTER TABLE review_attachments ADD COLUMN ${columnName} ${columnType}`).run();
        console.log(`Колонка '${columnName}' успешно добавлена`);
      } catch (alterError) {
        console.error(`Ошибка при добавлении колонки '${columnName}':`, alterError);
      }
    } else {
      console.log(`Колонка '${columnName}' уже существует в таблице review_attachments`);
    }
  }
  
  // Проверяем структуру таблицы review_replies
  console.log('\nПроверяем структуру таблицы review_replies...');
  const repliesTableInfo = db.prepare(`PRAGMA table_info(review_replies)`).all();
  console.log('Текущие колонки в таблице review_replies:');
  repliesTableInfo.forEach(column => {
    console.log(`- ${column.name} (${column.type})`);
  });
  
  // Проверяем наличие колонки 'parentReplyId' в таблице review_replies
  const hasParentReplyIdColumn = repliesTableInfo.some(col => col.name === 'parentReplyId');
  
  if (!hasParentReplyIdColumn) {
    console.log("Добавляем колонку 'parentReplyId' в таблицу review_replies...");
    try {
      db.prepare(`ALTER TABLE review_replies ADD COLUMN parentReplyId TEXT REFERENCES review_replies(id) ON DELETE CASCADE`).run();
      console.log("Колонка 'parentReplyId' успешно добавлена");
    } catch (alterError) {
      console.error("Ошибка при добавлении колонки 'parentReplyId':", alterError);
    }
  } else {
    console.log("Колонка 'parentReplyId' уже существует в таблице review_replies");
  }
  
  // Создаем отсутствующие индексы
  console.log('\nСоздаем недостающие индексы...');
  
  try {
    // Индексы для таблицы reviews
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_reviews_specialistId ON reviews(specialistId)`).run();
      console.log("Индекс idx_reviews_specialistId создан или уже существует");
    } catch (indexError) {
      console.error("Ошибка при создании индекса idx_reviews_specialistId:", indexError);
    }
    
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_reviews_userId ON reviews(userId)`).run();
      console.log("Индекс idx_reviews_userId создан или уже существует");
    } catch (indexError) {
      console.error("Ошибка при создании индекса idx_reviews_userId:", indexError);
    }
    
    // Проверяем, есть ли колонка serviceId
    if (reviewsTableInfo.some(col => col.name === 'serviceId')) {
      try {
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_reviews_serviceId ON reviews(serviceId)`).run();
        console.log("Индекс idx_reviews_serviceId создан или уже существует");
      } catch (indexError) {
        console.error("Ошибка при создании индекса idx_reviews_serviceId:", indexError);
      }
    }
    
    // Индексы для таблицы review_attachments
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_review_attachments_reviewId ON review_attachments(reviewId)`).run();
      console.log("Индекс idx_review_attachments_reviewId создан или уже существует");
    } catch (indexError) {
      console.error("Ошибка при создании индекса idx_review_attachments_reviewId:", indexError);
    }
    
    // Индексы для таблицы review_reactions
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_review_reactions_reviewId ON review_reactions(reviewId)`).run();
      console.log("Индекс idx_review_reactions_reviewId создан или уже существует");
    } catch (indexError) {
      console.error("Ошибка при создании индекса idx_review_reactions_reviewId:", indexError);
    }
    
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_review_reactions_userId ON review_reactions(userId)`).run();
      console.log("Индекс idx_review_reactions_userId создан или уже существует");
    } catch (indexError) {
      console.error("Ошибка при создании индекса idx_review_reactions_userId:", indexError);
    }
    
    // Индексы для таблицы review_replies
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_review_replies_reviewId ON review_replies(reviewId)`).run();
      console.log("Индекс idx_review_replies_reviewId создан или уже существует");
    } catch (indexError) {
      console.error("Ошибка при создании индекса idx_review_replies_reviewId:", indexError);
    }
    
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_review_replies_userId ON review_replies(userId)`).run();
      console.log("Индекс idx_review_replies_userId создан или уже существует");
    } catch (indexError) {
      console.error("Ошибка при создании индекса idx_review_replies_userId:", indexError);
    }
    
    if (hasParentReplyIdColumn) {
      try {
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_review_replies_parentReplyId ON review_replies(parentReplyId)`).run();
        console.log("Индекс idx_review_replies_parentReplyId создан или уже существует");
      } catch (indexError) {
        console.error("Ошибка при создании индекса idx_review_replies_parentReplyId:", indexError);
      }
    }
  } catch (error) {
    console.error('Общая ошибка при создании индексов:', error);
  }
  
  // Проверяем, работает ли таблица отзывов с новыми полями
  console.log('\nПроверяем работоспособность таблицы отзывов...');
  
  try {
    // Попытка добавить тестовый отзыв с использованием новых полей
    const testId = `test-update-${Date.now()}`;
    let testSpecialistId = '1'; // Замените на реальный ID, используем let вместо const
    
    // Проверяем, существует ли хотя бы один специалист
    const specialistExists = db.prepare(`SELECT COUNT(*) as count FROM specialists`).get();
    if (specialistExists.count > 0) {
      // Получаем первого специалиста
      const specialist = db.prepare(`SELECT id FROM specialists LIMIT 1`).get();
      if (specialist) {
        testSpecialistId = specialist.id;
      }
    }
    
    const insertStmt = db.prepare(`
      INSERT INTO reviews (
        id, specialistId, userId, serviceId, serviceName, 
        appointmentId, rating, text, isModerated, isPublished, 
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertStmt.run(
      testId,                   // id
      testSpecialistId,         // specialistId
      '2',                      // userId
      'test-service-id',        // serviceId
      'Тестовая услуга',        // serviceName
      null,                     // appointmentId
      5,                        // rating
      'Тестовый отзыв для проверки структуры таблицы',  // text
      1,                        // isModerated
      1,                        // isPublished
      new Date().toISOString(), // createdAt
      new Date().toISOString()  // updatedAt
    );
    
    if (result.changes > 0) {
      console.log('Тестовый отзыв успешно добавлен, структура таблицы работает корректно');
      
      // Удаляем тестовый отзыв
      db.prepare(`DELETE FROM reviews WHERE id = ?`).run(testId);
      console.log('Тестовый отзыв удален');
    } else {
      console.error('Не удалось добавить тестовый отзыв');
    }
  } catch (testError) {
    console.error('Ошибка при тестировании структуры таблицы:', testError);
  }
  
  // Закрываем соединение с базой данных
  db.close();
  console.log('\nСкрипт выполнен успешно. Структура таблиц отзывов обновлена.');
} catch (error) {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
} 