import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { initDB, db } from '@/app/api/db';
import { getCurrentUser } from '@/lib/auth';
import { DBUser, UserFavorites } from '@/models/types';

// Интерфейс для данных из базы
interface DBUser {
  id: string;
  favorites?: string | UserFavorites;
}

// Интерфейс для избранного
interface UserFavorites {
  articles: string[];
  services: string[];
  specialists: string[];
}

// GET /api/auth/me/favorites - получить количество избранных элементов текущего пользователя
export async function GET(request: NextRequest) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверка авторизации
    const { user, error } = await getCurrentUser(request);
    if (!user || !user.id) {
      console.log('[/api/auth/me/favorites] Ошибка: пользователь не авторизован', { error });
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    console.log(`[/api/auth/me/favorites] Запрос избранного для пользователя: ${user.id}`);

    // Получаем пользователя из базы данных
    const query = 'SELECT id, favorites FROM users WHERE id = ?';
    console.log(`[/api/auth/me/favorites] Выполняем запрос: ${query} с параметром ${user.id}`);
    
    const users = db.prepare(query).all(user.id) as DBUser[];
    
    console.log(`[/api/auth/me/favorites] Результат запроса: найдено ${users.length} записей`);
    
    // Если пользователь не найден, возвращаем пустую структуру избранного
    if (users.length === 0) {
      console.log(`[/api/auth/me/favorites] Пользователь ${user.id} не найден в базе данных, возвращаем пустую структуру`);
      const emptyFavorites = { articles: [], services: [], specialists: [] };
      return NextResponse.json({
        success: true,
        data: {
          favorites: emptyFavorites,
          articles: [],
          services: [],
          specialists: [],
          articlesCount: 0,
          servicesCount: 0,
          specialistsCount: 0,
          total: 0,
          counts: {
            articlesCount: 0,
            servicesCount: 0,
            specialistsCount: 0,
            total: 0
          }
        }
      });
    }
    
    const currentUser = users[0];
    let userFavorites: UserFavorites = { articles: [], services: [], specialists: [] };
    
    // Парсим JSON из базы данных
    if (currentUser.favorites) {
      try {
        if (typeof currentUser.favorites === 'string') {
          userFavorites = JSON.parse(currentUser.favorites);
        } else if (typeof currentUser.favorites === 'object') {
          userFavorites = currentUser.favorites as UserFavorites;
        }
        
        // Проверяем структуру и устанавливаем значения по умолчанию, если нужно
        userFavorites.articles = Array.isArray(userFavorites.articles) ? userFavorites.articles : [];
        userFavorites.services = Array.isArray(userFavorites.services) ? userFavorites.services : [];
        userFavorites.specialists = Array.isArray(userFavorites.specialists) ? userFavorites.specialists : [];
      } catch (error) {
        console.error('[/api/auth/me/favorites] Ошибка при парсинге JSON избранного:', error);
      }
    }
    
    // Считаем количество элементов в избранном
    const articlesCount = userFavorites.articles ? userFavorites.articles.length : 0;
    const servicesCount = userFavorites.services ? userFavorites.services.length : 0;
    const specialistsCount = userFavorites.specialists ? userFavorites.specialists.length : 0;
    const total = articlesCount + servicesCount + specialistsCount;
    
    console.log(`[/api/auth/me/favorites] Количество элементов в избранном: статьи=${articlesCount}, услуги=${servicesCount}, специалисты=${specialistsCount}, всего=${total}`);
    
    return NextResponse.json({
      success: true,
      data: {
        favorites: userFavorites,
        articles: userFavorites.articles,
        services: userFavorites.services,
        specialists: userFavorites.specialists,
        articlesCount,
        servicesCount,
        specialistsCount,
        total,
        counts: {
          articlesCount,
          servicesCount,
          specialistsCount,
          total
        }
      }
    });
  } catch (error) {
    console.error('[/api/auth/me/favorites] Ошибка при получении избранного:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

// PUT /api/auth/me/favorites - обновить избранное пользователя (например, для миграции)
export async function PUT(request: NextRequest) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверка авторизации
    const { user, error } = await getCurrentUser(request);
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    
    // Получаем данные из запроса
    const body = await request.json();
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Некорректные данные' },
        { status: 400 }
      );
    }
    
    // Формируем структуру избранного
    const favorites: UserFavorites = {
      articles: Array.isArray(body.articles) ? body.articles : [],
      services: Array.isArray(body.services) ? body.services : [],
      specialists: Array.isArray(body.specialists) ? body.specialists : []
    };
    
    // Преобразуем в JSON-строку для хранения в SQLite
    const favoritesJson = JSON.stringify(favorites);
    
    // Обновляем избранное в базе данных
    const result = db.prepare('UPDATE users SET favorites = ? WHERE id = ?').run(favoritesJson, user.id);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, message: 'Не удалось обновить избранное' },
        { status: 500 }
      );
    }
    
    // Считаем общее количество избранных элементов
    const articlesCount = favorites.articles.length;
    const servicesCount = favorites.services.length;
    const specialistsCount = favorites.specialists.length;
    const total = articlesCount + servicesCount + specialistsCount;
    
    return NextResponse.json({
      success: true,
      message: 'Избранное успешно обновлено',
      data: {
        favorites: favorites,
        articles: favorites.articles,
        services: favorites.services,
        specialists: favorites.specialists,
        articlesCount,
        servicesCount,
        specialistsCount,
        total,
        counts: {
          articlesCount,
          servicesCount,
          specialistsCount,
          total
        }
      }
    });
  } catch (error) {
    console.error('Ошибка при обновлении избранного:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера', error: String(error) },
      { status: 500 }
    );
  }
} 