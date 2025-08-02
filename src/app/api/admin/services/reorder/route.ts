import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponse } from '@/types/api';
import { servicesAPI } from '@/lib/api';

export async function PATCH(
  request: Request
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    // Проверяем, что пользователь администратор
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      console.error('[API] PATCH /api/admin/services/reorder: Доступ запрещен. Пользователь не авторизован или не является администратором');
      return NextResponse.json({
        success: false,
        error: 'Доступ запрещен. Вы должны быть авторизованы как администратор.'
      }, { status: 403 });
    }

    // Получаем данные из запроса
    const data = await request.json();

    // Проверяем, что данные являются массивом
    if (!Array.isArray(data)) {
      console.error('[API] PATCH /api/admin/services/reorder: Неверный формат данных. Ожидается массив');
      return NextResponse.json({
        success: false,
        error: 'Неверный формат данных. Ожидается массив объектов со свойствами id и order.'
      }, { status: 400 });
    }

    // Проверяем, что каждый элемент имеет id и order
    for (const item of data) {
      if (!item.id || typeof item.order !== 'number') {
        console.error('[API] PATCH /api/admin/services/reorder: Неверный формат данных. Некоторые элементы не содержат id или order');
        return NextResponse.json({
          success: false,
          error: 'Неверный формат данных. Каждый элемент должен содержать id и order.'
        }, { status: 400 });
      }
    }

    console.log(`[API] PATCH /api/admin/services/reorder: Обновление порядка ${data.length} услуг`);
    
    // Обновляем порядок услуг
    const success = servicesAPI.updateBulkOrders(data);
    
    if (!success) {
      console.error('[API] PATCH /api/admin/services/reorder: Ошибка при обновлении порядка услуг');
      return NextResponse.json({
        success: false,
        error: 'Не удалось обновить порядок услуг. Пожалуйста, попробуйте снова.'
      }, { status: 500 });
    }

    // Получаем обновленный список услуг
    const updatedServices = servicesAPI.getAll();
    
    console.log(`[API] PATCH /api/admin/services/reorder: Порядок услуг успешно обновлен`);
    
    return NextResponse.json({
      success: true,
      data: updatedServices
    });
  } catch (error) {
    console.error('[API] PATCH /api/admin/services/reorder: Внутренняя ошибка сервера', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.'
    }, { status: 500 });
  }
} 