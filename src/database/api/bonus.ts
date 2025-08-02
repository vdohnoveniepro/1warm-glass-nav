import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export type BonusTransaction = {
  id: string;
  userId: string;
  amount: number;
  type: 'booking' | 'referral' | 'manual' | 'spent';
  status: 'pending' | 'completed' | 'cancelled';
  description?: string;
  appointmentId?: string;
  referredUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type BonusSettings = {
  id: string;
  bookingBonusAmount: number;
  referrerBonusAmount: number;
  referralBonusAmount: number;
  updatedAt: string;
};

export const bonusAPI = {
  /**
   * Получить настройки бонусной программы
   */
  getSettings: (): BonusSettings => {
    let settings = db.prepare('SELECT * FROM bonus_settings WHERE id = ?').get('default') as BonusSettings | undefined;
    
    if (!settings) {
      // Если настроек нет, создаем их с дефолтными значениями
      const now = new Date().toISOString();
      settings = {
        id: 'default',
        bookingBonusAmount: 300,
        referrerBonusAmount: 2000,
        referralBonusAmount: 2000,
        updatedAt: now
      };
      
      db.prepare(`
        INSERT INTO bonus_settings (id, bookingBonusAmount, referrerBonusAmount, referralBonusAmount, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        settings.id,
        settings.bookingBonusAmount,
        settings.referrerBonusAmount,
        settings.referralBonusAmount,
        settings.updatedAt
      );
    }
    
    return settings;
  },
  
  /**
   * Обновить настройки бонусной программы
   */
  updateSettings: (data: Partial<BonusSettings>): BonusSettings => {
    const current = bonusAPI.getSettings();
    const now = new Date().toISOString();
    
    const updated: BonusSettings = {
      ...current,
      ...data,
      updatedAt: now
    };
    
    db.prepare(`
      UPDATE bonus_settings SET
        bookingBonusAmount = ?,
        referrerBonusAmount = ?,
        referralBonusAmount = ?,
        updatedAt = ?
      WHERE id = ?
    `).run(
      updated.bookingBonusAmount,
      updated.referrerBonusAmount,
      updated.referralBonusAmount,
      updated.updatedAt,
      updated.id
    );
    
    return updated;
  },
  
  /**
   * Получить баланс бонусов пользователя
   */
  getUserBalance: (userId: string): number => {
    const user = db.prepare('SELECT bonusBalance FROM users WHERE id = ?').get(userId) as { bonusBalance: number } | undefined;
    return user?.bonusBalance || 0;
  },
  
  /**
   * Получить все транзакции пользователя
   */
  getUserTransactions: (userId: string): BonusTransaction[] => {
    return db.prepare('SELECT * FROM bonus_transactions WHERE userId = ? ORDER BY createdAt DESC').all(userId) as BonusTransaction[];
  },
  
  /**
   * Получить все транзакции
   */
  getAllTransactions: (): BonusTransaction[] => {
    return db.prepare('SELECT * FROM bonus_transactions ORDER BY createdAt DESC').all() as BonusTransaction[];
  },
  
  /**
   * Получить транзакцию по ID
   */
  getTransactionById: (id: string): BonusTransaction | null => {
    return db.prepare('SELECT * FROM bonus_transactions WHERE id = ?').get(id) as BonusTransaction | null;
  },
  
  /**
   * Создать транзакцию и обновить баланс пользователя
   */
  createTransaction: (data: Omit<BonusTransaction, 'id' | 'createdAt' | 'updatedAt'>): BonusTransaction => {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const transaction: BonusTransaction = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now
    };
    
    // Начинаем транзакцию в БД
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Создаем запись о транзакции
      db.prepare(`
        INSERT INTO bonus_transactions (
          id, userId, amount, type, status, description, appointmentId, referredUserId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        transaction.id,
        transaction.userId,
        transaction.amount,
        transaction.type,
        transaction.status,
        transaction.description || null,
        transaction.appointmentId || null,
        transaction.referredUserId || null,
        transaction.createdAt,
        transaction.updatedAt
      );
      
      // Если статус "completed", обновляем баланс пользователя
      if (transaction.status === 'completed') {
        db.prepare(`
          UPDATE users SET bonusBalance = bonusBalance + ?, updatedAt = ? WHERE id = ?
        `).run(transaction.amount, now, transaction.userId);
      }
      
      // Завершаем транзакцию
      db.exec('COMMIT');
      
      return transaction;
    } catch (error) {
      // Откатываем транзакцию в случае ошибки
      db.exec('ROLLBACK');
      console.error('Ошибка при создании бонусной транзакции:', error);
      throw error;
    }
  },
  
  /**
   * Обновить статус транзакции
   */
  updateTransactionStatus: (id: string, status: 'pending' | 'completed' | 'cancelled'): BonusTransaction | null => {
    const transaction = bonusAPI.getTransactionById(id);
    
    if (!transaction) {
      return null;
    }
    
    const now = new Date().toISOString();
    const oldStatus = transaction.status;
    
    // Начинаем транзакцию в БД
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Обновляем статус транзакции
      db.prepare(`
        UPDATE bonus_transactions SET status = ?, updatedAt = ? WHERE id = ?
      `).run(status, now, id);
      
      // Если меняем статус с "pending" на "completed", начисляем бонусы
      if (oldStatus === 'pending' && status === 'completed') {
        db.prepare(`
          UPDATE users SET bonusBalance = bonusBalance + ?, updatedAt = ? WHERE id = ?
        `).run(transaction.amount, now, transaction.userId);
      }
      
      // Если меняем статус с "completed" на "cancelled", отменяем бонусы
      else if (oldStatus === 'completed' && status === 'cancelled') {
        db.prepare(`
          UPDATE users SET bonusBalance = bonusBalance - ?, updatedAt = ? WHERE id = ?
        `).run(transaction.amount, now, transaction.userId);
      }
      
      // Если меняем статус с "pending" на "cancelled", ничего не делаем с балансом
      
      // Завершаем транзакцию
      db.exec('COMMIT');
      
      return {
        ...transaction,
        status,
        updatedAt: now
      };
    } catch (error) {
      // Откатываем транзакцию в случае ошибки
      db.exec('ROLLBACK');
      console.error('Ошибка при обновлении статуса бонусной транзакции:', error);
      throw error;
    }
  },
  
  /**
   * Начислить бонусы за бронирование
   */
  addBookingBonus: (userId: string, appointmentId: string): BonusTransaction => {
    const settings = bonusAPI.getSettings();
    
    return bonusAPI.createTransaction({
      userId,
      amount: settings.bookingBonusAmount,
      type: 'booking',
      status: 'pending', // Начисляем в статусе "pending", подтверждаем после выполнения услуги
      description: 'Бонус за бронирование услуги',
      appointmentId
    });
  },
  
  /**
   * Начислить реферальные бонусы
   */
  addReferralBonus: (referrerId: string, referredId: string): { referrer: BonusTransaction, referred: BonusTransaction } => {
    const settings = bonusAPI.getSettings();
    
    // Бонус пригласившему
    const referrerTransaction = bonusAPI.createTransaction({
      userId: referrerId,
      amount: settings.referrerBonusAmount,
      type: 'referral',
      status: 'completed',
      description: 'Бонус за приглашение нового пользователя',
      referredUserId: referredId
    });
    
    // Бонус приглашенному
    const referredTransaction = bonusAPI.createTransaction({
      userId: referredId,
      amount: settings.referralBonusAmount,
      type: 'referral',
      status: 'completed',
      description: 'Бонус за регистрацию по приглашению'
    });
    
    return {
      referrer: referrerTransaction,
      referred: referredTransaction
    };
  },
  
  /**
   * Списать бонусы при оплате услуги
   */
  spendBonus: (userId: string, amount: number, appointmentId: string): BonusTransaction => {
    return bonusAPI.createTransaction({
      userId,
      amount: -Math.abs(amount), // Отрицательная сумма для списания
      type: 'spent',
      status: 'completed', // Списание происходит немедленно при бронировании
      description: 'Списание бонусов при оплате услуги',
      appointmentId
    });
  },
  
  /**
   * Ручное изменение баланса пользователя администратором
   */
  manualAdjustment: (userId: string, amount: number, description: string): BonusTransaction => {
    return bonusAPI.createTransaction({
      userId,
      amount,
      type: 'manual',
      status: 'completed',
      description: description || 'Ручная корректировка баланса администратором'
    });
  },
  
  /**
   * Получить список пользователей, приглашенных указанным пользователем
   */
  getReferredUsers: (userId: string): { user: { id: string, email: string, firstName: string | null, lastName: string | null }, createdAt: string }[] => {
    const users = db.prepare(`
      SELECT u.id, u.email, u.firstName, u.lastName, u.createdAt
      FROM users u
      WHERE u.referredById = ?
      ORDER BY u.createdAt DESC
    `).all(userId) as { id: string, email: string, firstName: string | null, lastName: string | null, createdAt: string }[];
    
    // Преобразуем формат данных для совместимости с клиентом
    return users.map(u => ({
      user: {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName
      },
      createdAt: u.createdAt
    }));
  },
  
  /**
   * Получить пользователя, пригласившего указанного пользователя
   */
  getReferrer: (userId: string): { id: string, email: string, firstName: string | null, lastName: string | null } | null => {
    const user = db.prepare(`
      SELECT u.id, u.email, u.firstName, u.lastName
      FROM users u
      JOIN users referred ON referred.referredById = u.id
      WHERE referred.id = ?
    `).get(userId) as { id: string, email: string, firstName: string | null, lastName: string | null } | undefined;
    
    return user || null;
  }
};

// Добавляем адаптер для совместимости
export const bonusAdapter = bonusAPI; 