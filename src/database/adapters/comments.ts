import { db } from '../db';
import { commentsAPI } from '../api';
import { Comment } from '../api/comments';

// Адаптер для работы с комментариями через SQLite
export const commentsAdapter = {
  // Найти комментарии по параметрам
  async find(params: Record<string, any>): Promise<Comment[]> {
    try {
      console.log(`[CommentsAdapter] Поиск комментариев с параметрами:`, params);
      
      // Проверка существования базы данных
      if (!db) {
        console.error('[CommentsAdapter] База данных не инициализирована');
        return [];
      }
      
      // Проверка существования таблицы comments
      try {
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='comments'").get();
        console.log('[CommentsAdapter] Проверка существования таблицы comments:', tableExists);
        
        if (!tableExists) {
          console.error('[CommentsAdapter] Таблица comments не существует в базе данных');
          return [];
        }
      } catch (tableError) {
        console.error('[CommentsAdapter] Ошибка при проверке таблицы comments:', tableError);
      }
      
      let query = 'SELECT * FROM comments WHERE 1=1';
      const queryParams: any[] = [];
      
      // Добавляем условия поиска
      Object.entries(params).forEach(([key, value]) => {
        query += ` AND ${key} = ?`;
        queryParams.push(value);
      });
      
      console.log(`[CommentsAdapter] Выполняем SQL запрос: ${query}`);
      console.log(`[CommentsAdapter] Параметры запроса:`, queryParams);
      
      // Подготавливаем и выполняем запрос
      const stmt = db.prepare(query);
      const rows = stmt.all(...queryParams);
      
      console.log(`[CommentsAdapter] Результат SQL запроса: найдено ${rows.length} комментариев`);
      if (rows.length > 0) {
        console.log(`[CommentsAdapter] Первый комментарий:`, rows[0]);
      }
      
      // Преобразуем строки результата
      const comments = rows.map((row: any) => ({
        ...row,
        likedBy: row.likedBy ? JSON.parse(row.likedBy) : [],
        dislikedBy: row.dislikedBy ? JSON.parse(row.dislikedBy) : []
      }));
      
      console.log(`[CommentsAdapter] Найдено ${comments.length} комментариев после преобразования`);
      return comments;
    } catch (error) {
      console.error('[CommentsAdapter] Ошибка при поиске комментариев:', error);
      return [];
    }
  },
  
  // Создать новый комментарий
  async create(comment: Comment): Promise<Comment> {
    try {
      console.log(`[CommentsAdapter] Создание нового комментария`);
      
      // Преобразуем массивы в JSON для хранения
      const commentToSave = {
        ...comment,
        likedBy: JSON.stringify(comment.likedBy || []),
        dislikedBy: JSON.stringify(comment.dislikedBy || [])
      };
      
      // Подготавливаем запрос
      const columns = Object.keys(commentToSave).join(', ');
      const placeholders = Object.keys(commentToSave).map(() => '?').join(', ');
      const values = Object.values(commentToSave);
      
      const sql = `INSERT INTO comments (${columns}) VALUES (${placeholders})`;
      const stmt = db.prepare(sql);
      const result = stmt.run(...values);
      
      if (result.changes > 0) {
        console.log(`[CommentsAdapter] Комментарий успешно создан с ID: ${comment.id}`);
        return comment;
      } else {
        throw new Error('Не удалось создать комментарий');
      }
    } catch (error) {
      console.error('[CommentsAdapter] Ошибка при создании комментария:', error);
      throw error;
    }
  },
  
  // Обновить комментарий
  async update(id: string, data: Partial<Comment>): Promise<Comment> {
    try {
      console.log(`[CommentsAdapter] Обновление комментария с ID: ${id}`);
      
      // Получаем текущий комментарий
      const existingComment = await this.find({ id });
      if (!existingComment || existingComment.length === 0) {
        throw new Error(`Комментарий с ID ${id} не найден`);
      }
      
      // Подготавливаем данные для обновления
      const dataToUpdate: Record<string, any> = { ...data };
      
      // Преобразуем массивы в JSON для хранения
      if (dataToUpdate.likedBy) {
        dataToUpdate.likedBy = JSON.stringify(dataToUpdate.likedBy);
      }
      if (dataToUpdate.dislikedBy) {
        dataToUpdate.dislikedBy = JSON.stringify(dataToUpdate.dislikedBy);
      }
      
      // Добавляем timestamp обновления
      dataToUpdate.updatedAt = new Date().toISOString();
      
      // Формируем SQL запрос
      const setClause = Object.keys(dataToUpdate)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const sql = `UPDATE comments SET ${setClause} WHERE id = ?`;
      const values = [...Object.values(dataToUpdate), id];
      
      const stmt = db.prepare(sql);
      const result = stmt.run(...values);
      
      if (result.changes > 0) {
        console.log(`[CommentsAdapter] Комментарий успешно обновлен`);
        const updatedComment = await this.find({ id });
        return updatedComment[0];
      } else {
        throw new Error('Не удалось обновить комментарий');
      }
    } catch (error) {
      console.error('[CommentsAdapter] Ошибка при обновлении комментария:', error);
      throw error;
    }
  },
  
  // Удалить комментарий
  async delete(id: string): Promise<{ id: string }> {
    try {
      console.log(`[CommentsAdapter] Удаление комментария с ID: ${id}`);
      
      const sql = `DELETE FROM comments WHERE id = ?`;
      const stmt = db.prepare(sql);
      const result = stmt.run(id);
      
      if (result.changes > 0) {
        console.log(`[CommentsAdapter] Комментарий успешно удален`);
        return { id };
      } else {
        throw new Error(`Комментарий с ID ${id} не найден или не может быть удален`);
      }
    } catch (error) {
      console.error('[CommentsAdapter] Ошибка при удалении комментария:', error);
      throw error;
    }
  }
}; 