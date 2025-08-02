import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { UserRole, ApiResponse } from '@/models/types';
import { appointmentsAdapter, specialistsAdapter } from '@/database/adapters';
import { initDB } from '@/app/api/db';

// Инициализируем базу данных SQLite
initDB();

/**
 * Получение всех записей (только для администратора)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Начало обработки GET /api/admin/appointments');
    
    // Проверка авторизации
    const currentUser = await getCurrentUser();
    console.log('[API] Результат проверки авторизации:', { 
      isAuthorized: !!currentUser,
      role: currentUser?.role, 
      userId: currentUser?.id,
      // Добавляем строковое представление роли для отладки
      roleString: currentUser ? String(currentUser.role) : null
    });
    
    // Если пользователь не авторизован или не является администратором
    if (!currentUser) {
      console.log('[API] Доступ запрещен: пользователь не авторизован');
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Вы не авторизованы' 
      }, { status: 401 });
    }
    
    // Проверяем роль пользователя - должен быть администратором
    // Используем различные варианты проверки для надежности
    const userRole = String(currentUser.role).toLowerCase();
    if (userRole !== 'admin' && userRole !== UserRole.ADMIN.toLowerCase()) {
      console.log('[API] Доступ запрещен: пользователь не является администратором. Роль:', userRole);
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Недостаточно прав для доступа. Требуется роль администратора.' 
      }, { status: 403 });
    }
    
    // Используем appointmentsAdapter для получения всех записей из SQLite
    console.log('[API] Загрузка данных о записях через appointmentsAdapter из SQLite');
    const appointments = appointmentsAdapter.getAll();
    console.log(`[API] Успешно загружено ${appointments.length} записей из SQLite`);

    // Если записей нет, возвращаем пустой массив
    if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
      console.log('[API] Нет данных о записях, возвращаем пустой массив');
      return NextResponse.json<ApiResponse<{ appointments: [] }>>({ 
        success: true, 
        data: { appointments: [] } 
      });
    }
    
    // Печатаем первую запись для отладки
    if (appointments.length > 0) {
      console.log('[API] Пример первой записи:', {
        id: appointments[0].id,
        status: appointments[0].status,
        statusType: typeof appointments[0].status
      });
    }
    
    // Получаем данные о специалистах из базы данных SQLite
    const specialists = specialistsAdapter.getAll();
    console.log(`[API] Загружено специалистов из SQLite: ${specialists.length}`);
    
    // Сортируем по дате в обратном порядке (сначала новые)
    appointments.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Отправляем данные клиенту
    console.log('[API] Отправка успешного ответа с данными о записях');
    return NextResponse.json<ApiResponse<{ appointments: typeof appointments }>>({ 
      success: true, 
      data: { appointments } 
    });
    
  } catch (error) {
    console.error('[API] Ошибка при получении записей:', error);
    return NextResponse.json<ApiResponse<null>>({ 
      success: false, 
      error: 'Произошла ошибка при получении записей' 
    }, { status: 500 });
  }
} 