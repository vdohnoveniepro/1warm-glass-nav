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

// Обработчик GET запросов (получение статьи по ID)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const id = params.id;
  console.log(`[GET /api/articles/${id}/public] Запрос статьи по ID: ${id}`);
  
  try {
    // Загружаем статью с помощью API
    const article = articlesAPI.getById(id);
    
    // Если статья не найдена, возвращаем ошибку 404
    if (!article) {
      console.log(`[GET /api/articles/${id}/public] Статья не найдена`);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Статья не найдена'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    // Проверяем, что статья опубликована
    if (article.status !== 'published') {
      console.log(`[GET /api/articles/${id}/public] Статья не опубликована`);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Статья не опубликована'
      };
      
      return NextResponse.json(response, { status: 403 });
    }
    
    console.log(`[GET /api/articles/${id}/public] Статья найдена: ${article.title}`);
    
    // Увеличиваем счетчик просмотров и сохраняем
    article.views += 1;
    articlesAPI.update(id, { views: article.views });
    
    // Преобразуем категорию если необходимо
    if (article.category) {
      article.category = formatCategory(article.category);
    }
    
    // Формируем ответ
    const response: ApiResponse<any> = {
      success: true,
      data: article
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error(`[GET /api/articles/${id}/public] Ошибка при получении статьи:`, error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Ошибка при получении статьи'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 