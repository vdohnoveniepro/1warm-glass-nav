import { NextRequest, NextResponse } from "next/server";
import { servicesAdapter } from "@/database/adapters";
import { processImageFromBase64 } from "@/lib/imageProcessing";
import path from "path";
import fs from "fs";
import { initDB } from "@/app/api/db";

// Инициализируем базу данных SQLite
try {
  console.log('[API Services] Инициализация базы данных...');
  initDB();
  console.log('[API Services] База данных инициализирована');
} catch (error) {
  console.error('[API Services] Ошибка при инициализации базы данных:', error);
}

// Убедимся, что директория для изображений существует
const SERVICES_IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'services');
if (!fs.existsSync(SERVICES_IMAGES_DIR)) {
  try {
    console.log('[API Services] Создание директории для изображений услуг:', SERVICES_IMAGES_DIR);
    fs.mkdirSync(SERVICES_IMAGES_DIR, { recursive: true });
    console.log('[API Services] Директория создана успешно');
  } catch (dirError) {
    console.error('[API Services] Ошибка при создании директории для изображений:', dirError);
  }
}

// GET /api/services - получить все услуги
export async function GET() {
  console.log('[API Services] Начало обработки запроса GET /api/services');
  
  try {
    console.log('[API Services] Получение услуг через адаптер...');
    // Используем getAllWithSpecialists для получения связанных специалистов
    const services = servicesAdapter.getAllWithSpecialists();
    
    console.log(`[API Services] Получено ${services?.length || 0} услуг`);
    
    // Возвращаем массив услуг напрямую, без обертки в объект с полем data
    return NextResponse.json(services, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('[API Services] Ошибка при получении услуг:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении услуг' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
}

// POST /api/services - создать новую услугу
export async function POST(request: NextRequest) {
  console.log('[API Services] Начало обработки запроса POST /api/services');
  
  try {
    const data = await request.json();
    console.log('[API Services] Получены данные для создания услуги');
    
    // Обработка изображения, если оно в base64
    if (data.imageBase64) {
      try {
        console.log('[API Services] Обработка изображения в формате base64...');
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
        console.log('[API Services] Изображение успешно обработано и сохранено');
      } catch (error) {
        console.error('[API Services] Ошибка при сохранении изображения:', error);
        return NextResponse.json(
          { success: false, error: 'Ошибка при сохранении изображения' },
          { 
            status: 500,
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            }
          }
        );
      }
    }
    
    // Преобразуем выбранных специалистов в формат для сохранения
    if (data.specialists) {
      data.specialists = data.specialists.map((specialist: { id: string }) => ({ id: specialist.id }));
    }
    
    console.log('[API Services] Создание новой услуги через адаптер...');
    const newService = servicesAdapter.create(data);
    
    if (!newService) {
      console.error('[API Services] Адаптер вернул null при создании услуги');
      return NextResponse.json(
        { success: false, error: 'Ошибка при создании услуги' },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }
    
    console.log('[API Services] Услуга успешно создана:', newService.id);
    return NextResponse.json(
      { success: true, data: newService }, 
      { 
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('[API Services] Ошибка при создании услуги:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании услуги' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
} 