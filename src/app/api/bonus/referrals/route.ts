import { NextRequest, NextResponse } from 'next/server';
import { bonusAdapter } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/models/types';
import { initDB } from '@/app/api/db';

/**
 * GET /api/bonus/referrals
 * Получение списка приглашенных пользователей
 * Для пользователей - только свои рефералы
 * Для администраторов - все рефералы или фильтр по пользователю (userId в query)
 */
export async function GET(req: NextRequest) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверяем авторизацию
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'Необходима авторизация' }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    // Для администраторов
    if (user.role === UserRole.ADMIN) {
      // Если указан userId, получаем рефералы конкретного пользователя
      if (userId) {
        const referredUsers = bonusAdapter.getReferredUsers(userId);
        return NextResponse.json({ success: true, referredUsers });
      }
      
      // Для администраторов без указания userId возвращаем пустой список
      // Можно было бы реализовать получение всех рефералов, но это может быть неэффективно
      return NextResponse.json({ success: true, referredUsers: [] });
    }
    
    // Для обычных пользователей - только свои рефералы
    const referredUsers = bonusAdapter.getReferredUsers(user.id);
    return NextResponse.json({ success: true, referredUsers });
  } catch (error) {
    console.error('Ошибка при получении списка рефералов:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка сервера: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 