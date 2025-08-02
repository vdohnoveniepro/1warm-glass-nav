import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/database/db';
import { usersAdapter } from '@/database/adapters';
import { initDB } from '@/app/api/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { JWT_SECRET_STRING } from '@/lib/constants';

// Параметры запроса
interface FavoriteParams {
  params: {
    id: string;
  };
}

// Интерфейс для избранного
interface UserFavorites {
  articles: string[];
  services: string[];
  specialists: string[];
}

// Вспомогательная функция для получения пользователя из токена напрямую
async function getUserFromToken(request: NextRequest) {
  try {
    // Получаем токен из куки
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('auth_token');
    const clientAuthCookie = cookieStore.get('client_auth_token');
    const token = authCookie?.value || clientAuthCookie?.value;
    
    if (!token) {
      console.log('[getUserFromToken] Токен не найден в куки');
      return null;
    }
    
    // Декодируем токен
    const decoded = jwt.verify(token, JWT_SECRET_STRING) as { user?: { id: string; email: string } } | { id: string; email: string };
    
    // Определяем ID пользователя из токена
    const userId = decoded.user ? decoded.user.id : (decoded as any).id;
    
    if (!userId) {
      console.log('[getUserFromToken] ID пользователя не найден в токене');
      return null;
    }
    
    // Получаем пользователя из базы данных
    try {
      // Инициализируем базу данных, если это необходимо
      initDB();
      
      // Используем правильный способ получения пользователя
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(userId);
      
      if (!user) {
        console.log('[getUserFromToken] Пользователь не найден в базе данных');
        return null;
      }
      
      return user;
    } catch (dbError) {
      console.error('[getUserFromToken] Ошибка при получении пользователя из базы данных:', dbError);
      return null;
    }
  } catch (error) {
    console.error('[getUserFromToken] Ошибка при получении пользователя из токена:', error);
    return null;
  }
}

// POST /api/favorites/services/[id] - Добавить или удалить услугу из избранного
export async function POST(request: NextRequest, { params }: FavoriteParams) {
  try {
    console.log(`[/api/favorites/services] Начало обработки запроса для ID: ${params.id}`);
    
    // Инициализируем базу данных
    initDB();
    
    // Проверка авторизации через стандартную функцию
    const { user: authUser, error } = await getCurrentUser(request);
    
    // Если стандартная функция не сработала, пробуем получить пользователя напрямую из токена
    const user = authUser || await getUserFromToken(request);
    
    if (!user || !user.id) {
      console.log('[/api/favorites/services] Ошибка: пользователь не авторизован', { error, userId: user?.id });
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Проверка ID услуги
    if (!id || typeof id !== 'string') {
      console.log('[/api/favorites/services] Ошибка: некорректный ID услуги');
      return NextResponse.json(
        { success: false, message: 'Некорректный ID услуги' },
        { status: 400 }
      );
    }
    
    // Получаем данные из запроса
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('[/api/favorites/services] Ошибка при парсинге JSON запроса:', error);
      return NextResponse.json(
        { success: false, message: 'Некорректный формат запроса' },
        { status: 400 }
      );
    }
    
    const { action } = body; // 'add' или 'remove'
    
    if (!action || (action !== 'add' && action !== 'remove')) {
      console.log(`[/api/favorites/services] Ошибка: некорректное действие: ${action}`);
      return NextResponse.json(
        { success: false, message: 'Некорректное действие' },
        { status: 400 }
      );
    }
    
    console.log(`[/api/favorites/services] Обработка запроса: ${action} для услуги ${id} от пользователя ${user.id}`);
    
    // Получаем текущего пользователя из базы данных
    const currentUser = usersAdapter.getById(user.id);
    
    if (!currentUser) {
      // Создаем нового пользователя с пустой структурой избранного
      console.log(`[/api/favorites/services] Пользователь ${user.id} не найден в базе данных, создаем пустую структуру избранного`);
      const userFavorites = { articles: [], services: [], specialists: [] };
      const favoritesJson = JSON.stringify(userFavorites);
      
      // Пытаемся обновить пользователя с пустой структурой избранного
      try {
        usersAdapter.update(user.id, { favorites: favoritesJson });
        
        // Если действие - добавление, добавляем услугу
        if (action === 'add') {
          userFavorites.services.push(id);
          const updatedFavoritesJson = JSON.stringify(userFavorites);
          usersAdapter.update(user.id, { favorites: updatedFavoritesJson });
          console.log(`[/api/favorites/services] Добавлена услуга ${id} в избранное для пользователя ${user.id}`);
        }
        
        return NextResponse.json({
          success: true,
          message: action === 'add' ? 'Услуга добавлена в избранное' : 'Операция выполнена',
          data: { 
            isFavorite: action === 'add',
            favorites: userFavorites,
            counts: {
              articlesCount: userFavorites.articles.length,
              servicesCount: userFavorites.services.length,
              specialistsCount: userFavorites.specialists.length,
              total: userFavorites.articles.length + userFavorites.services.length + userFavorites.specialists.length
            }
          }
        });
      } catch (error) {
        console.error('[/api/favorites/services] Ошибка при создании структуры избранного:', error);
        return NextResponse.json(
          { success: false, message: 'Ошибка при обновлении избранного' },
          { status: 500 }
        );
      }
    }
    
    // Проверяем существование услуги
    try {
      const service = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
      if (!service) {
        console.log(`[/api/favorites/services] Услуга ${id} не найдена в базе данных`);
        return NextResponse.json(
          { success: false, message: 'Услуга не найдена' },
          { status: 404 }
        );
      }
      console.log(`[/api/favorites/services] Услуга ${id} найдена: ${service.title}`);
    } catch (error) {
      console.error(`[/api/favorites/services] Ошибка при проверке существования услуги ${id}:`, error);
      // Продолжаем выполнение, даже если не смогли проверить услугу
    }
    
    // Обрабатываем избранное пользователя
    let userFavorites: UserFavorites = { articles: [], services: [], specialists: [] };
    
    // Если избранное существует, обрабатываем его
    if (currentUser.favorites) {
      // Если избранное - строка, пробуем распарсить JSON
      if (typeof currentUser.favorites === 'string') {
        try {
          userFavorites = JSON.parse(currentUser.favorites);
          console.log(`[/api/favorites/services] Успешно распарсили JSON избранного для пользователя ${user.id}`);
        } catch (error) {
          console.error('[/api/favorites/services] Ошибка при парсинге JSON избранного:', error);
          // Если ошибка парсинга, используем пустую структуру
          userFavorites = { articles: [], services: [], specialists: [] };
        }
      } 
      // Если избранное - объект, используем его
      else if (typeof currentUser.favorites === 'object') {
        userFavorites = currentUser.favorites as UserFavorites;
        console.log(`[/api/favorites/services] Избранное уже является объектом для пользователя ${user.id}`);
      }
    }
    
    // Проверяем, существуют ли массивы в структуре избранного
    if (!userFavorites.articles) userFavorites.articles = [];
    if (!userFavorites.services) userFavorites.services = [];
    if (!userFavorites.specialists) userFavorites.specialists = [];
    
    // Добавляем или удаляем услугу из избранного
    let statusChanged = false;
    
    if (action === 'add') {
      // Проверяем, не добавлена ли услуга уже в избранное
      if (!userFavorites.services.includes(id)) {
        userFavorites.services.push(id);
        statusChanged = true;
        console.log(`[/api/favorites/services] Добавлена услуга ${id} в избранное для пользователя ${user.id}`);
      } else {
        console.log(`[/api/favorites/services] Услуга ${id} уже в избранном у пользователя ${user.id}`);
      }
    } else {
      // Удаляем услугу из избранного
      const initialLength = userFavorites.services.length;
      userFavorites.services = userFavorites.services.filter(
        serviceId => serviceId !== id
      );
      statusChanged = initialLength !== userFavorites.services.length;
      
      if (statusChanged) {
        console.log(`[/api/favorites/services] Удалена услуга ${id} из избранного для пользователя ${user.id}`);
      } else {
        console.log(`[/api/favorites/services] Услуга ${id} не была найдена в избранном пользователя ${user.id}`);
      }
    }
    
    // Если статус не изменился, возвращаем текущее состояние
    if (!statusChanged) {
      return NextResponse.json({
        success: true,
        message: 'Статус избранного не изменился',
        data: { 
          isFavorite: action === 'add',
          favorites: userFavorites,
          counts: {
            articlesCount: userFavorites.articles.length,
            servicesCount: userFavorites.services.length,
            specialistsCount: userFavorites.specialists.length,
            total: userFavorites.articles.length + userFavorites.services.length + userFavorites.specialists.length
          }
        }
      });
    }
    
    // Преобразуем избранное в JSON строку для сохранения в базе
    const favoritesJson = JSON.stringify(userFavorites);
    
    // Обновляем данные пользователя
    try {
      usersAdapter.update(user.id, { favorites: favoritesJson });
      console.log(`[/api/favorites/services] Избранное обновлено для пользователя ${user.id}, услуг: ${userFavorites.services.length}`);
    } catch (error) {
      console.error('[/api/favorites/services] Ошибка при обновлении избранного в базе данных:', error);
      return NextResponse.json(
        { success: false, message: 'Ошибка при обновлении избранного в базе данных' },
        { status: 500 }
      );
    }
    
    // Считаем общее количество элементов в избранном
    const counts = {
      articlesCount: userFavorites.articles.length,
      servicesCount: userFavorites.services.length,
      specialistsCount: userFavorites.specialists.length,
      total: userFavorites.articles.length + userFavorites.services.length + userFavorites.specialists.length
    };
    
    return NextResponse.json({
      success: true,
      message: action === 'add' ? 'Услуга добавлена в избранное' : 'Услуга удалена из избранного',
      data: { 
        isFavorite: action === 'add',
        favorites: userFavorites,
        counts: counts
      }
    });
  } catch (error) {
    console.error('[/api/favorites/services] Ошибка при обновлении избранного:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
} 