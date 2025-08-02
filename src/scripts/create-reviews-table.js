// Скрипт для создания и проверки таблицы отзывов (reviews)
const path = require('path');
const BetterSqlite3 = require('better-sqlite3');

// Путь к файлу базы данных
const dbPath = path.join(__dirname, '../../src/database/vdohnovenie.db');
console.log(`Используется база данных: ${dbPath}`);

try {
  // Подключаемся к базе данных
  const db = new BetterSqlite3(dbPath);
  
  // Проверяем существование таблицы reviews
  console.log('Проверяем существование таблицы reviews...');
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='reviews'
  `).get();
  
  if (tableExists) {
    console.log('Таблица reviews уже существует');
    
    // Выводим структуру таблицы
    const tableSchema = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='reviews'
    `).get();
    
    console.log('Структура таблицы reviews:');
    console.log(tableSchema.sql);
  } else {
    console.log('Таблица reviews не существует, создаем...');
    
    // Создаем таблицу reviews
    db.prepare(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        specialistId TEXT,
        userId TEXT,
        serviceId TEXT,
        serviceName TEXT,
        appointmentId TEXT,
        rating INTEGER NOT NULL,
        text TEXT NOT NULL,
        isModerated INTEGER DEFAULT 0,
        isPublished INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (specialistId) REFERENCES specialists(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE SET NULL,
        FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL
      )
    `).run();
    
    console.log('Таблица reviews успешно создана');
  }
  
  // Проверяем существование таблицы review_attachments
  console.log('Проверяем существование таблицы review_attachments...');
  const attachmentsTableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='review_attachments'
  `).get();
  
  if (attachmentsTableExists) {
    console.log('Таблица review_attachments уже существует');
    
    // Выводим структуру таблицы
    const tableSchema = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='review_attachments'
    `).get();
    
    console.log('Структура таблицы review_attachments:');
    console.log(tableSchema.sql);
  } else {
    console.log('Таблица review_attachments не существует, создаем...');
    
    // Создаем таблицу review_attachments
    db.prepare(`
      CREATE TABLE IF NOT EXISTS review_attachments (
        id TEXT PRIMARY KEY,
        reviewId TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        name TEXT,
        createdAt TEXT,
        FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE
      )
    `).run();
    
    console.log('Таблица review_attachments успешно создана');
  }
  
  // Проверяем существование таблицы review_reactions
  console.log('Проверяем существование таблицы review_reactions...');
  const reactionsTableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='review_reactions'
  `).get();
  
  if (reactionsTableExists) {
    console.log('Таблица review_reactions уже существует');
    
    // Выводим структуру таблицы
    const tableSchema = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='review_reactions'
    `).get();
    
    console.log('Структура таблицы review_reactions:');
    console.log(tableSchema.sql);
  } else {
    console.log('Таблица review_reactions не существует, создаем...');
    
    // Создаем таблицу review_reactions
    db.prepare(`
      CREATE TABLE IF NOT EXISTS review_reactions (
        id TEXT PRIMARY KEY,
        reviewId TEXT NOT NULL,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        createdAt TEXT,
        FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    
    console.log('Таблица review_reactions успешно создана');
  }
  
  // Проверяем существование таблицы review_replies
  console.log('Проверяем существование таблицы review_replies...');
  const repliesTableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='review_replies'
  `).get();
  
  if (repliesTableExists) {
    console.log('Таблица review_replies уже существует');
    
    // Выводим структуру таблицы
    const tableSchema = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='review_replies'
    `).get();
    
    console.log('Структура таблицы review_replies:');
    console.log(tableSchema.sql);
  } else {
    console.log('Таблица review_replies не существует, создаем...');
    
    // Создаем таблицу review_replies
    db.prepare(`
      CREATE TABLE IF NOT EXISTS review_replies (
        id TEXT PRIMARY KEY,
        reviewId TEXT NOT NULL,
        parentReplyId TEXT,
        userId TEXT NOT NULL,
        text TEXT NOT NULL,
        isModerated INTEGER DEFAULT 0,
        isPublished INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (parentReplyId) REFERENCES review_replies(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    
    console.log('Таблица review_replies успешно создана');
  }
  
  // Создаем индексы для ускорения поиска
  console.log('Создаем индексы для таблиц отзывов...');
  
  try {
    // Индексы для таблицы reviews
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_reviews_specialistId ON reviews(specialistId)
    `).run();
    
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_reviews_userId ON reviews(userId)
    `).run();
    
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_reviews_serviceId ON reviews(serviceId)
    `).run();
    
    // Индексы для таблицы review_attachments
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_review_attachments_reviewId ON review_attachments(reviewId)
    `).run();
    
    // Индексы для таблицы review_reactions
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_review_reactions_reviewId ON review_reactions(reviewId)
    `).run();
    
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_review_reactions_userId ON review_reactions(userId)
    `).run();
    
    // Индексы для таблицы review_replies
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_review_replies_reviewId ON review_replies(reviewId)
    `).run();
    
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_review_replies_userId ON review_replies(userId)
    `).run();
    
    console.log('Индексы для таблиц отзывов созданы или уже существуют');
  } catch (indexError) {
    console.error('Ошибка при создании индексов:', indexError);
  }
  
  // Получаем количество отзывов
  const reviewCount = db.prepare(`
    SELECT COUNT(*) as count FROM reviews
  `).get();
  
  console.log(`Всего отзывов в базе: ${reviewCount.count}`);
  
  // Добавляем тестовый отзыв, если необходимо
  const shouldAddTestReview = process.argv.includes('--add-test');
  if (shouldAddTestReview) {
    console.log('Добавляем тестовый отзыв...');
    
    // ID специалиста для тестирования (здесь нужно указать реальный ID)
    const testSpecialistId = '1'; // Замените на реальный ID специалиста из вашей базы данных
    
    // Создаем тестовый отзыв
    const testReview = {
      id: `test-${Date.now()}`,
      specialistId: testSpecialistId,
      userId: '2',
      serviceId: null,
      serviceName: 'Тестовая услуга',
      appointmentId: null,
      rating: 5,
      text: `Тестовый отзыв ${new Date().toLocaleString()}`,
      isModerated: 1,
      isPublished: 1,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };
    
    try {
      // Подготавливаем SQL запрос
      const columns = Object.keys(testReview).join(', ');
      const placeholders = Object.keys(testReview).map(() => '?').join(', ');
      const values = Object.values(testReview);
      
      // Выполняем запрос на вставку
      const insertStmt = db.prepare(`
        INSERT INTO reviews (${columns}) VALUES (${placeholders})
      `);
      
      const result = insertStmt.run(...values);
      
      if (result.changes > 0) {
        console.log('Тестовый отзыв успешно добавлен:');
        console.log(testReview);
        
        // Добавляем тестовое вложение
        const testAttachment = {
          id: `attachment-${Date.now()}`,
          reviewId: testReview.id,
          type: 'image',
          url: '/images/default-avatar.png',
          name: 'Тестовое изображение',
          createdAt: new Date().toISOString()
        };
        
        const attachmentColumns = Object.keys(testAttachment).join(', ');
        const attachmentPlaceholders = Object.keys(testAttachment).map(() => '?').join(', ');
        const attachmentValues = Object.values(testAttachment);
        
        const attachmentInsertStmt = db.prepare(`
          INSERT INTO review_attachments (${attachmentColumns}) VALUES (${attachmentPlaceholders})
        `);
        
        const attachmentResult = attachmentInsertStmt.run(...attachmentValues);
        
        if (attachmentResult.changes > 0) {
          console.log('Тестовое вложение успешно добавлено');
        }
      } else {
        console.error('Не удалось добавить тестовый отзыв');
      }
    } catch (insertError) {
      console.error('Ошибка при добавлении тестового отзыва:', insertError);
    }
  }
  
  if (reviewCount.count > 0) {
    // Выводим первый отзыв
    const firstReview = db.prepare(`
      SELECT * FROM reviews LIMIT 1
    `).get();
    
    console.log('Пример отзыва:');
    console.log(firstReview);
    
    // Проверяем, есть ли отзывы с NULL значениями в важных полях
    const invalidReviews = db.prepare(`
      SELECT COUNT(*) as count FROM reviews 
      WHERE rating IS NULL OR text IS NULL OR specialistId IS NULL
    `).get();
    
    if (invalidReviews.count > 0) {
      console.warn(`ВНИМАНИЕ: Обнаружено ${invalidReviews.count} отзывов с NULL значениями в важных полях`);
    } else {
      console.log('Все отзывы имеют корректные значения в обязательных полях');
    }
  }
  
  // Закрываем соединение с базой данных
  db.close();
  console.log('Скрипт выполнен успешно.');
} catch (error) {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
} 