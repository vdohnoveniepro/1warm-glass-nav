import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { usersAPI } from '@/lib/api';
import { UserRole } from '@/models/types';

// Маршрут для ручной генерации sitemap.xml
export async function POST() {
  try {
    // Проверка авторизации
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const email = cookieStore.get('user_email')?.value;

    if (!token || !email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Не авторизован' 
      }, { status: 401 });
    }

    // Получение данных пользователя
    const user = await usersAPI.getByEmail(email);
    
    // Проверка роли пользователя
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json({ 
        success: false, 
        message: 'Недостаточно прав для выполнения операции' 
      }, { status: 403 });
    }

    // Вызов генерации sitemap
    const sitemapResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/sitemap.xml`,
      { method: 'GET', cache: 'no-cache' }
    );

    if (!sitemapResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка при генерации sitemap.xml' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sitemap.xml успешно сгенерирован' 
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса генерации sitemap:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
} 