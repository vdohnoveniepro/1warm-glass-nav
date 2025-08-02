import { NextRequest, NextResponse } from 'next/server';
import { articlesAPI } from '@/lib/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Функция для преобразования технических названий категорий в человекочитаемые
function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'inspiration': 'Вдохновение',
    'вселенская терапия': 'ВсеЛенская терапия',
  };
  
  return categoryMap[category] || category;
}

// Обработчик GET запросов (получение списка статей с фильтрацией)
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    console.log('Получен запрос /api/articles/public');
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const excludeId = searchParams.get('exclude');
    console.log('Параметры запроса:', { category, limit, excludeId });
    
    // Загружаем все статьи с помощью articlesAPI
    const articles = articlesAPI.getAll();
    console.log(`Загружено статей: ${articles.length}`);
    
    // Фильтруем только опубликованные статьи
    let filteredArticles = articles.filter(article => article.status === 'published');
    console.log(`После фильтрации по статусу осталось: ${filteredArticles.length}`);
    
    // Фильтрация по категории, если указана
    if (category) {
      filteredArticles = filteredArticles.filter(article => article.category === category);
      console.log(`После фильтрации по категории осталось: ${filteredArticles.length}`);
    }
    
    // Исключаем статью по ID, если указано
    if (excludeId) {
      filteredArticles = filteredArticles.filter(article => article.id !== excludeId);
      console.log(`После исключения статьи осталось: ${filteredArticles.length}`);
    }
    
    // Сортировка по дате публикации (сначала новые)
    filteredArticles.sort((a, b) => {
      // Обработка случая, когда publishedAt может быть null
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    
    // Ограничиваем количество результатов, если указано
    if (limit && !isNaN(limit)) {
      filteredArticles = filteredArticles.slice(0, limit);
      console.log(`После ограничения лимитом осталось: ${filteredArticles.length}`);
    }
    
    // Формируем объекты статей для публичного API
    const processedArticles = filteredArticles.map(article => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      banner: article.banner,
      image: article.banner,
      category: formatCategory(article.category),
      author: article.author,
      publishedAt: article.publishedAt,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      status: article.status,
      views: article.views,
      tags: article.tags || []
    }));
    
    // Формируем ответ
    const response: ApiResponse<any[]> = {
      success: true,
      data: processedArticles
    };
    
    console.log('Отправляем успешный ответ с данными');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Ошибка при получении статей:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Ошибка при получении статей'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 