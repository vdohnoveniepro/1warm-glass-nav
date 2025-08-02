import { articlesAPI, Article } from '../api/articles';

/**
 * Адаптер для совместимости старого API статей с SQLite
 */
export const articlesAdapter = {
  /**
   * Получить все статьи
   */
  getAll: (options?: { status?: string, limit?: number, offset?: number }): Article[] => {
    return articlesAPI.getAll(options);
  },
  
  /**
   * Получить опубликованные статьи
   */
  getPublished: (limit?: number, offset?: number): Article[] => {
    return articlesAPI.getAll({ status: 'published', limit, offset });
  },
  
  /**
   * Получить статью по ID
   */
  getById: (id: string): Article | null => {
    return articlesAPI.getById(id);
  },
  
  /**
   * Получить статью по slug
   */
  getBySlug: (slug: string): Article | null => {
    return articlesAPI.getBySlug(slug);
  },
  
  /**
   * Создать новую статью
   */
  create: (data: any): Article => {
    // Преобразуем данные в формат для нового API
    const article: Partial<Article> = {
      title: data.title || '',
      slug: data.slug || null,
      banner: data.banner || null,
      content: data.content || null,
      excerpt: data.excerpt || null,
      category: data.category || null,
      specialistId: data.specialistId || data.author?.id || null,
      status: data.status || 'draft',
      views: data.views || 0,
      tags: data.tags || []
    };
    
    return articlesAPI.create(article);
  },
  
  /**
   * Обновить статью
   */
  update: (id: string, data: any): Article | null => {
    // Получаем текущую статью
    const currentArticle = articlesAPI.getById(id);
    if (!currentArticle) {
      return null;
    }
    
    // Преобразуем данные в формат для нового API
    const article: Partial<Article> = {};
    
    // Обновляем только предоставленные поля
    if (data.title !== undefined) article.title = data.title;
    if (data.slug !== undefined) article.slug = data.slug;
    if (data.banner !== undefined) article.banner = data.banner;
    if (data.content !== undefined) article.content = data.content;
    if (data.excerpt !== undefined) article.excerpt = data.excerpt;
    if (data.category !== undefined) article.category = data.category;
    if (data.specialistId !== undefined) article.specialistId = data.specialistId;
    if (data.author?.id !== undefined && !data.specialistId) article.specialistId = data.author.id;
    if (data.status !== undefined) article.status = data.status;
    if (data.views !== undefined) article.views = data.views;
    if (data.tags !== undefined) article.tags = data.tags;
    
    return articlesAPI.update(id, article);
  },
  
  /**
   * Удалить статью
   */
  delete: (id: string): boolean => {
    return articlesAPI.delete(id);
  },
  
  /**
   * Поиск статей
   */
  search: (query: string, options?: { status?: string, limit?: number, offset?: number }): Article[] => {
    return articlesAPI.search(query, options);
  },
  
  /**
   * Увеличить счетчик просмотров статьи
   */
  incrementViews: (id: string): boolean => {
    return articlesAPI.incrementViews(id);
  },
  
  /**
   * Получить статьи по категории
   */
  getByCategory: (category: string, options?: { status?: string, limit?: number, offset?: number }): Article[] => {
    return articlesAPI.getByCategory(category, options);
  },
  
  /**
   * Получить статьи по специалисту
   */
  getBySpecialistId: (specialistId: string, options?: { status?: string, limit?: number, offset?: number }): Article[] => {
    return articlesAPI.getBySpecialistId(specialistId, options);
  }
}; 