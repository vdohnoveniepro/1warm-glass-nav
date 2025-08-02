import { NextRequest, NextResponse } from 'next/server';
import { appointmentsAPI } from '@/database/api/appointments';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponse } from '@/models/types';

/**
 * Удаление записи (только для администратора)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка авторизации
    const currentUser = await getCurrentUser();
    console.log('[API Delete] Результат проверки авторизации:', { 
      isAuthorized: !!currentUser,
      role: currentUser?.role,
      roleString: currentUser ? String(currentUser.role) : null
    });
    
    // Если пользователь не авторизован или не является администратором
    if (!currentUser || String(currentUser.role).toLowerCase() !== 'admin') {
      console.log('[API Delete] Доступ запрещен - недостаточно прав');
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Недостаточно прав для доступа' 
      }, { status: 403 });
    }
    
    // Получаем ID записи из URL
    const { id } = params;
    console.log(`[API Delete] Удаление записи ID: ${id}`);
    
    // Проверяем, существует ли запись
    const appointment = appointmentsAPI.getById(id);
    if (!appointment) {
      console.log(`[API Delete] Запись с ID ${id} не найдена`);
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Запись не найдена' 
      }, { status: 404 });
    }
    
    // Удаляем запись
    const success = appointmentsAPI.delete(id);
    
    if (!success) {
      console.log(`[API Delete] Не удалось удалить запись с ID ${id}`);
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Не удалось удалить запись' 
      }, { status: 500 });
    }
    
    console.log(`[API Delete] Запись успешно удалена`);
    
    // Возвращаем результат
    return NextResponse.json<ApiResponse<{ success: boolean }>>({ 
      success: true, 
      data: { success: true }
    });
    
  } catch (error) {
    console.error('[API Delete] Ошибка при удалении записи:', error);
    return NextResponse.json<ApiResponse<null>>({ 
      success: false, 
      error: 'Произошла ошибка при удалении записи' 
    }, { status: 500 });
  }
} 