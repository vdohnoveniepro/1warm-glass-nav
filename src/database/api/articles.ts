import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export type Article = {
  id: string;
  title: string;
  slug: string | null;
  banner: string | null;
  content: string | null;
  excerpt: string | null;
  category: string | null;
  specialistId: string | null;
  status: string;
  views: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  tags?: string[];
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
};

export const articlesAPI = {
  /**
   * Получить все статьи
   */
  getAll: (options?: { status?: string, limit?: number, offset?: number }): Article[] => {
    let query = 'SELECT * FROM articles';
    const params: any[] = [];
    
    if (options?.status) {
      query += ' WHERE status = ?';
      params.push(options.status);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
      
      if (options?.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }
    
    const articles = db.prepare(query).all(...params) as Article[];
    
    // Загружаем теги для статей
    return articles.map(article => {
      return {
        ...article,
        tags: articlesAPI.getArticleTags(article.id),
        author: articlesAPI.getArticleAuthor(article.specialistId)
      };
    });
  },

  /**
   * Получить статью по ID
   */
  getById: (id: string): Article | null => {
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article | null;
    
    if (!article) {
      return null;
    }
    
    // Загружаем теги и автора
    article.tags = articlesAPI.getArticleTags(id);
    article.author = articlesAPI.getArticleAuthor(article.specialistId);
    
    return article;
  },
  
  /**
   * Получить статью по slug
   */
  getBySlug: (slug: string): Article | null => {
    const article = db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug) as Article | null;
    
    if (!article) {
      return null;
    }
    
    // Загружаем теги и автора
    article.tags = articlesAPI.getArticleTags(article.id);
    article.author = articlesAPI.getArticleAuthor(article.specialistId);
    
    return article;
  },

  /**
   * Получить теги статьи
   */
  getArticleTags: (articleId: string): string[] => {
    const tags = db.prepare(`
      SELECT tag FROM article_tags
      WHERE articleId = ?
    `).all(articleId) as { tag: string }[];
    
    return tags.map(t => t.tag);
  },
  
  /**
   * Получить автора статьи
   */
  getArticleAuthor: (specialistId: string | null): { id: string, name: string, avatar: string | null } | undefined => {
    if (!specialistId) {
      return undefined;
    }
    
    const specialist = db.prepare(`
      SELECT id, firstName, lastName, photo as avatar
      FROM specialists
      WHERE id = ?
    `).get(specialistId) as any;
    
    if (!specialist) {
      return undefined;
    }
    
    return {
      id: specialist.id,
      name: `${specialist.firstName} ${specialist.lastName}`.trim(),
      avatar: specialist.avatar
    };
  },

  /**
   * Создать новую статью
   */
  create: (article: Partial<Article>): Article => {
    const id = article.id || uuidv4();
    const now = new Date().toISOString();
    
    const newArticle: Article = {
      id,
      title: article.title || '',
      slug: article.slug || null,
      banner: article.banner || null,
      content: article.content || null,
      excerpt: article.excerpt || null,
      category: article.category || null,
      specialistId: article.specialistId || null,
      status: article.status || 'draft',
      views: article.views || 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: article.status === 'published' ? now : null
    };
    
    // Вставляем основные данные
    db.prepare(`
      INSERT INTO articles (
        id, title, slug, banner, content, excerpt, 
        category, specialistId, status, views, 
        createdAt, updatedAt, publishedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newArticle.id,
      newArticle.title,
      newArticle.slug,
      newArticle.banner,
      newArticle.content,
      newArticle.excerpt,
      newArticle.category,
      newArticle.specialistId,
      newArticle.status,
      newArticle.views,
      newArticle.createdAt,
      newArticle.updatedAt,
      newArticle.publishedAt
    );
    
    // Сохраняем теги
    if (article.tags && article.tags.length > 0) {
      const tagStmt = db.prepare(`
        INSERT INTO article_tags (articleId, tag)
        VALUES (?, ?)
      `);
      
      for (const tag of article.tags) {
        tagStmt.run(newArticle.id, tag);
      }
    }
    
    return articlesAPI.getById(newArticle.id) as Article;
  },

  /**
   * Обновить статью
   */
  update: (id: string, article: Partial<Article>): Article | null => {
    const currentArticle = articlesAPI.getById(id);
    
    if (!currentArticle) {
      return null;
    }
    
    // Если статья становится опубликованной, устанавливаем publishedAt
    const isBeingPublished = currentArticle.status !== 'published' && article.status === 'published';
    const publishedAt = isBeingPublished ? new Date().toISOString() : currentArticle.publishedAt;
    
    const updatedArticle: Article = {
      ...currentArticle,
      ...article,
      id, // Сохраняем исходный ID
      updatedAt: new Date().toISOString(),
      publishedAt
    };
    
    // Обновляем основные данные
    db.prepare(`
      UPDATE articles
      SET title = ?,
          slug = ?,
          banner = ?,
          content = ?,
          excerpt = ?,
          category = ?,
          specialistId = ?,
          status = ?,
          views = ?,
          updatedAt = ?,
          publishedAt = ?
      WHERE id = ?
    `).run(
      updatedArticle.title,
      updatedArticle.slug,
      updatedArticle.banner,
      updatedArticle.content,
      updatedArticle.excerpt,
      updatedArticle.category,
      updatedArticle.specialistId,
      updatedArticle.status,
      updatedArticle.views,
      updatedArticle.updatedAt,
      updatedArticle.publishedAt,
      id
    );
    
    // Обновляем теги, если они указаны
    if (article.tags !== undefined) {
      // Удаляем старые теги
      db.prepare(`DELETE FROM article_tags WHERE articleId = ?`).run(id);
      
      // Добавляем новые теги
      if (article.tags.length > 0) {
        const tagStmt = db.prepare(`
          INSERT INTO article_tags (articleId, tag)
          VALUES (?, ?)
        `);
        
        for (const tag of article.tags) {
          tagStmt.run(id, tag);
        }
      }
    }
    
    return articlesAPI.getById(id);
  },

  /**
   * Удалить статью
   */
  delete: (id: string): boolean => {
    try {
      // Получаем данные статьи перед удалением
      const article = articlesAPI.getById(id);
      if (!article) {
        return false;
      }

      // Удаляем обложку статьи, если она есть
      if (article.banner) {
        deleteArticleImage(article.banner);
      }

      // Проверяем на наличие встроенных изображений в контенте
      if (article.content) {
        // Ищем все ссылки на изображения в контенте
        const imageRegex = /\/images\/blog\/[^"')]+\.(jpg|jpeg|png|gif|webp)/g;
        const contentImages = article.content.match(imageRegex);
        
        // Удаляем найденные изображения
        if (contentImages && contentImages.length > 0) {
          contentImages.forEach(imagePath => {
            deleteArticleImage(imagePath);
          });
        }
      }

      // Удаляем связанные данные
      db.prepare(`DELETE FROM comments WHERE articleId = ?`).run(id);
      db.prepare(`DELETE FROM article_tags WHERE articleId = ?`).run(id);
      
      // Удаляем статью
      const result = db.prepare(`DELETE FROM articles WHERE id = ?`).run(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Ошибка при удалении статьи (ID: ${id}):`, error);
      return false;
    }
  },

  /**
   * Поиск статей
   */
  search: (query: string, options?: { status?: string, limit?: number, offset?: number }): Article[] => {
    let sqlQuery = `
      SELECT * FROM articles 
      WHERE (title LIKE ? OR content LIKE ?)
    `;
    
    const params: any[] = [`%${query}%`, `%${query}%`];
    
    if (options?.status) {
      sqlQuery += ' AND status = ?';
      params.push(options.status);
    }
    
    sqlQuery += ' ORDER BY createdAt DESC';
    
    if (options?.limit) {
      sqlQuery += ' LIMIT ?';
      params.push(options.limit);
      
      if (options?.offset) {
        sqlQuery += ' OFFSET ?';
        params.push(options.offset);
      }
    }
    
    const articles = db.prepare(sqlQuery).all(...params) as Article[];
    
    // Загружаем теги для статей
    return articles.map(article => {
      return {
        ...article,
        tags: articlesAPI.getArticleTags(article.id),
        author: articlesAPI.getArticleAuthor(article.specialistId)
      };
    });
  },
  
  /**
   * Увеличить счетчик просмотров статьи
   */
  incrementViews: (id: string): boolean => {
    try {
      db.prepare(`
        UPDATE articles
        SET views = views + 1
        WHERE id = ?
      `).run(id);
      
      return true;
    } catch (error) {
      console.error('Ошибка при увеличении счетчика просмотров:', error);
      return false;
    }
  },
  
  /**
   * Получить статьи по категории
   */
  getByCategory: (category: string, options?: { status?: string, limit?: number, offset?: number }): Article[] => {
    let query = 'SELECT * FROM articles WHERE category = ?';
    const params: any[] = [category];
    
    if (options?.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
      
      if (options?.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }
    
    const articles = db.prepare(query).all(...params) as Article[];
    
    // Загружаем теги для статей
    return articles.map(article => {
      return {
        ...article,
        tags: articlesAPI.getArticleTags(article.id),
        author: articlesAPI.getArticleAuthor(article.specialistId)
      };
    });
  },
  
  /**
   * Получить статьи по специалисту
   */
  getBySpecialistId: (specialistId: string, options?: { status?: string, limit?: number, offset?: number }): Article[] => {
    let query = 'SELECT * FROM articles WHERE specialistId = ?';
    const params: any[] = [specialistId];
    
    if (options?.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
      
      if (options?.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }
    
    const articles = db.prepare(query).all(...params) as Article[];
    
    // Загружаем теги для статей
    return articles.map(article => {
      return {
        ...article,
        tags: articlesAPI.getArticleTags(article.id),
        author: articlesAPI.getArticleAuthor(article.specialistId)
      };
    });
  }
};

// Функция для удаления изображения статьи
function deleteArticleImage(imagePath: string): boolean {
  try {
    if (!imagePath) {
      console.log(`[deleteArticleImage] Путь к изображению не указан`);
      return false;
    }
    
    if (imagePath.startsWith('http') || imagePath.includes('placeholder')) {
      console.log(`[deleteArticleImage] Пропуск внешнего изображения или плейсхолдера: ${imagePath}`);
      return false; // Пропускаем внешние изображения и плейсхолдеры
    }
    
    // Нормализуем путь (убираем начальный слеш, если есть)
    const normalizedPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    // Преобразуем URL в путь к файлу
    const filePath = path.join(process.cwd(), 'public', normalizedPath);
    
    console.log(`[deleteArticleImage] Попытка удаления файла: ${filePath}`);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.warn(`[deleteArticleImage] Файл для удаления не найден: ${filePath}`);
    } else {
      // Удаляем файл
      fs.unlinkSync(filePath);
      console.log(`[deleteArticleImage] Файл статьи успешно удален: ${filePath}`);
    }
    
    // Проверяем и удаляем WebP версию, если она может существовать
    const webpPath = normalizedPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    if (webpPath !== normalizedPath) {
      const webpFilePath = path.join(process.cwd(), 'public', webpPath);
      console.log(`[deleteArticleImage] Проверка наличия WebP версии: ${webpFilePath}`);
      
      if (fs.existsSync(webpFilePath)) {
        fs.unlinkSync(webpFilePath);
        console.log(`[deleteArticleImage] WebP версия файла успешно удалена: ${webpFilePath}`);
      }
    }
    
    // Проверяем и удаляем миниатюры, если они могут существовать
    const thumbPath = normalizedPath.replace(/(\.[^.]+)$/, '-thumb$1');
    const thumbFilePath = path.join(process.cwd(), 'public', thumbPath);
    console.log(`[deleteArticleImage] Проверка наличия миниатюры: ${thumbFilePath}`);
    
    if (fs.existsSync(thumbFilePath)) {
      fs.unlinkSync(thumbFilePath);
      console.log(`[deleteArticleImage] Миниатюра файла успешно удалена: ${thumbFilePath}`);
    }
    
    // Проверяем и удаляем WebP версию миниатюры
    const thumbWebpPath = thumbPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    if (thumbWebpPath !== thumbPath) {
      const thumbWebpFilePath = path.join(process.cwd(), 'public', thumbWebpPath);
      console.log(`[deleteArticleImage] Проверка наличия WebP версии миниатюры: ${thumbWebpFilePath}`);
      
      if (fs.existsSync(thumbWebpFilePath)) {
        fs.unlinkSync(thumbWebpFilePath);
        console.log(`[deleteArticleImage] WebP версия миниатюры успешно удалена: ${thumbWebpFilePath}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[deleteArticleImage] Ошибка при удалении изображения статьи:', error);
    return false;
  }
} 