import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { getCurrentUser } from '@/lib/auth';
import { normalizeUserRoles } from '@/database/api/users';

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

// GET-запрос для получения списка всех пользователей
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Начало обработки запроса на получение списка всех пользователей');
    
    // Проверка авторизации
    const currentUser = await getCurrentUser();
    if (!currentUser || !isUserAdmin(currentUser)) {
      console.log('[API] Отказано в доступе: пользователь не авторизован или не является администратором');
      return NextResponse.json(
        { success: false, message: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    console.log('[API] Авторизация успешна, получаем список пользователей');

    try {
      // Напрямую выполняем запрос к базе данных SQLite
      const sql = `
        SELECT id, email, firstName, lastName, role, roles, photo, avatar, telegramId
        FROM users 
        ORDER BY createdAt DESC
      `;
      
      console.log(`[API] SQL запрос: ${sql}`);
      
      // Выполняем запрос
      const stmt = db.prepare(sql);
      const users = stmt.all();
      
      console.log(`[API] Найдено пользователей: ${users.length}`);
      
      // Преобразуем пользователей для ответа (удаляем пароли и нормализуем роли)
      const usersForResponse = users.map(user => {
        // Создаем копию пользователя без пароля
        const { password, ...userWithoutPassword } = user as any;
        
        // Нормализуем роли пользователя
        const roles = normalizeUserRoles(user);
        
        // Объединяем фото из разных полей
        const photo = user.photo || user.avatar || null;
        
        return {
          ...userWithoutPassword,
          roles,
          photo
        };
      });
      
      // Возвращаем результаты
      return NextResponse.json({
        success: true,
        data: {
          users: usersForResponse,
          total: users.length
        }
      });
    } catch (dbError) {
      console.error('[API] Ошибка при выполнении запроса к базе данных:', dbError);
      return NextResponse.json(
        { success: false, message: 'Ошибка при получении данных из базы данных' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Ошибка при получении списка пользователей:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 