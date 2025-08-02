import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { logAction } from '@/lib/logger';
import { ApiResponse } from '@/types/api';
import { servicesAPI, specialistsAPI } from '@/lib/api';

/**
 * Обработчик GET запроса для получения услуги по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем авторизацию
    const user = await getCurrentUser();
    const isAdmin = user?.role === 'admin';
    console.log(`[API] GET /api/admin/services/${params.id} - User:`, isAdmin ? 'Admin' : 'Not Admin');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    // Получаем услугу по ID
    const service = servicesAPI.getById(params.id);
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' } as ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: service } as ApiResponse);
  } catch (error) {
    console.error('[API] Error getting service:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * Обработчик PATCH запроса для обновления услуги
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    // Проверяем авторизацию
    const user = await getCurrentUser();
    const isAdmin = user?.role === 'admin';
    console.log(`[API] PATCH /api/admin/services/${params.id} - User:`, isAdmin ? 'Admin' : 'Not Admin');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    // Получаем данные из запроса
    const data = await request.json();
    console.log(`[API] PATCH /api/admin/services/${params.id} - Received data:`, {
      ...data,
      specialists: data.specialists?.length || 0
    });

    // Проверяем существование услуги
    const existingService = servicesAPI.getById(params.id);
    if (!existingService) {
      return NextResponse.json(
        { success: false, error: 'Service not found' } as ApiResponse,
        { status: 404 }
      );
    }

    // Обработка изображения, если оно передано в base64
    if (data.imageBase64) {
      try {
        console.log('[API] PATCH /api/admin/services - Обработка изображения из base64');
        const imagePath = await servicesAPI.saveImage(data.imageBase64);
        data.image = imagePath;
        delete data.imageBase64;
      } catch (imageError) {
        console.error('[API] Ошибка при сохранении изображения:', imageError);
        return NextResponse.json(
          { success: false, error: 'Ошибка при сохранении изображения' } as ApiResponse,
          { status: 500 }
        );
      }
    }

    // Отслеживаем изменения в связях с специалистами
    if (data.specialists) {
      console.log('[API] PATCH /api/admin/services - Обработка связей со специалистами');
      
      // Получаем ID специалистов до и после изменения
      const oldSpecialistIds = existingService.specialists.map((s: { id: string }) => s.id);
      const newSpecialistIds = data.specialists.map((s: { id: string }) => s.id);
      
      console.log('[API] Текущие специалисты:', oldSpecialistIds);
      console.log('[API] Новые специалисты:', newSpecialistIds);
      
      // Определяем, каких специалистов добавили и удалили
      const addedSpecialistIds = newSpecialistIds.filter((id: string) => !oldSpecialistIds.includes(id));
      const removedSpecialistIds = oldSpecialistIds.filter((id: string) => !newSpecialistIds.includes(id));
      
      console.log('[API] Добавленные специалисты:', addedSpecialistIds);
      console.log('[API] Удаленные специалисты:', removedSpecialistIds);
      
      if (addedSpecialistIds.length > 0 || removedSpecialistIds.length > 0) {
        // Получаем всех специалистов для обновления их связей
        const allSpecialists = specialistsAPI.getAll();
        
        // Обновляем связи у добавленных специалистов
        for (const specialistId of addedSpecialistIds) {
          const specialist = allSpecialists.find((s: any) => s.id === specialistId);
          if (specialist) {
            // Проверяем, есть ли уже эта услуга у специалиста
            if (!specialist.services.some((s: { id: string }) => s.id === params.id)) {
              // Добавляем услугу специалисту
              specialist.services.push({
                id: params.id,
                name: existingService.name,
                color: data.color || existingService.color
              });
              
              // Обновляем специалиста
              console.log(`[API] Добавляем услугу специалисту ${specialist.firstName} ${specialist.lastName}`);
              specialistsAPI.update(specialistId, { services: specialist.services });
            }
          }
        }
        
        // Обновляем связи у удаленных специалистов
        for (const specialistId of removedSpecialistIds) {
          const specialist = allSpecialists.find((s: any) => s.id === specialistId);
          if (specialist) {
            // Удаляем услугу у специалиста
            const updatedServices = specialist.services.filter((s: { id: string }) => s.id !== params.id);
            
            // Обновляем специалиста только если были изменения
            if (updatedServices.length !== specialist.services.length) {
              console.log(`[API] Удаляем услугу у специалиста ${specialist.firstName} ${specialist.lastName}`);
              specialistsAPI.update(specialistId, { services: updatedServices });
            }
          }
        }
      }
    }

    // Обновляем услугу
    const updatedService = servicesAPI.update(params.id, data);
    
    if (!updatedService) {
      return NextResponse.json(
        { success: false, error: 'Failed to update service' } as ApiResponse,
        { status: 500 }
      );
    }

    // Логируем действие
    await logAction(
      user.id,
      'service_updated',
      { serviceId: params.id, serviceName: updatedService.name }
    );

    return NextResponse.json({ 
      success: true, 
      data: updatedService,
      message: 'Услуга успешно обновлена'
    } as ApiResponse);
  } catch (error) {
    console.error('[API] Error updating service:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * Обработчик DELETE запроса для удаления услуги
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    // Проверяем авторизацию
    const user = await getCurrentUser();
    const isAdmin = user?.role === 'admin';
    console.log(`[API] DELETE /api/admin/services/${params.id} - User:`, isAdmin ? 'Admin' : 'Not Admin');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Доступ запрещен' } as ApiResponse,
        { status: 401 }
      );
    }

    // Проверяем существование услуги
    const service = servicesAPI.getById(params.id);
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found', message: 'Услуга не найдена' } as ApiResponse,
        { status: 404 }
      );
    }

    console.log(`[API] DELETE /api/admin/services/${params.id} - Проверка статуса архивации:`, service.isArchived);

    // Проверяем, что услуга находится в архиве (в SQLite isArchived хранится как число 1)
    if (service.isArchived !== 1) {
      return NextResponse.json(
        { success: false, error: 'Only archived services can be deleted', message: 'Удалить можно только архивные услуги. Сначала переместите услугу в архив.' } as ApiResponse,
        { status: 400 }
      );
    }

    console.log(`[API] DELETE /api/admin/services/${params.id} - Удаляем услугу "${service.name}"`);

    // Удаляем услугу через API
    const result = servicesAPI.delete(params.id);
    
    if (result) {
      // Логируем действие
      await logAction(
        user.id,
        'service_deleted',
        { serviceId: params.id, serviceName: service.name }
      );

      console.log(`[API] DELETE /api/admin/services/${params.id} - Услуга успешно удалена`);
      return NextResponse.json({ 
        success: true, 
        message: 'Услуга успешно удалена' 
      } as ApiResponse);
    } else {
      console.error(`[API] DELETE /api/admin/services/${params.id} - Ошибка при удалении услуги`);
      return NextResponse.json(
        { success: false, error: 'Failed to delete service', message: 'Не удалось удалить услугу' } as ApiResponse,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Error deleting service:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error', message: 'Внутренняя ошибка сервера' } as ApiResponse,
      { status: 500 }
    );
  }
} 