import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { servicesAPI } from '@/lib/api';
import { logAction } from '@/lib/logger';
import { ApiResponse } from '@/types/api';

interface RouteParams {
  params: {
    id: string;
  };
}

// PATCH /api/admin/services/[id]/archive - архивировать/разархивировать услугу
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    // Проверяем авторизацию
    const currentUser = await getCurrentUser();
    const authResult = currentUser ? `Пользователь ${currentUser.id} (${currentUser.role})` : 'Не авторизован';
    console.log(`Запрос на изменение статуса архивации услуги ${params.id}. Авторизация: ${authResult}`);
    
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('Неавторизованная попытка изменить статус архивации услуги', { userId: currentUser?.id });
      return NextResponse.json({
        success: false,
        message: 'Недостаточно прав для выполнения операции'
      } as ApiResponse, { status: 403 });
    }
    
    // Получаем ID услуги из параметров
    const serviceId = params.id;
    
    // Получаем данные из запроса
    const data = await request.json();
    
    // Проверяем наличие необходимых полей
    if (data.isArchived === undefined) {
      return NextResponse.json({
        success: false,
        message: 'Не указан статус архивации услуги'
      } as ApiResponse, { status: 400 });
    }
    
    // Получаем информацию об услуге
    const service = servicesAPI.getById(serviceId);
    if (!service) {
      return NextResponse.json({
        success: false,
        message: 'Услуга не найдена'
      } as ApiResponse, { status: 404 });
    }
    
    // Проверяем, изменился ли статус
    if (service.isArchived === data.isArchived) {
      return NextResponse.json({
        success: true,
        message: `Услуга уже ${data.isArchived ? 'архивирована' : 'активна'}`,
        data: service
      } as ApiResponse);
    }
    
    // Обновляем статус архивации услуги
    const updatedService = servicesAPI.updateStatus(serviceId, data.isArchived);
    
    if (!updatedService) {
      return NextResponse.json({
        success: false,
        message: 'Произошла ошибка при обновлении статуса услуги'
      } as ApiResponse, { status: 500 });
    }
    
    // Логируем действие
    logAction(
      currentUser.id,
      data.isArchived ? 'service_archived' : 'service_unarchived',
      { serviceId, serviceName: updatedService.name }
    );
    
    return NextResponse.json({
      success: true,
      message: data.isArchived ? 'Услуга архивирована' : 'Услуга восстановлена из архива',
      data: updatedService
    } as ApiResponse);
    
  } catch (error) {
    console.error('Ошибка при изменении статуса архивации услуги:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    } as ApiResponse, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    // Проверяем, что пользователь администратор
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      console.error(`[API] POST /api/admin/services/${params.id}/archive: Доступ запрещен. Пользователь не авторизован или не является администратором`);
      return NextResponse.json({
        success: false,
        error: 'Доступ запрещен. Вы должны быть авторизованы как администратор.'
      }, { status: 403 });
    }

    // Получаем ID услуги
    const { id } = params;
    
    if (!id) {
      console.error('[API] POST /api/admin/services/[id]/archive: ID услуги не указан');
      return NextResponse.json({
        success: false,
        error: 'ID услуги не указан'
      }, { status: 400 });
    }

    console.log(`[API] POST /api/admin/services/${id}/archive: Архивирование услуги`);
    
    // Архивируем услугу (устанавливаем isArchived: true)
    const updatedService = servicesAPI.updateStatus(id, { isArchived: true });
    
    if (!updatedService) {
      console.error(`[API] POST /api/admin/services/${id}/archive: Услуга с ID ${id} не найдена`);
      return NextResponse.json({
        success: false,
        error: `Услуга с ID ${id} не найдена`
      }, { status: 404 });
    }

    console.log(`[API] POST /api/admin/services/${id}/archive: Услуга успешно архивирована`);
    
    return NextResponse.json({
      success: true,
      data: updatedService
    });
  } catch (error) {
    console.error('[API] POST /api/admin/services/[id]/archive: Внутренняя ошибка сервера', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    // Проверяем, что пользователь администратор
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      console.error(`[API] DELETE /api/admin/services/${params.id}/archive: Доступ запрещен. Пользователь не авторизован или не является администратором`);
      return NextResponse.json({
        success: false,
        error: 'Доступ запрещен. Вы должны быть авторизованы как администратор.'
      }, { status: 403 });
    }

    // Получаем ID услуги
    const { id } = params;
    
    if (!id) {
      console.error('[API] DELETE /api/admin/services/[id]/archive: ID услуги не указан');
      return NextResponse.json({
        success: false,
        error: 'ID услуги не указан'
      }, { status: 400 });
    }

    console.log(`[API] DELETE /api/admin/services/${id}/archive: Восстановление услуги из архива`);
    
    // Восстанавливаем услугу из архива (устанавливаем isArchived: false)
    const updatedService = servicesAPI.updateStatus(id, { isArchived: false });
    
    if (!updatedService) {
      console.error(`[API] DELETE /api/admin/services/${id}/archive: Услуга с ID ${id} не найдена`);
      return NextResponse.json({
        success: false,
        error: `Услуга с ID ${id} не найдена`
      }, { status: 404 });
    }

    console.log(`[API] DELETE /api/admin/services/${id}/archive: Услуга успешно восстановлена из архива`);
    
    return NextResponse.json({
      success: true,
      data: updatedService
    });
  } catch (error) {
    console.error('[API] DELETE /api/admin/services/[id]/archive: Внутренняя ошибка сервера', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.'
    }, { status: 500 });
  }
} 