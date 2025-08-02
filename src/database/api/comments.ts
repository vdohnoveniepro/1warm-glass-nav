import { commentsAdapter } from '../adapters/comments';
import { db } from '../db';

// Интерфейс комментария
export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  articleId: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  photo?: string;
}

// Проверяем и создаем таблицу комментариев, если она не существует
const ensureCommentsTable = () => {
  try {
    console.log('[CommentsAPI] Проверка существования таблицы комментариев...');
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='comments'
    `).get();
    
    if (!tableExists) {
      console.log('[CommentsAPI] Таблица комментариев не найдена, создаем...');
      
      // Создаем таблицу комментариев
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
      
      // Создаем индексы для улучшения производительности
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_comments_articleId ON comments (articleId);
        CREATE INDEX IF NOT EXISTS idx_comments_userId ON comments (userId);
        CREATE INDEX IF NOT EXISTS idx_comments_parentId ON comments (parentId);
      `);
      
      console.log('[CommentsAPI] Таблица комментариев успешно создана с индексами');
    } else {
      console.log('[CommentsAPI] Таблица комментариев уже существует');
    }
  } catch (error) {
    console.error('[CommentsAPI] Ошибка при проверке/создании таблицы комментариев:', error);
  }
};

// Вызываем функцию проверки таблицы при импорте модуля
ensureCommentsTable();

// Функция для преобразования строковых полей JSON в объекты
const transformCommentFromDB = (comment: any): Comment => {
  if (!comment) return comment;
  
  return {
    ...comment,
    likedBy: comment.likedBy ? JSON.parse(comment.likedBy) : [],
    dislikedBy: comment.dislikedBy ? JSON.parse(comment.dislikedBy) : [],
    // Преобразуем parentId из null-строки в null
    parentId: comment.parentId === 'null' ? null : comment.parentId,
  };
};

// Функция для преобразования объектов в строковые поля JSON для хранения в БД
const transformCommentToDB = (comment: Comment): any => {
  return {
    ...comment,
    likedBy: JSON.stringify(comment.likedBy || []),
    dislikedBy: JSON.stringify(comment.dislikedBy || []),
    // Обеспечиваем, что parentId не будет undefined
    parentId: comment.parentId === undefined ? null : comment.parentId,
  };
};

// API для работы с комментариями
export const commentsAPI = {
  // Получить все комментарии или по условию
  async find(params: Record<string, any>): Promise<Comment[]> {
    try {
      console.log('[CommentsAPI] Поиск комментариев с параметрами:', params);
      
      // Используем прямой доступ к БД, если адаптер не работает
      if (!commentsAdapter || typeof commentsAdapter.find !== 'function') {
        console.log('[CommentsAPI] Адаптер не доступен, используем прямой доступ к БД');
        
        let query = 'SELECT * FROM comments WHERE 1=1';
        const queryParams: any[] = [];
        
        // Добавляем условия поиска
        Object.entries(params).forEach(([key, value]) => {
          query += ` AND ${key} = ?`;
          queryParams.push(value);
        });
        
        // Подготавливаем и выполняем запрос
        const stmt = db.prepare(query);
        const rows = stmt.all(...queryParams);
        
        // Преобразуем строки результата
        return rows.map(transformCommentFromDB);
      }
      
      // Используем адаптер
      const comments = await commentsAdapter.find(params);
      return comments;
    } catch (error) {
      console.error('[CommentsAPI] Ошибка при поиске комментариев:', error);
      return [];
    }
  },
  
  // Получить комментарий по ID
  async getById(id: string): Promise<Comment | null> {
    try {
      console.log(`[CommentsAPI] Получение комментария по ID: ${id}`);
      
      // Используем прямой доступ к БД, если адаптер не работает
      if (!commentsAdapter || typeof commentsAdapter.find !== 'function') {
        console.log('[CommentsAPI] Адаптер не доступен, используем прямой доступ к БД');
        const stmt = db.prepare('SELECT * FROM comments WHERE id = ?');
        const comment = stmt.get(id);
        return comment ? transformCommentFromDB(comment) : null;
      }
      
      // Используем адаптер
      const comments = await commentsAdapter.find({ id });
      return comments && comments.length > 0 ? comments[0] : null;
    } catch (error) {
      console.error(`[CommentsAPI] Ошибка при получении комментария по ID ${id}:`, error);
      return null;
    }
  },
  
  // Получить комментарии для статьи
  async getByArticleId(articleId: string): Promise<Comment[]> {
    console.log(`[CommentsAPI] Получение комментариев для статьи с ID: ${articleId}`);
    
    if (!articleId) {
      console.error('[CommentsAPI] ID статьи не указан');
      return [];
    }
    
    try {
      // Используем адаптер комментариев
      if (commentsAdapter && typeof commentsAdapter.find === 'function') {
        console.log('[CommentsAPI] Использую commentsAdapter.find');
        const comments = await commentsAdapter.find({ articleId });
        console.log(`[CommentsAPI] Найдено ${comments.length} комментариев через adapter`);
        return comments;
      } 
      // Прямой запрос к базе данных, если адаптер недоступен
      else if (db) {
        console.log('[CommentsAPI] Адаптер недоступен, использую прямой запрос к БД');
        try {
          const stmt = db.prepare('SELECT * FROM comments WHERE articleId = ?');
          const rows = stmt.all(articleId);
          console.log(`[CommentsAPI] Найдено ${rows.length} комментариев через прямой запрос`);
          
          // Преобразуем строковые поля в объекты
          const comments = rows.map((row: any) => ({
            ...row,
            likedBy: row.likedBy ? JSON.parse(row.likedBy) : [],
            dislikedBy: row.dislikedBy ? JSON.parse(row.dislikedBy) : []
          }));
          
          return comments;
        } catch (dbError) {
          console.error('[CommentsAPI] Ошибка при прямом запросе к БД:', dbError);
          return [];
        }
      }
      
      console.error('[CommentsAPI] Ни адаптер, ни прямой доступ к БД не доступны');
      return [];
    } catch (error) {
      console.error('[CommentsAPI] Ошибка при получении комментариев по ID статьи:', error);
      return [];
    }
  },
  
  // Создать новый комментарий
  async create(comment: Omit<Comment, 'id' | 'createdAt' | 'likes' | 'dislikes' | 'likedBy' | 'dislikedBy'>): Promise<Comment> {
    try {
      console.log('[CommentsAPI] Создание нового комментария');
      const { v4: uuidv4 } = require('uuid');
      
      // Подготавливаем данные для нового комментария
      const newComment: Comment = {
        ...comment,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        likedBy: [],
        dislikedBy: [],
      };
      
      // Используем прямой доступ к БД, если адаптер не работает
      if (!commentsAdapter || typeof commentsAdapter.create !== 'function') {
        console.log('[CommentsAPI] Адаптер не доступен, используем прямой доступ к БД');
        
        const commentToSave = transformCommentToDB(newComment);
        
        // Подготавливаем запрос
        const columns = Object.keys(commentToSave).join(', ');
        const placeholders = Object.keys(commentToSave).map(() => '?').join(', ');
        const values = Object.values(commentToSave);
        
        const sql = `INSERT INTO comments (${columns}) VALUES (${placeholders})`;
        const stmt = db.prepare(sql);
        const result = stmt.run(...values);
        
        if (result.changes <= 0) {
          throw new Error('Не удалось создать комментарий');
        }
        
        console.log(`[CommentsAPI] Комментарий успешно создан с ID: ${newComment.id} через прямой доступ к БД`);
        return newComment;
      }
      
      // Используем адаптер
      const result = await commentsAdapter.create(newComment);
      console.log(`[CommentsAPI] Комментарий успешно создан с ID: ${result.id} через адаптер`);
      return result;
    } catch (error) {
      console.error('[CommentsAPI] Ошибка при создании комментария:', error);
      throw error;
    }
  },
  
  // Обновить комментарий
  async update(id: string, data: Partial<Comment>): Promise<Comment> {
    try {
      console.log(`[CommentsAPI] Обновление комментария с ID: ${id}`);
      
      // Используем прямой доступ к БД, если адаптер не работает
      if (!commentsAdapter || typeof commentsAdapter.update !== 'function') {
        console.log('[CommentsAPI] Адаптер не доступен, используем прямой доступ к БД');
        
        // Получаем текущий комментарий
        const existingComment = await this.getById(id);
        if (!existingComment) {
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
        
        if (result.changes <= 0) {
          throw new Error('Не удалось обновить комментарий');
        }
        
        console.log(`[CommentsAPI] Комментарий успешно обновлен через прямой доступ к БД`);
        const updatedComment = await this.getById(id);
        return updatedComment!;
      }
      
      // Используем адаптер
      const result = await commentsAdapter.update(id, data);
      console.log(`[CommentsAPI] Комментарий успешно обновлен через адаптер`);
      return result;
    } catch (error) {
      console.error(`[CommentsAPI] Ошибка при обновлении комментария с ID ${id}:`, error);
      throw error;
    }
  },
  
  // Удалить комментарий
  async delete(id: string): Promise<{ id: string }> {
    try {
      console.log(`[CommentsAPI] Удаление комментария с ID: ${id}`);
      
      // Используем прямой доступ к БД, если адаптер не работает
      if (!commentsAdapter || typeof commentsAdapter.delete !== 'function') {
        console.log('[CommentsAPI] Адаптер не доступен, используем прямой доступ к БД');
        
        const sql = `DELETE FROM comments WHERE id = ?`;
        const stmt = db.prepare(sql);
        const result = stmt.run(id);
        
        if (result.changes <= 0) {
          throw new Error(`Комментарий с ID ${id} не найден или не может быть удален`);
        }
        
        console.log(`[CommentsAPI] Комментарий успешно удален через прямой доступ к БД`);
        return { id };
      }
      
      // Используем адаптер
      const result = await commentsAdapter.delete(id);
      console.log(`[CommentsAPI] Комментарий успешно удален через адаптер`);
      return result;
    } catch (error) {
      console.error(`[CommentsAPI] Ошибка при удалении комментария с ID ${id}:`, error);
      throw error;
    }
  },
  
  // Добавить реакцию (лайк/дизлайк)
  async addReaction(id: string, userId: string, isLike: boolean): Promise<Comment | null> {
    try {
      console.log(`[CommentsAPI] Добавление реакции (${isLike ? 'лайк' : 'дизлайк'}) пользователя ${userId} к комментарию ${id}`);
      
      // Получаем текущий комментарий
      const comment = await this.getById(id);
      if (!comment) {
        throw new Error(`Комментарий с ID ${id} не найден`);
      }
      
      // Копируем массивы лайков/дизлайков
      const likedBy = [...comment.likedBy];
      const dislikedBy = [...comment.dislikedBy];
      
      // Проверяем, есть ли уже реакция
      const hasLiked = likedBy.includes(userId);
      const hasDisliked = dislikedBy.includes(userId);
      
      // Обрабатываем добавление или удаление реакции
      if (isLike) {
        // Обрабатываем лайк
        if (hasLiked) {
          // Если уже лайкнул, удаляем лайк
          const index = likedBy.indexOf(userId);
          likedBy.splice(index, 1);
        } else {
          // Добавляем лайк и удаляем дизлайк, если был
          likedBy.push(userId);
          if (hasDisliked) {
            const index = dislikedBy.indexOf(userId);
            dislikedBy.splice(index, 1);
          }
        }
      } else {
        // Обрабатываем дизлайк
        if (hasDisliked) {
          // Если уже дизлайкнул, удаляем дизлайк
          const index = dislikedBy.indexOf(userId);
          dislikedBy.splice(index, 1);
        } else {
          // Добавляем дизлайк и удаляем лайк, если был
          dislikedBy.push(userId);
          if (hasLiked) {
            const index = likedBy.indexOf(userId);
            likedBy.splice(index, 1);
          }
        }
      }
      
      // Обновляем комментарий
      const updatedComment = await this.update(id, {
        likes: likedBy.length,
        dislikes: dislikedBy.length,
        likedBy,
        dislikedBy
      });
      
      return updatedComment;
    } catch (error) {
      console.error(`[CommentsAPI] Ошибка при добавлении реакции к комментарию с ID ${id}:`, error);
      return null;
    }
  }
}; 