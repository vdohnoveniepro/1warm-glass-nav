import { NextRequest, NextResponse } from 'next/server';
import { migrateData, getDebugInfo } from '@/database/migration';
import { UserRole } from '@/models/types';
import { getCurrentUser } from '@/lib/auth';

// POST /api/admin/database/migrate - запуск миграции данных из JSON в SQLite
export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию и права администратора
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, message: 'Необходимы права администратора' },
        { status: 403 }
      );
    }
    
    // Запускаем миграцию
    console.log('Запуск миграции данных из JSON в SQLite...');
    const migrationSuccess = await migrateData();
    
    // Получаем отладочную информацию
    const debugInfo = getDebugInfo();
    
    if (migrationSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Миграция данных успешно завершена',
        debugInfo
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Произошла ошибка при миграции данных',
        debugInfo
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ошибка при запуске миграции:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Ошибка сервера при миграции данных',
        error: `${error}`
      },
      { status: 500 }
    );
  }
} 