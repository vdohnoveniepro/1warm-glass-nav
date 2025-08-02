import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { usersAdapter } from '@/database/adapters';
import { initDB } from '@/app/api/db';

// Типы для пользователя
interface UserFavorites {
  articles: string[];
  services: string[];
  specialists: string[];
}

interface DBUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles?: string[];
  phone: string;
  photo?: string;
  specialistId?: string;
  favorites?: UserFavorites | string;
}

// Типы для возвращаемых данных
interface Article {
  id: string;
  [key: string]: any;
}

interface Service {
  id: string;
  [key: string]: any;
}

interface Specialist {
  id: string;
  [key: string]: any;
}

interface UserFavoritesData {
  articles: Article[];
  services: Service[];
  specialists: Specialist[];
}

// GET /api/favorites - Получить все избранные элементы пользователя
export async function GET(request: NextRequest) {
  try {
    console.log('[/api/favorites] Начало обработки запроса');
    
    // Инициализируем базу данных
    initDB();
    
    // Проверка авторизации
    const user = await getCurrentUser();
    if (!user) {
      console.log('[/api/favorites] Ошибка: пользователь не авторизован');
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    console.log(`[/api/favorites] Получаем избранное для пользователя: ${user.id}`);

    // Получаем текущего пользователя из базы данных
    const currentUser = usersAdapter.getById(user.id);
    
    // Если пользователь не найден, вместо ошибки возвращаем пустую структуру избранного
    if (!currentUser) {
      console.log('[/api/favorites] Пользователь не найден в базе данных, возвращаем пустую структуру');
      return NextResponse.json({
        success: true,
        data: {
          articles: [],
          services: [],
          specialists: []
        }
      });
    }
    
    // Проверяем, существует ли структура избранного
    let userFavorites: UserFavorites = { articles: [], services: [], specialists: [] };
    
    if (currentUser.favorites) {
      // Если favorites - это строка, пробуем распарсить JSON
      if (typeof currentUser.favorites === 'string') {
        try {
          userFavorites = JSON.parse(currentUser.favorites);
          // Проверяем структуру и устанавливаем значения по умолчанию, если нужно
          userFavorites.articles = Array.isArray(userFavorites.articles) ? userFavorites.articles : [];
          userFavorites.services = Array.isArray(userFavorites.services) ? userFavorites.services : [];
          userFavorites.specialists = Array.isArray(userFavorites.specialists) ? userFavorites.specialists : [];
        } catch (error) {
          console.error('[/api/favorites] Ошибка при парсинге JSON избранного:', error);
          // Если ошибка парсинга, используем пустую структуру
          userFavorites = { articles: [], services: [], specialists: [] };
        }
      } 
      // Если favorites - это уже объект, используем его
      else if (typeof currentUser.favorites === 'object') {
        const favObj = currentUser.favorites as UserFavorites;
        userFavorites = {
          articles: Array.isArray(favObj.articles) ? favObj.articles : [],
          services: Array.isArray(favObj.services) ? favObj.services : [],
          specialists: Array.isArray(favObj.specialists) ? favObj.specialists : []
        };
      }
    }
    
    console.log('[/api/favorites] Избранное пользователя после обработки:', {
      articlesCount: userFavorites.articles.length,
      servicesCount: userFavorites.services.length,
      specialistsCount: userFavorites.specialists.length
    });
    
    // Получаем все избранные элементы
    const favorites: UserFavoritesData = {
      articles: [],
      services: [],
      specialists: []
    };
    
    // Загружаем избранные статьи
    if (userFavorites.articles && userFavorites.articles.length > 0) {
      try {
      const articleIds = userFavorites.articles;
      console.log(`[/api/favorites] Загрузка ${articleIds.length} статей из избранного`);
      
      const articlesData = await Promise.all(
        articleIds.map(async (id: string) => {
          try {
              if (!id) return null;
            // Используем правильный метод для получения статьи
            const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
            if (article) {
              return article;
            }
            return null;
          } catch (error) {
              console.error(`[/api/favorites] Ошибка при загрузке статьи ${id}:`, error);
            return null;
          }
        })
      );
      favorites.articles = articlesData.filter(Boolean) as Article[];
        console.log(`[/api/favorites] Загружено ${favorites.articles.length} статей из ${articleIds.length}`);
      } catch (error) {
        console.error('[/api/favorites] Ошибка при загрузке статей:', error);
      }
    }
    
    // Загружаем избранные услуги
    if (userFavorites.services && userFavorites.services.length > 0) {
      try {
      const serviceIds = userFavorites.services;
      console.log(`[/api/favorites] Загрузка ${serviceIds.length} услуг из избранного`);
      
      const servicesData = await Promise.all(
        serviceIds.map(async (id: string) => {
          try {
              if (!id) return null;
            // Используем правильный метод для получения услуги
            const service = await db.prepare('SELECT * FROM services WHERE id = ?').get(id);
            if (service) {
              // Проверяем, какие поля изображений доступны
              if (service.image && !service.thumbnail) {
                service.thumbnail = service.image;
              }
              return service;
            }
            return null;
          } catch (error) {
              console.error(`[/api/favorites] Ошибка при загрузке услуги ${id}:`, error);
            return null;
          }
        })
      );
      favorites.services = servicesData.filter(Boolean) as Service[];
        console.log(`[/api/favorites] Загружено ${favorites.services.length} услуг из ${serviceIds.length}`);
      } catch (error) {
        console.error('[/api/favorites] Ошибка при загрузке услуг:', error);
      }
    }
    
    // Загружаем избранных специалистов
    if (userFavorites.specialists && userFavorites.specialists.length > 0) {
      try {
      const specialistIds = userFavorites.specialists;
      console.log(`[/api/favorites] Загрузка ${specialistIds.length} специалистов из избранного`);
      
      const specialistsData = await Promise.all(
        specialistIds.map(async (id: string) => {
          try {
              if (!id) return null;
            // Используем правильный метод для получения специалиста
            const specialist = await db.prepare('SELECT * FROM specialists WHERE id = ?').get(id);
            if (specialist) {
              // Проверяем, какие поля изображений доступны
              if (specialist.avatar && !specialist.photo) {
                specialist.photo = specialist.avatar;
                } else if (specialist.photo && !specialist.avatar) {
                  specialist.avatar = specialist.photo;
              }
              return specialist;
            }
            return null;
          } catch (error) {
              console.error(`[/api/favorites] Ошибка при загрузке специалиста ${id}:`, error);
            return null;
          }
        })
      );
      favorites.specialists = specialistsData.filter(Boolean) as Specialist[];
        console.log(`[/api/favorites] Загружено ${favorites.specialists.length} специалистов из ${specialistIds.length}`);
      } catch (error) {
        console.error('[/api/favorites] Ошибка при загрузке специалистов:', error);
      }
    }
    
    console.log('[/api/favorites] Успешно загружены все избранные элементы');
    return NextResponse.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('[/api/favorites] Ошибка при получении избранного:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
} 