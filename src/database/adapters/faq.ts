import { db } from '@/database/db';
import { v4 as uuidv4 } from 'uuid';
import { FAQ } from '@/types/faq';

export const faqAdapter = {
  /**
   * Получить все FAQ
   */
  getAll: (): FAQ[] => {
    try {
      const stmt = db.prepare(`
        SELECT * FROM faq
        ORDER BY "order" ASC
      `);
      
      const faqs = stmt.all() as FAQ[];
      return faqs;
    } catch (error) {
      console.error('Ошибка при получении FAQ:', error);
      return [];
    }
  },
  
  /**
   * Получить FAQ по ID
   */
  getById: (id: string): FAQ | null => {
    try {
      const stmt = db.prepare('SELECT * FROM faq WHERE id = ?');
      const faq = stmt.get(id) as FAQ | null;
      return faq;
    } catch (error) {
      console.error(`Ошибка при получении FAQ с ID ${id}:`, error);
      return null;
    }
  },
  
  /**
   * Создать новый FAQ
   */
  create: (data: Partial<FAQ>): FAQ | null => {
    try {
      // Получаем максимальный порядок для новой записи
      const maxOrderStmt = db.prepare('SELECT MAX("order") as maxOrder FROM faq');
      const { maxOrder } = maxOrderStmt.get() as { maxOrder: number };
      const newOrder = (maxOrder || -1) + 1;
      
      const now = new Date().toISOString();
      const id = uuidv4();
      
      const stmt = db.prepare(`
        INSERT INTO faq (id, question, answer, category, "order", isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        data.question || '',
        data.answer || '',
        data.category || null,
        newOrder,
        data.isActive !== undefined ? data.isActive : 1,
        now,
        now
      );
      
      return faqAdapter.getById(id);
    } catch (error) {
      console.error('Ошибка при создании FAQ:', error);
      return null;
    }
  },
  
  /**
   * Обновить FAQ
   */
  update: (id: string, data: Partial<FAQ>): FAQ | null => {
    try {
      const faq = faqAdapter.getById(id);
      
      if (!faq) {
        return null;
      }
      
      const now = new Date().toISOString();
      
      const stmt = db.prepare(`
        UPDATE faq
        SET question = ?,
            answer = ?,
            category = ?,
            "order" = ?,
            isActive = ?,
            updatedAt = ?
        WHERE id = ?
      `);
      
      stmt.run(
        data.question || faq.question,
        data.answer || faq.answer,
        data.category !== undefined ? data.category : faq.category,
        data.order !== undefined ? data.order : faq.order,
        data.isActive !== undefined ? data.isActive : (faq.isActive || 1),
        now,
        id
      );
      
      return faqAdapter.getById(id);
    } catch (error) {
      console.error(`Ошибка при обновлении FAQ с ID ${id}:`, error);
      return null;
    }
  },
  
  /**
   * Удалить FAQ
   */
  delete: (id: string): boolean => {
    try {
      const stmt = db.prepare('DELETE FROM faq WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Ошибка при удалении FAQ с ID ${id}:`, error);
      return false;
    }
  },
  
  /**
   * Обновить порядок FAQ
   */
  updateOrder: (items: { id: string; order: number }[]): FAQ[] => {
    try {
      const stmt = db.prepare('UPDATE faq SET "order" = ? WHERE id = ?');
      
      // Начинаем транзакцию для обновления порядка
      db.exec('BEGIN TRANSACTION');
      
      items.forEach(item => {
        stmt.run(item.order, item.id);
      });
      
      // Завершаем транзакцию
      db.exec('COMMIT');
      
      // Возвращаем обновленный список
      return faqAdapter.getAll();
    } catch (error) {
      // Отменяем транзакцию в случае ошибки
      db.exec('ROLLBACK');
      console.error('Ошибка при обновлении порядка FAQ:', error);
      return [];
    }
  }
}; 