import { NextRequest, NextResponse } from 'next/server';
import { specialistsAPI } from '@/database/api/specialists';
import { usersAdapter } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponse } from '@/models/types';

// Маршрут GET для получения всех специалистов (только для админов)
export async function GET(request: NextRequest) {
  try {
    // Проверяем, что текущий пользователь - админ
    const user = await getCurrentUser();
    
    if (!user || user.role.toUpperCase() !== 'ADMIN') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    // Проверяем, нужно ли получить дубликаты
    const url = new URL(request.url);
    const duplicates = url.searchParams.get('duplicates') === 'true';
    
    if (duplicates) {
      // Получаем список всех специалистов
      const specialists = specialistsAPI.getAll();
      
      // Группируем специалистов по userId
      const userIdToSpecialists = new Map<string, any[]>();
      
      specialists.forEach(specialist => {
        if (specialist.userId) {
          if (!userIdToSpecialists.has(specialist.userId)) {
            userIdToSpecialists.set(specialist.userId, []);
          }
          userIdToSpecialists.get(specialist.userId)!.push(specialist);
        }
      });
      
      // Отфильтровываем пользователей с более чем одним специалистом
      const duplicateEntries = Array.from(userIdToSpecialists.entries())
        .filter(([_, specialistsList]) => specialistsList.length > 1);
      
      // Формируем объект с дубликатами
      const result: { [userId: string]: { user: any; specialists: any[] } } = {};
      
      for (const [userId, specialistsList] of duplicateEntries) {
        const user = usersAdapter.getById(userId);
        if (user) {
          result[userId] = {
            user,
            specialists: specialistsList
          };
        }
      }
      
      return NextResponse.json<ApiResponse<{ duplicates: typeof result }>>(
        { 
          success: true, 
          data: { duplicates: result }
        }
      );
    }
    
    // Получаем список всех специалистов из SQLite
    const specialists = specialistsAPI.getAll();
    
    console.log(`[API] Получено специалистов: ${specialists.length}`);
    
    return NextResponse.json<ApiResponse<any[]>>({
      success: true,
      data: specialists
    });
  } catch (error) {
    console.error('[API] Ошибка при получении списка специалистов:', error);
    
    return NextResponse.json<ApiResponse<null>>(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Произошла ошибка при получении списка специалистов' 
      },
      { status: 500 }
    );
  }
} 