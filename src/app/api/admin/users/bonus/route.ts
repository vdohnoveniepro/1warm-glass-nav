import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/database/db';
import { initDB } from '@/app/api/db';

/**
 * GET /api/admin/users/bonus
 * Получение списка пользователей с информацией о бонусах
 */
export async function GET(request: NextRequest) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверяем авторизацию и права доступа
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      );
    }

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sortBy') || 'id';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Формируем базовый SQL запрос
    let query = `
      SELECT id, firstName, lastName, email, bonusBalance, createdAt
      FROM users
      WHERE (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)
    `;

    // Добавляем сортировку
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // Добавляем пагинацию
    query += ` LIMIT ? OFFSET ?`;

    // Выполняем запрос с параметрами поиска
    const searchParam = `%${search}%`;
    const users = db.prepare(query).all(searchParam, searchParam, searchParam, limit, offset);

    // Считаем общее количество пользователей для пагинации
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)
    `;
    
    const { total } = db.prepare(countQuery).get(searchParam, searchParam, searchParam) as { total: number };

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + users.length < total
        }
      }
    });
  } catch (error) {
    console.error('Ошибка при получении списка пользователей с бонусами:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при получении данных' },
      { status: 500 }
    );
  }
} 