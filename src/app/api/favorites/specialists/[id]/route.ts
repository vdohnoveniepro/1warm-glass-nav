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

// POST /api/favorites/specialists/[id] - Добавить или удалить специалиста из избранного
export async function POST(request: NextRequest, { params }: FavoriteParams) {
  try {
    console.log(`[/api/favorites/specialists] Начало обработки запроса для ID: ${params.id}`);
    
    // Инициализируем базу данных
    initDB();
    
    // Проверка авторизации через стандартную функцию
    const { user: authUser, error } = await getCurrentUser(request);
    
    // Если стандартная функция не сработала, пробуем получить пользователя напрямую из токена
    const user = authUser || await getUserFromToken(request);
    
    if (!user || !user.id) {
      console.log('[/api/favorites/specialists] Ошибка: пользователь не авторизован', { error, userId: user?.id });
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Проверка ID специалиста
    if (!id || typeof id !== 'string') {
      console.log('[/api/favorites/specialists] Ошибка: некорректный ID специалиста');
      return NextResponse.json(
        { success: false, message: 'Некорректный ID специалиста' },
        { status: 400 }
      );
    }
    
    // Получаем данные из запроса
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('[/api/favorites/specialists] Ошибка при парсинге JSON запроса:', error);
      return NextResponse.json(
        { success: false, message: 'Некорректный формат запроса' },
        { status: 400 }
      );
    }
    
    const { action } = body; // 'add' или 'remove'
    
    if (!action || (action !== 'add' && action !== 'remove')) {
      console.log(`[/api/favorites/specialists] Ошибка: некорректное действие: ${action}`);
      return NextResponse.json(
        { success: false, message: 'Некорректное действие' },
        { status: 400 }
      );
    }
    
    console.log(`[/api/favorites/specialists] Обработка запроса: ${action} для специалиста ${id} от пользователя ${user.id}`);
    
    // Получаем текущего пользователя из базы данных
    const currentUser = usersAdapter.getById(user.id);
    
    if (!currentUser) {
      // Создаем нового пользователя с пустой структурой избранного
      console.log(`[/api/favorites/specialists] Пользователь ${user.id} не найден в базе данных, создаем пустую структуру избранного`);
      const userFavorites = { articles: [], services: [], specialists: [] };
      const favoritesJson = JSON.stringify(userFavorites);
      
      // Пытаемся обновить пользователя с пустой структурой избранного
      try {
        usersAdapter.update(user.id, { favorites: favoritesJson });
        
        // Если действие - добавление, добавляем специалиста
        if (action === 'add') {
          userFavorites.specialists.push(id);
          const updatedFavoritesJson = JSON.stringify(userFavorites);
          usersAdapter.update(user.id, { favorites: updatedFavoritesJson });
          console.log(`[/api/favorites/specialists] Добавлен специалист ${id} в избранное для пользователя ${user.id}`);
        }
        
        return NextResponse.json({
          success: true,
          message: action === 'add' ? 'Специалист добавлен в избранное' : 'Операция выполнена',
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
        console.error('[/api/favorites/specialists] Ошибка при создании структуры избранного:', error);
        return NextResponse.json(
          { success: false, message: 'Ошибка при обновлении избранного' },
          { status: 500 }
        );
      }
    }
    
    // Проверяем существование специалиста
    try {
      const specialist = db.prepare('SELECT * FROM specialists WHERE id = ?').get(id);
      if (!specialist) {
        console.log(`[/api/favorites/specialists] Специалист ${id} не найден в базе данных`);
        return NextResponse.json(
          { success: false, message: 'Специалист не найден' },
          { status: 404 }
        );
      }
      console.log(`[/api/favorites/specialists] Специалист ${id} найден: ${specialist.firstName} ${specialist.lastName}`);
    } catch (error) {
      console.error(`[/api/favorites/specialists] Ошибка при проверке существования специалиста ${id}:`, error);
      // Продолжаем выполнение, даже если не смогли проверить специалиста
    }
    
    // Обрабатываем избранное пользователя
    let userFavorites: UserFavorites = { articles: [], services: [], specialists: [] };
    
    // Если избранное существует, обрабатываем его
    if (currentUser.favorites) {
      // Если избранное - строка, пробуем распарсить JSON
      if (typeof currentUser.favorites === 'string') {
        try {
          userFavorites = JSON.parse(currentUser.favorites);
          console.log(`[/api/favorites/specialists] Успешно распарсили JSON избранного для пользователя ${user.id}`);
        } catch (error) {
          console.error('[/api/favorites/specialists] Ошибка при парсинге JSON избранного:', error);
          // Если ошибка парсинга, используем пустую структуру
          userFavorites = { articles: [], services: [], specialists: [] };
        }
      } 
      // Если избранное - объект, используем его
      else if (typeof currentUser.favorites === 'object') {
        userFavorites = currentUser.favorites as UserFavorites;
        console.log(`[/api/favorites/specialists] Избранное уже является объектом для пользователя ${user.id}`);
      }
    }
    
    // Проверяем, существуют ли массивы в структуре избранного
    if (!userFavorites.articles) userFavorites.articles = [];
    if (!userFavorites.services) userFavorites.services = [];
    if (!userFavorites.specialists) userFavorites.specialists = [];
    
    // Добавляем или удаляем специалиста из избранного
    let statusChanged = false;
    
    if (action === 'add') {
      // Проверяем, не добавлен ли специалист уже в избранное
      if (!userFavorites.specialists.includes(id)) {
        userFavorites.specialists.push(id);
        statusChanged = true;
        console.log(`[/api/favorites/specialists] Добавлен специалист ${id} в избранное для пользователя ${user.id}`);
      } else {
        console.log(`[/api/favorites/specialists] Специалист ${id} уже в избранном у пользователя ${user.id}`);
      }
    } else {
      // Удаляем специалиста из избранного
      const initialLength = userFavorites.specialists.length;
      userFavorites.specialists = userFavorites.specialists.filter(
        specialistId => specialistId !== id
      );
      statusChanged = initialLength !== userFavorites.specialists.length;
      
      if (statusChanged) {
        console.log(`[/api/favorites/specialists] Удален специалист ${id} из избранного для пользователя ${user.id}`);
      } else {
        console.log(`[/api/favorites/specialists] Специалист ${id} не был найден в избранном пользователя ${user.id}`);
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
      console.log(`[/api/favorites/specialists] Избранное обновлено для пользователя ${user.id}, специалистов: ${userFavorites.specialists.length}`);
    } catch (error) {
      console.error('[/api/favorites/specialists] Ошибка при обновлении избранного в базе данных:', error);
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
      message: action === 'add' ? 'Специалист добавлен в избранное' : 'Специалист удален из избранного',
      data: { 
        isFavorite: action === 'add',
        favorites: userFavorites,
        counts: counts
      }
    });
  } catch (error) {
    console.error('[/api/favorites/specialists] Ошибка при обновлении избранного:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
} 