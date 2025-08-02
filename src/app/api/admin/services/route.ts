import { NextRequest, NextResponse } from "next/server";
import { servicesAPI, specialistsAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { logAction } from "@/lib/logger";

// Обработчик GET запроса для получения всех услуг
export async function GET(request: NextRequest) {
  try {
    console.log('[API] GET /api/admin/services: Начало обработки запроса');
    
    // Проверка аутентификации
    const user = await getCurrentUser();
    
    console.log('[API] GET /api/admin/services: Результат аутентификации', { 
      isAuthenticated: !!user, 
      role: user?.role,
      id: user?.id
    });
    
    if (!user) {
      console.log('[API] GET /api/admin/services: Пользователь не аутентифицирован');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Проверка роли пользователя
    if (user.role.toUpperCase() !== 'ADMIN') {
      console.log(`[API] GET /api/admin/services: Пользователь ${user.email} не является администратором`);
      return NextResponse.json(
        { error: 'Доступ запрещен. Только администраторы могут просматривать список услуг.' },
        { status: 403 }
      );
    }
    
    // Получение всех услуг
    console.log('[API] GET /api/admin/services: Запрос данных из servicesAPI.getAll()');
    const services = servicesAPI.getAllWithSpecialists(true); // true - включая архивные
    console.log(`[API] GET /api/admin/services: Получено услуг: ${services.length}`);
    
    // Логируем информацию о каждой услуге для отладки
    services.forEach((service, index) => {
      console.log(`[API] Услуга ${index + 1}:`, {
        id: service.id,
        name: service.name,
        isArchived: service.isArchived,
        specialists: service.specialists?.length || 0
      });
    });
    
    // Возвращаем успешный ответ
    return NextResponse.json({ 
      success: true, 
      data: services
    });
  } catch (error) {
    console.error('[API] GET /api/admin/services: Ошибка при получении списка услуг:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при получении списка услуг'
      },
      { status: 500 }
    );
  }
}

// Обработчик POST запроса для создания новой услуги
export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST /api/admin/services: Начало обработки запроса');
    
    // Проверка аутентификации
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('[API] POST /api/admin/services: Пользователь не аутентифицирован');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Проверка роли пользователя
    if (user.role.toUpperCase() !== 'ADMIN') {
      console.log(`[API] POST /api/admin/services: Пользователь ${user.email} не является администратором`);
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен. Только администраторы могут создавать услуги.' },
        { status: 403 }
      );
    }
    
    // Получение данных из запроса
    const data = await request.json();
    console.log('[API] POST /api/admin/services: Получены данные:', {
      name: data.name,
      specialists: data.specialists?.length || 0,
      hasImage: !!data.imageBase64
    });
    
    // Обработка изображения, если оно передано в base64
    if (data.imageBase64) {
      try {
        console.log('[API] POST /api/admin/services: Обработка изображения');
        const imagePath = await servicesAPI.saveImage(data.imageBase64);
        data.image = imagePath;
        delete data.imageBase64;
      } catch (imageError) {
        console.error('[API] POST /api/admin/services: Ошибка при сохранении изображения:', imageError);
        return NextResponse.json(
          { success: false, error: 'Ошибка при сохранении изображения' },
          { status: 500 }
        );
      }
    }
    
    // Валидация обязательных полей
    if (!data.name) {
      console.log('[API] POST /api/admin/services: Отсутствует название услуги');
      return NextResponse.json(
        { success: false, error: 'Название услуги обязательно' },
        { status: 400 }
      );
    }
    
    // Создание услуги
    const newService = servicesAPI.create(data);
    
    if (!newService) {
      console.log('[API] POST /api/admin/services: Ошибка при создании услуги');
      return NextResponse.json(
        { success: false, error: 'Ошибка при создании услуги' },
        { status: 500 }
      );
    }
    
    console.log(`[API] POST /api/admin/services: Услуга успешно создана (ID: ${newService.id})`);
    
    // Обновляем связи у специалистов
    if (data.specialists && data.specialists.length > 0) {
      console.log('[API] POST /api/admin/services: Обновление связей со специалистами');
      
      // Получаем всех специалистов
      const specialists = specialistsAPI.getAll();
      
      // Обходим выбранных специалистов и добавляем им новую услугу
      for (const specialistRef of data.specialists) {
        const specialist = specialists.find(s => s.id === specialistRef.id);
        if (specialist) {
          // Проверяем, есть ли уже такая услуга у специалиста
          if (!specialist.services.some(s => s.id === newService.id)) {
            specialist.services.push({
              id: newService.id,
              name: newService.name,
              color: newService.color
            });
            
            // Обновляем специалиста через API
            specialistsAPI.update(specialist.id, {
              services: specialist.services
            });
            
            console.log(`[API] POST /api/admin/services: Услуга добавлена специалисту ${specialist.firstName} ${specialist.lastName}`);
          }
        }
      }
    }
    
    // Логируем действие
    await logAction(
      user.id,
      'service_created',
      { serviceId: newService.id, serviceName: newService.name }
    );
    
    // Возвращаем успешный ответ
    return NextResponse.json({
      success: true,
      data: newService,
      message: 'Услуга успешно создана'
    });
    
  } catch (error) {
    console.error('[API] POST /api/admin/services: Ошибка при создании услуги:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании услуги' },
      { status: 500 }
    );
  }
} 