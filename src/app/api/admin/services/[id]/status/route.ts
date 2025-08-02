import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { servicesAPI } from '@/lib/api';
import { ApiResponse } from '@/types/api';

/**
 * Обработчик запроса PATCH для обновления статуса архивации услуги
 * @route PATCH /api/admin/services/:id/status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Проверяем авторизацию пользователя
  const user = await getCurrentUser();
  
  // Логируем результат авторизации
  console.log('Авторизация:', user ? 'Успешно' : 'Неуспешно');
  
  // Если пользователь не авторизован или не является администратором
  if (!user || user.role !== 'admin') {
    console.error('Попытка несанкционированного доступа к API обновления статуса услуги');
    return NextResponse.json<ApiResponse>({
      success: false,
      message: 'Доступ запрещен. Требуются права администратора.',
    }, { status: 403 });
  }
  
  // Получаем ID услуги из параметров запроса
  const { id } = params;
  
  // Проверяем наличие ID
  if (!id) {
    return NextResponse.json<ApiResponse>({
      success: false,
      message: 'ID услуги не указан',
    }, { status: 400 });
  }
  
  try {
    // Получаем данные из тела запроса
    const body = await request.json();
    const { isArchived } = body;
    
    console.log(`Запрос на изменение статуса услуги ${id}: ${isArchived ? 'В архив' : 'Восстановить'}`);
    
    // Проверяем, что статус определен
    if (isArchived === undefined) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: 'Параметр isArchived не указан',
      }, { status: 400 });
    }
    
    // Проверяем существование услуги
    const existingService = servicesAPI.getById(id);
    if (!existingService) {
      console.error(`Услуга с ID ${id} не найдена при попытке изменить статус`);
      return NextResponse.json<ApiResponse>({
        success: false,
        message: `Услуга с ID ${id} не найдена`,
      }, { status: 404 });
    }
    
    // Обновляем статус услуги через API
    const updatedService = servicesAPI.update(id, { isArchived: isArchived ? 1 : 0 });
    
    // Если услуга не найдена или не удалось обновить
    if (!updatedService) {
      console.error(`Не удалось обновить статус услуги с ID ${id}`);
      return NextResponse.json<ApiResponse>({
        success: false,
        message: `Не удалось обновить статус услуги с ID ${id}`,
      }, { status: 500 });
    }
    
    // Логируем успешное обновление статуса
    console.log(`Статус услуги с ID ${id} успешно обновлен на: ${isArchived ? 'Архивирована' : 'Активна'}`);
    
    // Возвращаем успешный ответ
    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Статус услуги успешно обновлен на: ${isArchived ? 'Архивирована' : 'Активна'}`,
      data: updatedService,
    }, { status: 200 });
    
  } catch (error) {
    // Обрабатываем ошибки
    console.error('Ошибка при обновлении статуса услуги:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: 'Произошла ошибка при обновлении статуса услуги',
    }, { status: 500 });
  }
} 