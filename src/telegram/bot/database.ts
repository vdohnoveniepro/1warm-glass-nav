// Модуль для работы с базой данных для телеграм-бота
import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import { DB_CONFIG } from './config';
import { TelegramUser, NotificationSettings, BotState, Notification } from './types';

// Инициализация базы данных
const dbPath = path.resolve(process.cwd(), DB_CONFIG.path);
let db: BetterSqlite3.Database;

try {
  db = new BetterSqlite3(dbPath);
  console.log('[TelegramBot] База данных успешно подключена:', dbPath);
  
  // Инициализируем таблицы, если они не существуют
  initTables();
} catch (error) {
  console.error('[TelegramBot] Ошибка при подключении к базе данных:', error);
  throw error;
}

// Инициализация таблиц для работы с телеграм-ботом
function initTables() {
  // Создаем таблицу для хранения пользователей бота
  db.prepare(`
    CREATE TABLE IF NOT EXISTS telegram_users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      is_registered INTEGER DEFAULT 0,
      site_user_id TEXT,
      chat_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      notification_settings TEXT NOT NULL,
      state TEXT,
      temp_data TEXT
    )
  `).run();

  // Создаем таблицу для хранения уведомлений
  db.prepare(`
    CREATE TABLE IF NOT EXISTS telegram_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      created_at TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      sent_to_telegram INTEGER DEFAULT 0,
      telegram_message_id INTEGER,
      additional_data TEXT
    )
  `).run();

  // Создаем индексы для ускорения запросов
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_users_site_user_id ON telegram_users(site_user_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_notifications_user_id ON telegram_notifications(user_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_notifications_sent ON telegram_notifications(sent_to_telegram)`).run();

  console.log('[TelegramBot] Таблицы успешно инициализированы');
}

// Функции для работы с пользователями
export const telegramUsers = {
  // Создание нового пользователя
  create: (user: Partial<TelegramUser>): TelegramUser => {
    const now = new Date().toISOString();
    
    // Создаем настройки уведомлений по умолчанию
    const defaultNotificationSettings: NotificationSettings = {
      appointments: true,
      appointment_reminders: true,
      news: true,
      promotions: true,
      reviews: false,
      messages: true
    };
    
    const newUser: TelegramUser = {
      id: user.id!,
      username: user.username,
      first_name: user.first_name!,
      last_name: user.last_name,
      is_registered: user.is_registered || false,
      site_user_id: user.site_user_id,
      chat_id: user.chat_id!,
      created_at: new Date(now),
      updated_at: new Date(now),
      notification_settings: user.notification_settings || defaultNotificationSettings,
      state: user.state || BotState.IDLE,
      temp_data: user.temp_data
    };
    
    const stmt = db.prepare(`
      INSERT INTO telegram_users (
        id, username, first_name, last_name, is_registered, site_user_id,
        chat_id, created_at, updated_at, notification_settings, state, temp_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      newUser.id,
      newUser.username,
      newUser.first_name,
      newUser.last_name,
      newUser.is_registered ? 1 : 0,
      newUser.site_user_id,
      newUser.chat_id,
      now,
      now,
      JSON.stringify(newUser.notification_settings),
      newUser.state,
      newUser.temp_data ? JSON.stringify(newUser.temp_data) : null
    );
    
    return newUser;
  },
  
  // Получение пользователя по ID
  getById: (id: number): TelegramUser | null => {
    const user = db.prepare('SELECT * FROM telegram_users WHERE id = ?').get(id);
    
    if (!user) return null;
    
    return {
      ...user,
      is_registered: Boolean(user.is_registered),
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
      notification_settings: JSON.parse(user.notification_settings),
      temp_data: user.temp_data ? JSON.parse(user.temp_data) : undefined
    };
  },
  
  // Получение пользователя по ID на сайте
  getBySiteUserId: (siteUserId: string): TelegramUser | null => {
    const user = db.prepare('SELECT * FROM telegram_users WHERE site_user_id = ?').get(siteUserId);
    
    if (!user) return null;
    
    return {
      ...user,
      is_registered: Boolean(user.is_registered),
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
      notification_settings: JSON.parse(user.notification_settings),
      temp_data: user.temp_data ? JSON.parse(user.temp_data) : undefined
    };
  },
  
  // Обновление пользователя
  update: (id: number, updates: Partial<TelegramUser>): TelegramUser | null => {
    const user = telegramUsers.getById(id);
    if (!user) return null;
    
    const updatedUser = { ...user, ...updates, updated_at: new Date() };
    
    const stmt = db.prepare(`
      UPDATE telegram_users SET
        username = ?,
        first_name = ?,
        last_name = ?,
        is_registered = ?,
        site_user_id = ?,
        chat_id = ?,
        updated_at = ?,
        notification_settings = ?,
        state = ?,
        temp_data = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updatedUser.username,
      updatedUser.first_name,
      updatedUser.last_name,
      updatedUser.is_registered ? 1 : 0,
      updatedUser.site_user_id,
      updatedUser.chat_id,
      updatedUser.updated_at.toISOString(),
      JSON.stringify(updatedUser.notification_settings),
      updatedUser.state,
      updatedUser.temp_data ? JSON.stringify(updatedUser.temp_data) : null,
      id
    );
    
    return updatedUser;
  },
  
  // Обновление состояния пользователя
  updateState: (id: number, state: BotState | null): boolean => {
    const result = db.prepare('UPDATE telegram_users SET state = ?, updated_at = ? WHERE id = ?')
      .run(state, new Date().toISOString(), id);
    
    return result.changes > 0;
  },
  
  // Обновление временных данных пользователя
  updateTempData: (id: number, tempData: any): boolean => {
    const result = db.prepare('UPDATE telegram_users SET temp_data = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(tempData), new Date().toISOString(), id);
    
    return result.changes > 0;
  },
  
  // Получение всех пользователей
  getAll: (): TelegramUser[] => {
    const users = db.prepare('SELECT * FROM telegram_users').all();
    
    return users.map(user => ({
      ...user,
      is_registered: Boolean(user.is_registered),
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
      notification_settings: JSON.parse(user.notification_settings),
      temp_data: user.temp_data ? JSON.parse(user.temp_data) : undefined
    }));
  },
  
  // Получение пользователей с определенными настройками уведомлений
  getAllWithNotificationType: (notificationType: keyof NotificationSettings): TelegramUser[] => {
    const users = db.prepare('SELECT * FROM telegram_users').all();
    
    return users
      .map(user => ({
        ...user,
        is_registered: Boolean(user.is_registered),
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        notification_settings: JSON.parse(user.notification_settings),
        temp_data: user.temp_data ? JSON.parse(user.temp_data) : undefined
      }))
      .filter(user => user.notification_settings[notificationType]);
  }
};

// Функции для работы с уведомлениями
export const telegramNotifications = {
  // Создание нового уведомления
  create: (notification: Partial<Notification>): Notification => {
    const now = new Date().toISOString();
    
    const newNotification: Notification = {
      id: notification.id!,
      user_id: notification.user_id!,
      type: notification.type!,
      title: notification.title!,
      message: notification.message!,
      link: notification.link,
      created_at: new Date(now),
      read: false,
      sent_to_telegram: false,
      telegram_message_id: notification.telegram_message_id,
      additional_data: notification.additional_data
    };
    
    const stmt = db.prepare(`
      INSERT INTO telegram_notifications (
        id, user_id, type, title, message, link,
        created_at, read, sent_to_telegram, telegram_message_id, additional_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      newNotification.id,
      newNotification.user_id,
      newNotification.type,
      newNotification.title,
      newNotification.message,
      newNotification.link,
      now,
      0,
      0,
      newNotification.telegram_message_id,
      newNotification.additional_data ? JSON.stringify(newNotification.additional_data) : null
    );
    
    return newNotification;
  },
  
  // Получение уведомления по ID
  getById: (id: string): Notification | null => {
    const notification = db.prepare('SELECT * FROM telegram_notifications WHERE id = ?').get(id);
    
    if (!notification) return null;
    
    return {
      ...notification,
      created_at: new Date(notification.created_at),
      read: Boolean(notification.read),
      sent_to_telegram: Boolean(notification.sent_to_telegram),
      additional_data: notification.additional_data ? JSON.parse(notification.additional_data) : undefined
    };
  },
  
  // Получение уведомлений пользователя
  getByUserId: (userId: string): Notification[] => {
    const notifications = db.prepare('SELECT * FROM telegram_notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    
    return notifications.map(notification => ({
      ...notification,
      created_at: new Date(notification.created_at),
      read: Boolean(notification.read),
      sent_to_telegram: Boolean(notification.sent_to_telegram),
      additional_data: notification.additional_data ? JSON.parse(notification.additional_data) : undefined
    }));
  },
  
  // Получение неотправленных уведомлений
  getUnsent: (limit: number = 10): Notification[] => {
    const notifications = db.prepare(`
      SELECT * FROM telegram_notifications 
      WHERE sent_to_telegram = 0 
      ORDER BY created_at ASC 
      LIMIT ?
    `).all(limit);
    
    return notifications.map(notification => ({
      ...notification,
      created_at: new Date(notification.created_at),
      read: Boolean(notification.read),
      sent_to_telegram: Boolean(notification.sent_to_telegram),
      additional_data: notification.additional_data ? JSON.parse(notification.additional_data) : undefined
    }));
  },
  
  // Отметка уведомления как отправленного
  markAsSent: (id: string, messageId?: number): boolean => {
    const query = messageId 
      ? 'UPDATE telegram_notifications SET sent_to_telegram = 1, telegram_message_id = ? WHERE id = ?'
      : 'UPDATE telegram_notifications SET sent_to_telegram = 1 WHERE id = ?';
      
    const params = messageId ? [messageId, id] : [id];
    const result = db.prepare(query).run(...params);
    
    return result.changes > 0;
  },
  
  // Отметка уведомления как прочитанного
  markAsRead: (id: string): boolean => {
    const result = db.prepare('UPDATE telegram_notifications SET read = 1 WHERE id = ?').run(id);
    return result.changes > 0;
  },
  
  // Удаление старых отправленных уведомлений
  deleteOldSent: (daysOld: number = 30): number => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = db.prepare(`
      DELETE FROM telegram_notifications 
      WHERE sent_to_telegram = 1 
      AND created_at < ?
    `).run(cutoffDate.toISOString());
    
    return result.changes;
  }
};

export default { telegramUsers, telegramNotifications }; 