import { db, isDbInitialized, setDbInitialized } from './db';

// Переменная для отслеживания логирования (только первый раз за запуск процесса)
let hasLoggedDbInitialization = false;

// Создание таблиц в базе данных
export const initializeDatabase = () => {
  // Проверяем, была ли уже инициализирована база данных
  if (isDbInitialized()) {
    return;
  }
  
  // Логируем только при первом вызове в рамках процесса
  if (!hasLoggedDbInitialization) {
    console.log('Начало инициализации базы данных SQLite...');
    hasLoggedDbInitialization = true;
  }
  
  try {
    // Создаем таблицы по одной, с обработкой ошибок для каждой
    createUsersTable();
    createBonusTablesTable();
    createSpecialistsTable();
    createServicesTable();
    createAppointmentsTable();
    createArticlesTable();
    createReviewsTable();
    createCommentsTable();
    createSettingsTable();
    createFaqTable();
    createEventsTable();
    createNotificationsTable();
    createSiteVisitsTable();
    
    // Отмечаем базу данных как инициализированную
    setDbInitialized(true);
    
    // Логируем только при первом вызове в рамках процесса
    if (hasLoggedDbInitialization) {
      console.log('База данных успешно инициализирована.');
    }
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
    throw error;
  }
};

// Функция для логирования создания таблиц
// Такой подход позволяет не загромождать логи при каждом запуске
let loggedTables = new Set<string>();

function logTableCreation(tableName: string) {
  // Логируем создание таблицы только один раз за запуск процесса
  if (!loggedTables.has(tableName)) {
    console.log(`Таблица ${tableName} создана или уже существует`);
    loggedTables.add(tableName);
  }
}

// Функции для создания отдельных таблиц
function createUsersTable() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        firstName TEXT,
        lastName TEXT,
        phone TEXT,
        avatar TEXT,
        photo TEXT,
        photo_url TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        roles TEXT,
        favorites TEXT,
        bonusBalance REAL DEFAULT 0,
        referralCode TEXT UNIQUE,
        referredById TEXT,
        telegramId TEXT UNIQUE,
        telegramUsername TEXT,
        lastLogin TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (referredById) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    logTableCreation('users');
  } catch (error) {
    console.error('Ошибка при создании таблицы users:', error);
  }
}

function createBonusTablesTable() {
  try {
    // Транзакции бонусов
    db.exec(`
      CREATE TABLE IF NOT EXISTS bonus_transactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        description TEXT,
        appointmentId TEXT,
        referredUserId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('bonus_transactions');

    // Настройки бонусной программы
    db.exec(`
      CREATE TABLE IF NOT EXISTS bonus_settings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        bookingBonusAmount REAL DEFAULT 300,
        referrerBonusAmount REAL DEFAULT 2000,
        referralBonusAmount REAL DEFAULT 2000,
        updatedAt TEXT NOT NULL
      )
    `);
    logTableCreation('bonus_settings');
  } catch (error) {
    console.error('Ошибка при создании таблиц бонусов:', error);
  }
}

function createSpecialistsTable() {
  try {
    // Специалисты
    db.exec(`
      CREATE TABLE IF NOT EXISTS specialists (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        photo TEXT,
        description TEXT,
        position TEXT,
        experience INTEGER DEFAULT 0,
        "order" INTEGER DEFAULT 0,
        userId TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    logTableCreation('specialists');

    // Дополнительные таблицы для специалистов
    db.exec(`
      CREATE TABLE IF NOT EXISTS specialist_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        specialistId TEXT NOT NULL,
        position TEXT NOT NULL,
        FOREIGN KEY (specialistId) REFERENCES specialists(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('specialist_positions');

    db.exec(`
      CREATE TABLE IF NOT EXISTS specialist_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        specialistId TEXT NOT NULL,
        path TEXT NOT NULL,
        name TEXT,
        type TEXT,
        FOREIGN KEY (specialistId) REFERENCES specialists(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('specialist_documents');

    db.exec(`
      CREATE TABLE IF NOT EXISTS specialist_work_schedules (
        id TEXT PRIMARY KEY,
        specialistId TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (specialistId) REFERENCES specialists(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('specialist_work_schedules');

    db.exec(`
      CREATE TABLE IF NOT EXISTS work_days (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL,
        day INTEGER NOT NULL, 
        active INTEGER DEFAULT 1,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        FOREIGN KEY (scheduleId) REFERENCES specialist_work_schedules(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('work_days');

    db.exec(`
      CREATE TABLE IF NOT EXISTS lunch_breaks (
        id TEXT PRIMARY KEY,
        workDayId TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        FOREIGN KEY (workDayId) REFERENCES work_days(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('lunch_breaks');

    db.exec(`
      CREATE TABLE IF NOT EXISTS vacations (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        FOREIGN KEY (scheduleId) REFERENCES specialist_work_schedules(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('vacations');
  } catch (error) {
    console.error('Ошибка при создании таблиц специалистов:', error);
  }
}

function createServicesTable() {
  try {
    // Услуги
    db.exec(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        shortDescription TEXT,
        image TEXT,
        price REAL DEFAULT 0,
        duration INTEGER DEFAULT 60,
        color TEXT,
        "order" INTEGER DEFAULT 0,
        isArchived INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);
    logTableCreation('services');

    // Связь специалистов и услуг
    db.exec(`
      CREATE TABLE IF NOT EXISTS specialist_services (
        specialistId TEXT NOT NULL,
        serviceId TEXT NOT NULL,
        PRIMARY KEY (specialistId, serviceId),
        FOREIGN KEY (specialistId) REFERENCES specialists(id) ON DELETE CASCADE,
        FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('specialist_services');
  } catch (error) {
    console.error('Ошибка при создании таблиц услуг:', error);
  }
}

function createAppointmentsTable() {
  try {
    // Записи на прием
    db.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        userId TEXT,
        specialistId TEXT,
        serviceId TEXT,
        userName TEXT,
        userPhone TEXT,
        date TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        comment TEXT,
        price REAL DEFAULT 0,
        originalPrice REAL DEFAULT 0,
        promoCode TEXT,
        discountAmount REAL,
        bonusAmount REAL,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (specialistId) REFERENCES specialists(id) ON DELETE CASCADE,
        FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('appointments');
  } catch (error) {
    console.error('Ошибка при создании таблицы appointments:', error);
  }
}

function createArticlesTable() {
  try {
    // Статьи
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE,
        banner TEXT,
        content TEXT,
        excerpt TEXT,
        category TEXT,
        specialistId TEXT,
        status TEXT DEFAULT 'draft',
        views INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        publishedAt TEXT,
        FOREIGN KEY (specialistId) REFERENCES specialists(id) ON DELETE SET NULL
      )
    `);
    logTableCreation('articles');

    // Теги статей
    db.exec(`
      CREATE TABLE IF NOT EXISTS article_tags (
        articleId TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (articleId, tag),
        FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('article_tags');
  } catch (error) {
    console.error('Ошибка при создании таблиц статей:', error);
  }
}

function createReviewsTable() {
  try {
    // Отзывы
    db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        specialistId TEXT,
        userId TEXT,
        serviceId TEXT,
        serviceName TEXT,
        appointmentId TEXT,
        rating INTEGER NOT NULL,
        text TEXT,
        isModerated INTEGER DEFAULT 0,
        isPublished INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (specialistId) REFERENCES specialists(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE SET NULL,
        FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL
      )
    `);
    logTableCreation('reviews');

    // Вложения к отзывам
    db.exec(`
      CREATE TABLE IF NOT EXISTS review_attachments (
        id TEXT PRIMARY KEY,
        reviewId TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        name TEXT,
        createdAt TEXT,
        FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('review_attachments');

    // Реакции на отзывы
    db.exec(`
      CREATE TABLE IF NOT EXISTS review_reactions (
        id TEXT PRIMARY KEY,
        reviewId TEXT NOT NULL,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        createdAt TEXT,
        FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('review_reactions');

    // Ответы на отзывы
    db.exec(`
      CREATE TABLE IF NOT EXISTS review_replies (
        id TEXT PRIMARY KEY,
        reviewId TEXT NOT NULL,
        userId TEXT NOT NULL,
        text TEXT NOT NULL,
        isModerated INTEGER DEFAULT 0,
        isPublished INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('review_replies');

    // Вложения к ответам на отзывы
    db.exec(`
      CREATE TABLE IF NOT EXISTS reply_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        replyId TEXT NOT NULL,
        path TEXT NOT NULL,
        type TEXT,
        FOREIGN KEY (replyId) REFERENCES review_replies(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('reply_attachments');

    // Реакции на ответы
    db.exec(`
      CREATE TABLE IF NOT EXISTS reply_reactions (
        id TEXT PRIMARY KEY,
        replyId TEXT NOT NULL,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        createdAt TEXT,
        FOREIGN KEY (replyId) REFERENCES review_replies(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('reply_reactions');
  } catch (error) {
    console.error('Ошибка при создании таблиц отзывов:', error);
  }
}

function createCommentsTable() {
  try {
    // Комментарии к статьям
    db.exec(`
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
    `);
    logTableCreation('comments');
  } catch (error) {
    console.error('Ошибка при создании таблицы комментариев:', error);
  }
}

function createSettingsTable() {
  try {
    // Настройки
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        value TEXT,
        updatedAt TEXT
      )
    `);
    logTableCreation('settings');

    // Настройки консультаций
    db.exec(`
      CREATE TABLE IF NOT EXISTS consultation_settings (
        id TEXT PRIMARY KEY, 
        name TEXT NOT NULL,
        value TEXT,
        updatedAt TEXT
      )
    `);
    logTableCreation('consultation_settings');
  } catch (error) {
    console.error('Ошибка при создании таблиц настроек:', error);
  }
}

function createFaqTable() {
  try {
    // FAQ (часто задаваемые вопросы)
    db.exec(`
      CREATE TABLE IF NOT EXISTS faq (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT,
        "order" INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);
    logTableCreation('faq');
  } catch (error) {
    console.error('Ошибка при создании таблицы FAQ:', error);
  }
}

function createEventsTable() {
  try {
    // События
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        image TEXT,
        startDate TEXT,
        endDate TEXT,
        location TEXT,
        price REAL DEFAULT 0,
        capacity INTEGER DEFAULT 0,
        isOnline INTEGER DEFAULT 0,
        isArchived INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);
    logTableCreation('events');
  } catch (error) {
    console.error('Ошибка при создании таблицы событий:', error);
  }
}

function createNotificationsTable() {
  try {
    // Уведомления
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT,
        type TEXT NOT NULL,
        title TEXT,
        message TEXT,
        isRead INTEGER DEFAULT 0,
        data TEXT,
        createdAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    logTableCreation('notifications');

    // Заметки специалистов
    db.exec(`
      CREATE TABLE IF NOT EXISTS specialist_notes (
        id TEXT PRIMARY KEY,
        specialistId TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        clientName TEXT,
        clientId TEXT,
        serviceId TEXT,
        serviceName TEXT,
        appointmentId TEXT,
        tags TEXT,
        images TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (specialistId) REFERENCES specialists(id) ON DELETE CASCADE,
        FOREIGN KEY (clientId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE SET NULL,
        FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL
      )
    `);
    logTableCreation('specialist_notes');

    // Промокоды
    db.exec(`
      CREATE TABLE IF NOT EXISTS promos (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
        discount_value REAL NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        max_uses INTEGER,
        current_uses INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    logTableCreation('promos');

    // Связь промокодов и услуг
    db.exec(`
      CREATE TABLE IF NOT EXISTS promo_services (
        promo_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        PRIMARY KEY (promo_id, service_id),
        FOREIGN KEY (promo_id) REFERENCES promos (id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
      )
    `);
    logTableCreation('promo_services');

    // Создание индексов для промокодов
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_promos_code ON promos (code);
      CREATE INDEX IF NOT EXISTS idx_promos_is_active ON promos (is_active);
      CREATE INDEX IF NOT EXISTS idx_promo_services_promo_id ON promo_services (promo_id);
      CREATE INDEX IF NOT EXISTS idx_promo_services_service_id ON promo_services (service_id);
    `);
    console.log('Индексы для промокодов созданы или уже существуют');
  } catch (error) {
    console.error('Ошибка при создании таблиц уведомлений и промокодов:', error);
  }
}

// Функция для создания таблицы посещений сайта
function createSiteVisitsTable() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS site_visits (
        id TEXT PRIMARY KEY,
        page TEXT NOT NULL,
        userId TEXT,
        sessionId TEXT NOT NULL,
        userAgent TEXT,
        ipAddress TEXT,
        referrer TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS visit_statistics (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        page TEXT NOT NULL,
        visits INTEGER DEFAULT 0,
        unique_visitors INTEGER DEFAULT 0,
        registered_users INTEGER DEFAULT 0,
        bounce_rate REAL DEFAULT 0,
        avg_time_on_page REAL DEFAULT 0,
        UNIQUE(date, page)
      )
    `);
    
    console.log('Таблицы статистики посещений созданы или уже существуют');
  } catch (error) {
    console.error('Ошибка при создании таблиц статистики посещений:', error);
  }
} 