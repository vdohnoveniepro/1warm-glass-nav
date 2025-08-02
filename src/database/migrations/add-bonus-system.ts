import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Миграция для добавления системы бонусов
 */
export async function migrateBonusSystem() {
  console.log('Начало миграции системы бонусов...');
  
  try {
    // Проверяем, есть ли колонка bonusBalance в таблице users
    const usersColumns = db.prepare("PRAGMA table_info(users)").all();
    const hasBonusBalance = usersColumns.some((col: any) => col.name === 'bonusBalance');
    const hasReferralCode = usersColumns.some((col: any) => col.name === 'referralCode');
    const hasReferredById = usersColumns.some((col: any) => col.name === 'referredById');
    
    // Добавляем колонки в таблицу users, если их нет
    if (!hasBonusBalance) {
      console.log('Добавляем колонку bonusBalance в таблицу users');
      db.prepare("ALTER TABLE users ADD COLUMN bonusBalance REAL DEFAULT 0").run();
    }
    
    if (!hasReferralCode) {
      console.log('Добавляем колонку referralCode в таблицу users');
      db.prepare("ALTER TABLE users ADD COLUMN referralCode TEXT UNIQUE").run();
    }
    
    if (!hasReferredById) {
      console.log('Добавляем колонку referredById в таблицу users');
      db.prepare("ALTER TABLE users ADD COLUMN referredById TEXT REFERENCES users(id) ON DELETE SET NULL").run();
    }
    
    // Проверяем наличие таблицы bonus_transactions
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bonus_transactions'").get();
    
    if (!tableExists) {
      console.log('Создаем таблицу bonus_transactions');
      db.exec(`
        CREATE TABLE bonus_transactions (
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
      `);
    }
    
    // Проверяем наличие таблицы bonus_settings
    const settingsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bonus_settings'").get();
    
    if (!settingsExists) {
      console.log('Создаем таблицу bonus_settings');
      db.exec(`
        CREATE TABLE bonus_settings (
          id TEXT PRIMARY KEY DEFAULT 'default',
          bookingBonusAmount REAL DEFAULT 300,
          referrerBonusAmount REAL DEFAULT 2000,
          referralBonusAmount REAL DEFAULT 2000,
          updatedAt TEXT NOT NULL
        )
      `);
      
      // Добавляем начальные настройки
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO bonus_settings (id, bookingBonusAmount, referrerBonusAmount, referralBonusAmount, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('default', 300, 2000, 2000, now);
    }
    
    // Проверяем наличие колонок в таблице appointments
    const appointmentsColumns = db.prepare("PRAGMA table_info(appointments)").all();
    const hasBonusAmount = appointmentsColumns.some((col: any) => col.name === 'bonusAmount');
    
    if (!hasBonusAmount) {
      console.log('Добавляем колонку bonusAmount в таблицу appointments');
      db.prepare("ALTER TABLE appointments ADD COLUMN bonusAmount REAL").run();
    }
    
    // Генерируем реферальные коды для всех пользователей, у которых их нет
    console.log('Генерируем реферальные коды для пользователей...');
    const users = db.prepare("SELECT id FROM users WHERE referralCode IS NULL").all() as { id: string }[];
    
    for (const user of users) {
      const referralCode = generateReferralCode();
      db.prepare("UPDATE users SET referralCode = ? WHERE id = ?").run(referralCode, user.id);
    }
    
    console.log(`Сгенерированы реферальные коды для ${users.length} пользователей`);
    console.log('Миграция системы бонусов завершена успешно');
    
    return { success: true, message: 'Миграция системы бонусов выполнена успешно' };
  } catch (error) {
    console.error('Ошибка при миграции системы бонусов:', error);
    return { success: false, message: `Ошибка при миграции: ${error}` };
  }
}

/**
 * Генерирует уникальный реферальный код
 */
function generateReferralCode(): string {
  // Генерируем случайную строку из 8 символов
  return crypto.randomBytes(4).toString('hex').toUpperCase();
} 