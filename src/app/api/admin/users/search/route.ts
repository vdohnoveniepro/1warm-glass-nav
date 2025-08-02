import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/database/db';
import { normalizeUserRoles } from '@/database/api/users';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles?: string[];
  photo?: string;
  avatar?: string;
  telegramId?: string;
  specialistId?: string;
}

// GET-запрос для поиска пользователей
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Начало обработки запроса на поиск пользователей');
    
    // Проверка авторизации
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('[API] Отказано в доступе: пользователь не авторизован или не является администратором');
      return NextResponse.json(
        { success: false, message: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || '').toLowerCase();
    const role = searchParams.get('role') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    console.log(`[API] Поиск пользователей: запрос="${query}", роль="${role}", лимит=${limit}, страница=${page}`);

    try {
      // Напрямую выполняем запрос к базе данных SQLite
      let sql = `
        SELECT id, email, firstName, lastName, role, roles, photo, avatar, telegramId, specialistId
        FROM users 
        WHERE 1=1
      `;
      
      const params = [];
      
      // Добавляем условие поиска, если указан запрос
      if (query) {
        sql += `
          AND (
            LOWER(email) LIKE ? OR 
            LOWER(firstName) LIKE ? OR 
            LOWER(lastName) LIKE ? OR
            LOWER(firstName || ' ' || lastName) LIKE ?
          )
        `;
        const likeQuery = `%${query}%`;
        params.push(likeQuery, likeQuery, likeQuery, likeQuery);
      }
      
      // Добавляем условие по роли, если указана
      if (role) {
        sql += ` AND (LOWER(role) = ? OR roles LIKE ?)`;
        params.push(role.toLowerCase(), `%${role.toLowerCase()}%`);
      }
      
      // Добавляем сортировку и пагинацию
      sql += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
      params.push(limit, (page - 1) * limit);
      
      console.log(`[API] SQL запрос: ${sql}`);
      console.log(`[API] Параметры: ${params.join(', ')}`);
      
      // Выполняем запрос
      const stmt = db.prepare(sql);
      const users = stmt.all(...params) as User[];
      
      console.log(`[API] Найдено пользователей: ${users.length}`);
      
      // Получаем общее количество пользователей для пагинации
      let countSql = `
        SELECT COUNT(*) as total
        FROM users 
        WHERE 1=1
      `;
      
      const countParams = [];
      
      // Добавляем условие поиска, если указан запрос
      if (query) {
        countSql += `
          AND (
            LOWER(email) LIKE ? OR 
            LOWER(firstName) LIKE ? OR 
            LOWER(lastName) LIKE ? OR
            LOWER(firstName || ' ' || lastName) LIKE ?
          )
        `;
        const likeQuery = `%${query}%`;
        countParams.push(likeQuery, likeQuery, likeQuery, likeQuery);
      }
      
      // Добавляем условие по роли, если указана
      if (role) {
        countSql += ` AND (LOWER(role) = ? OR roles LIKE ?)`;
        countParams.push(role.toLowerCase(), `%${role.toLowerCase()}%`);
      }
      
      const countStmt = db.prepare(countSql);
      const countResult = countStmt.get(...countParams) as { total: number };
      const total = countResult?.total || 0;
      
      console.log(`[API] Всего пользователей: ${total}`);
      
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
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
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
    console.error('[API] Ошибка при поиске пользователей:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 