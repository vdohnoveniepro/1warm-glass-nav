import { NextRequest, NextResponse } from 'next/server';
import { appointmentsAPI } from '@/database/api/appointments';
import { getCurrentUser } from '@/lib/auth';
import { specialistsAPI } from '@/database/api/specialists';
import { ApiResponse } from '@/models/types';

/**
 * Обновление статуса записи (только для администратора)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка авторизации
    const currentUser = await getCurrentUser();
    
    // Если пользователь не авторизован или не является администратором
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Недостаточно прав для доступа' 
      }, { status: 403 });
    }
    
    // Получаем ID записи из URL
    const { id } = params;
    
    // Получаем данные из запроса
    const data = await request.json();
    const { status } = data;
    
    // Проверяем наличие статуса
    if (!status) {
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Не указан новый статус' 
      }, { status: 400 });
    }
    
    // Проверяем, существует ли запись
    const appointment = appointmentsAPI.getById(id);
    if (!appointment) {
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Запись не найдена' 
      }, { status: 404 });
    }
    
    // Получаем информацию о специалисте
    const specialist = appointment.specialistId 
      ? specialistsAPI.getById(appointment.specialistId)
      : null;
    
    // Обновляем статус записи
    const updatedAppointment = appointmentsAPI.updateStatus(id, status);
    
    if (!updatedAppointment) {
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Не удалось обновить статус записи' 
      }, { status: 500 });
    }
    
    // Возвращаем результат
    return NextResponse.json<ApiResponse<{ appointment: typeof updatedAppointment }>>({ 
      success: true, 
      data: { appointment: updatedAppointment }
    });
    
  } catch (error) {
    console.error('Ошибка при обновлении статуса записи:', error);
    return NextResponse.json<ApiResponse<null>>({ 
      success: false, 
      error: 'Произошла ошибка при обновлении статуса записи' 
    }, { status: 500 });
  }
} 