import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/models/types';
import { db } from '@/database/db';
import { getCurrentUser } from '@/lib/auth';

// Функция для проверки прав администратора
function isUserAdmin(user: any): boolean {
  if (!user) return false;
  
  // Проверяем email для специального пользователя
  if (user.email === 'bakeevd@yandex.ru') return true;
  
  // Проверяем роль в верхнем регистре
  if (typeof user.role === 'string' && user.role.toUpperCase() === 'ADMIN') return true;
  
  // Проверяем роль в нижнем регистре
  if (typeof user.role === 'string' && user.role.toLowerCase() === 'admin') return true;
  
  // Проверяем массив ролей
  if (Array.isArray(user.roles) && user.roles.some((role: string) => role.toLowerCase() === 'admin')) return true;
  
  // Проверяем, если роль - это объект с полем name
  if (user.role && typeof user.role === 'object' && user.role.name && 
      (user.role.name.toUpperCase() === 'ADMIN' || user.role.name.toLowerCase() === 'admin')) return true;
  
  return false;
}

export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Проверка прав администратора с использованием функции isUserAdmin
    if (!isUserAdmin(user)) {
      console.log('[API admin/stats] Доступ запрещен для пользователя:', { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        roles: user.roles 
      });
      
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Недостаточно прав'
      }, { status: 403 });
    }

    // Отладка - получаем все различные значения ролей
    console.log('Отладка ролей: Получаем все роли в системе...');
    const rolesResult = db.prepare('SELECT DISTINCT role FROM users').all();
    console.log('Существующие роли в системе:', rolesResult);
    
    // Отладка - выводим информацию о текущем пользователе
    console.log('[API admin/stats] Пользователь авторизован как админ:', {
      id: user.id,
      email: user.email,
      role: user.role,
      roles: user.roles
    });

    // Количество пользователей
    const usersResult = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const users = usersResult ? (usersResult as { count: number }).count : 0;
    
    // Количество специалистов - берем из таблицы specialists
    const specialistsResult = db.prepare('SELECT COUNT(*) as count FROM specialists').get();
    const specialists = specialistsResult ? (specialistsResult as { count: number }).count : 0;
    console.log('Количество специалистов из таблицы specialists:', specialists);
    
    // Количество услуг
    const servicesResult = db.prepare('SELECT COUNT(*) as count FROM services WHERE isArchived = 0').get();
    const services = servicesResult ? (servicesResult as { count: number }).count : 0;
    
    // Количество архивных услуг для отладки
    const archivedServicesResult = db.prepare('SELECT COUNT(*) as count FROM services WHERE isArchived = 1').get();
    const archivedServices = archivedServicesResult ? (archivedServicesResult as { count: number }).count : 0;
    console.log('Количество услуг: активных =', services, ', архивных =', archivedServices);
    
    // Количество статей
    const articlesResult = db.prepare('SELECT COUNT(*) as count FROM articles').get();
    const articles = articlesResult ? (articlesResult as { count: number }).count : 0;
    
    // Количество записей
    const appointmentsResult = db.prepare('SELECT COUNT(*) as count FROM appointments').get();
    const appointments = appointmentsResult ? (appointmentsResult as { count: number }).count : 0;
    
    // Количество отзывов
    const reviewsResult = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
    const reviews = reviewsResult ? (reviewsResult as { count: number }).count : 0;

    const stats = {
      users,
      specialists,
      services,
      articles,
      appointments,
      reviews
    };

    console.log('Статистика сайта:', stats);

    return NextResponse.json<ApiResponse<{ stats: typeof stats }>>({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при получении статистики',
    }, { status: 500 });
  }
} 