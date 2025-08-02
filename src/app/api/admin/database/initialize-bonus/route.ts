import { NextResponse } from 'next/server';
import { db } from '@/database/db';
import { generateRandomString } from '@/utils/random';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Функция для инициализации бонусной системы
async function initializeBonusSystem() {
  try {
    logger.info('Начало инициализации системы бонусов...');
    
    // 1. Проверяем наличие необходимых колонок в таблице users
    const userColumns = db.prepare("PRAGMA table_info(users)").all();
    const columnNames = userColumns.map((col: any) => col.name);
    
    const hasBonusBalance = columnNames.includes('bonusBalance');
    const hasReferralCode = columnNames.includes('referralCode');
    const hasReferredById = columnNames.includes('referredById');
    
    // Добавляем колонки, если их нет
    if (!hasBonusBalance) {
      logger.info('Добавляем колонку bonusBalance в таблицу users');
      db.prepare("ALTER TABLE users ADD COLUMN bonusBalance REAL DEFAULT 0").run();
    }
    
    // Для referralCode и referredById нужно быть осторожным с UNIQUE ограничениями
    try {
      if (!hasReferralCode) {
        logger.info('Добавляем колонку referralCode в таблицу users');
        db.prepare("ALTER TABLE users ADD COLUMN referralCode TEXT").run();
      }
      
      if (!hasReferredById) {
        logger.info('Добавляем колонку referredById в таблицу users');
        db.prepare("ALTER TABLE users ADD COLUMN referredById TEXT REFERENCES users(id) ON DELETE SET NULL").run();
      }
    } catch (err) {
      logger.error('Ошибка при добавлении колонок: ' + String(err));
      // Продолжаем выполнение, даже если колонки уже существуют
    }
    
    // 2. Создаем индексы для оптимизации запросов
    try {
      db.prepare("CREATE INDEX IF NOT EXISTS idx_users_referralCode ON users(referralCode)").run();
      db.prepare("CREATE INDEX IF NOT EXISTS idx_users_referredById ON users(referredById)").run();
    } catch (err) {
      logger.error('Ошибка при создании индексов: ' + String(err));
    }
    
    // 3. Генерируем реферальные коды для пользователей, у которых их нет
    const usersWithoutReferralCode = db.prepare("SELECT id FROM users WHERE referralCode IS NULL").all();
    
    if (usersWithoutReferralCode.length > 0) {
      logger.info(`Генерация реферальных кодов для ${usersWithoutReferralCode.length} пользователей...`);
      
      // Получаем существующие коды для проверки уникальности
      const existingCodes = new Set(
        db.prepare("SELECT referralCode FROM users WHERE referralCode IS NOT NULL")
          .all()
          .map((row: any) => row.referralCode)
      );
      
      // Подготавливаем запрос для обновления
      const updateStmt = db.prepare("UPDATE users SET referralCode = ? WHERE id = ?");
      
      // Начинаем транзакцию для массового обновления
      const transaction = db.transaction((users: any[]) => {
        for (const user of users) {
          // Генерируем уникальный код (6 символов)
          let code;
          do {
            code = generateRandomString(6).toUpperCase();
          } while (existingCodes.has(code));
          
          existingCodes.add(code);
          updateStmt.run(code, user.id);
        }
      });
      
      // Выполняем транзакцию
      transaction(usersWithoutReferralCode);
      logger.info('Реферальные коды успешно сгенерированы');
    } else {
      logger.info('Все пользователи уже имеют реферальные коды');
    }
    
    // 4. Проверяем наличие таблицы настроек бонусной системы
    try {
      const bonusSettingsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bonus_settings'").get();
      
      if (!bonusSettingsExists) {
        logger.info('Создаем таблицу bonus_settings');
        db.prepare(`
          CREATE TABLE IF NOT EXISTS bonus_settings (
            id TEXT PRIMARY KEY DEFAULT 'default',
            bookingBonusAmount REAL DEFAULT 300,
            referrerBonusAmount REAL DEFAULT 2000,
            referralBonusAmount REAL DEFAULT 2000,
            updatedAt TEXT NOT NULL
          )
        `).run();
      }
      
      // Проверяем наличие записи с настройками по умолчанию
      const defaultSettings = db.prepare("SELECT * FROM bonus_settings WHERE id = 'default'").get();
      
      if (!defaultSettings) {
        logger.info('Создаем настройки бонусной системы по умолчанию');
        db.prepare(`
          INSERT INTO bonus_settings (id, bookingBonusAmount, referrerBonusAmount, referralBonusAmount, updatedAt)
          VALUES ('default', 300, 2000, 2000, ?)
        `).run(new Date().toISOString());
      }
    } catch (err) {
      logger.error('Ошибка при настройке таблицы bonus_settings: ' + String(err));
    }
    
    // 5. Проверяем наличие таблицы транзакций бонусов
    try {
      const bonusTransactionsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bonus_transactions'").get();
      
      if (!bonusTransactionsExists) {
        logger.info('Создаем таблицу bonus_transactions');
        db.prepare(`
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
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL,
            FOREIGN KEY (referredUserId) REFERENCES users(id) ON DELETE SET NULL
          )
        `).run();
        
        // Создаем индексы для таблицы транзакций
        db.prepare("CREATE INDEX IF NOT EXISTS idx_bonus_transactions_userId ON bonus_transactions(userId)").run();
        db.prepare("CREATE INDEX IF NOT EXISTS idx_bonus_transactions_type ON bonus_transactions(type)").run();
        db.prepare("CREATE INDEX IF NOT EXISTS idx_bonus_transactions_status ON bonus_transactions(status)").run();
      }
    } catch (err) {
      logger.error('Ошибка при настройке таблицы bonus_transactions: ' + String(err));
    }
    
    logger.info('Инициализация системы бонусов завершена успешно');
    return true;
  } catch (error) {
    logger.error('Ошибка при инициализации системы бонусов: ' + String(error));
    throw error;
  }
}

export async function POST() {
  try {
    // Проверяем, что пользователь администратор
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'Доступ запрещен. Требуются права администратора.' 
      }, { status: 403 });
    }
    
    // Запускаем инициализацию бонусной системы
    await initializeBonusSystem();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Бонусная система успешно инициализирована' 
    });
  } catch (error) {
    logger.error('Ошибка при инициализации бонусной системы: ' + String(error));
    
    return NextResponse.json({ 
      success: false, 
      message: 'Произошла ошибка при инициализации бонусной системы',
      error: String(error)
    }, { status: 500 });
  }
} 