import { NextRequest, NextResponse } from "next/server";
import { servicesAdapter } from "@/database/adapters";
import { getCurrentUser } from "@/lib/auth";
import { processImageFromBase64 } from "@/lib/imageProcessing";
import path from "path";
import fs from "fs";
import { initDB } from "@/app/api/db";

// Инициализируем базу данных SQLite
initDB();

// Убедимся, что директория для изображений существует
const SERVICES_IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'services');
if (!fs.existsSync(SERVICES_IMAGES_DIR)) {
  fs.mkdirSync(SERVICES_IMAGES_DIR, { recursive: true });
}

// GET /api/services/[id] - получить услугу по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем услугу со специалистами
    const service = servicesAdapter.getWithSpecialists(params.id);
    
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Услуга не найдена' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(service);
  } catch (error) {
    console.error(`Ошибка при получении услуги с ID ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении услуги' },
      { status: 500 }
    );
  }
}

// PUT /api/services/[id] - обновить услугу
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Обработка изображения, если оно в base64
    if (data.imageBase64) {
      try {
        // Удаляем префикс данных URL, если он есть
        let base64Data = data.imageBase64;
        if (!base64Data.startsWith('data:')) {
          // Преобразуем в правильный формат base64 с префиксом
          base64Data = `data:image/jpeg;base64,${base64Data.replace(/^data:image\/[a-z]+;base64,/, '')}`;
        }
        
        // Сохраняем изображение
        const imageName = `service_${Date.now()}.jpg`;
        const imagePath = path.join(SERVICES_IMAGES_DIR, imageName);
        
        // Обрабатываем и сохраняем изображение
        await processImageFromBase64(base64Data, imagePath);
        
        // Устанавливаем относительный путь к изображению
        data.image = `/images/services/${imageName}`;
        delete data.imageBase64;
      } catch (error) {
        console.error('Ошибка при сохранении изображения:', error);
        return NextResponse.json(
          { success: false, error: 'Ошибка при сохранении изображения' },
          { status: 500 }
        );
      }
    }
    
    // Преобразуем выбранных специалистов в формат для сохранения
    if (data.specialists) {
      data.specialists = data.specialists.map((specialist: { id: string }) => ({ id: specialist.id }));
    }
    
    const updatedService = servicesAdapter.update(id, data);
    
    if (!updatedService) {
      return NextResponse.json(
        { success: false, error: 'Услуга не найдена или ошибка при обновлении' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedService
    });
  } catch (error) {
    console.error(`Ошибка при обновлении услуги с ID ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении услуги' },
      { status: 500 }
    );
  }
}

// PATCH /api/services/[id] - обновить услугу
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем аутентификацию пользователя
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Проверяем, что пользователь - администратор
    if (user.role.toUpperCase() !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен. Только администраторы могут обновлять услуги.' },
        { status: 403 }
      );
    }
    
    // Получаем ID услуги из URL
    const serviceId = params.id;
    
    // Получаем данные услуги
    const service = servicesAdapter.getById(serviceId);
    
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Услуга не найдена' },
        { status: 404 }
      );
    }
    
    // Получаем данные запроса
    const data = await request.json();
    
    // Обновляем данные услуги
    const updatedService = servicesAdapter.update(serviceId, data);
    
    if (!updatedService) {
      return NextResponse.json(
        { success: false, error: 'Ошибка при обновлении услуги' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Услуга успешно обновлена',
      data: updatedService 
    });
  } catch (error) {
    console.error(`Ошибка при обновлении услуги с ID ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении услуги' },
      { status: 500 }
    );
  }
}

// DELETE /api/services/[id] - удалить услугу (только архивированную)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем аутентификацию пользователя
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('[API] Ошибка удаления услуги: Пользователь не авторизован');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Проверяем, что пользователь - администратор
    if (user.role.toUpperCase() !== 'ADMIN') {
      console.log('[API] Ошибка удаления услуги: У пользователя нет прав администратора');
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен. Только администраторы могут удалять услуги.' },
        { status: 403 }
      );
    }
    
    // Проверяем существование услуги
    const service = servicesAdapter.getById(params.id);
    
    if (!service) {
      console.log(`[API] Ошибка удаления услуги: Услуга с ID ${params.id} не найдена`);
      return NextResponse.json(
        { success: false, error: 'Услуга не найдена' },
        { status: 404 }
      );
    }
    
    // Проверяем, что услуга архивирована
    if (!service.isArchived) {
      console.log(`[API] Ошибка удаления услуги: Услуга с ID ${params.id} не архивирована`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Удалить можно только архивные услуги. Сначала переместите услугу в архив.' 
        },
        { status: 400 }
      );
    }
    
    // Удаляем услугу
    const deleted = servicesAdapter.delete(params.id);
    
    if (!deleted) {
      console.log(`[API] Ошибка удаления услуги: Не удалось удалить услугу с ID ${params.id}`);
      return NextResponse.json(
        { success: false, error: 'Ошибка при удалении услуги' },
        { status: 500 }
      );
    }
    
    console.log(`[API] Успешно удалена услуга с ID ${params.id}`);
    return NextResponse.json({ 
      success: true, 
      message: 'Услуга успешно удалена'
    });
  } catch (error) {
    console.error(`[API] Ошибка при удалении услуги с ID ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении услуги' },
      { status: 500 }
    );
  }
} 