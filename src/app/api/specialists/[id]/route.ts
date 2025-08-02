import { NextRequest, NextResponse } from 'next/server';
import { specialistsAPI } from '@/database/api/specialists';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/database/db';
import { ApiResponse } from '@/models/types';
import { specialistsAdapter } from '@/database/adapters/specialists';
import { processImageFromBase64 } from '@/lib/imageProcessing';
import { saveOriginalImage } from '@/lib/server/imageProcessing';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Получение специалиста по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const id = params.id;
  console.log(`[GET /api/specialists/${id}] Запрос специалиста по ID: ${id}`);
  
  try {
    logger.info(`[API] Запрос на получение специалиста по ID: ${id}`);
    
    // Получаем специалиста по ID
    const specialist = specialistsAPI.getById(id);
    
    if (!specialist) {
      console.log(`[GET /api/specialists/${id}] Специалист не найден`);
      logger.warn(`[API] Специалист с ID ${id} не найден`);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Специалист не найден'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    console.log(`[GET /api/specialists/${id}] Специалист найден: ${specialist.firstName} ${specialist.lastName}`);
    
    // Увеличиваем счетчик просмотров
    try {
      db.prepare(`
        UPDATE specialists
        SET views = COALESCE(views, 0) + 1
        WHERE id = ?
      `).run(id);
    } catch (error) {
      console.error(`[GET /api/specialists/${id}] Ошибка при обновлении счетчика просмотров:`, error);
      // Продолжаем выполнение даже при ошибке счетчика
    }
    
    logger.info(`[API] Успешно получен специалист с ID ${id}`);
    
    // Формируем ответ
    const response: ApiResponse<any> = {
      success: true,
      data: specialist
    };
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error(`[GET /api/specialists/${id}] Ошибка:`, error);
    logger.error(`[API] Ошибка при получении специалиста с ID ${id}: ${error}`);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Ошибка сервера'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Обновление специалиста по ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const specialistId = params.id;
    logger.info(`[API] Запрос на обновление специалиста: ${specialistId}`);
    
    // Проверяем, что текущий пользователь имеет права на редактирование
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      logger.warn(`[API] Неавторизованный запрос на обновление специалиста ${specialistId}`);
      return NextResponse.json(
        { success: false, error: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    
    // Проверяем роль пользователя (админ или сам специалист)
    const isAdmin = currentUser.role.toUpperCase() === 'ADMIN';
    const isOwnSpecialist = currentUser.specialistId === specialistId;
    
    if (!isAdmin && !isOwnSpecialist) {
      logger.warn(`[API] Доступ запрещен для пользователя ${currentUser.id} при обновлении специалиста ${specialistId}`);
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    // Проверяем существование специалиста
    const specialist = specialistsAPI.getById(specialistId);
    if (!specialist) {
      logger.warn(`[API] Специалист с ID ${specialistId} не найден при обновлении`);
      return NextResponse.json(
        { success: false, error: 'Специалист не найден' },
        { status: 404 }
      );
    }

    // Обрабатываем данные из запроса
    const contentType = request.headers.get('content-type') || '';
    let data: any;
    
    if (contentType.includes('multipart/form-data')) {
      // Обрабатываем данные формы с файлами
      const formData = await request.formData();
      data = Object.fromEntries(formData);
      
      // Обрабатываем JSON поля
      if (data.additionalPositions && typeof data.additionalPositions === 'string') {
        data.additionalPositions = JSON.parse(data.additionalPositions);
      }
      if (data.selectedServices && typeof data.selectedServices === 'string') {
        data.selectedServices = JSON.parse(data.selectedServices);
      }
      if (data.workSchedule && typeof data.workSchedule === 'string') {
        data.workSchedule = JSON.parse(data.workSchedule);
      }
      if (data.documentsInfo && typeof data.documentsInfo === 'string') {
        data.documentsInfo = JSON.parse(data.documentsInfo);
      }
      
      // Обработка userId (если есть)
      if (data.userId === 'null') {
        data.userId = null;
      }
      
      // Обработка фото, если оно представлено как файл или base64
      if (data.photo && typeof data.photo === 'string' && data.photo.startsWith('data:')) {
        try {
          console.log(`[API Specialists Edit] Обработка фото в формате base64, длина: ${data.photo.length}`);
          
          // Проверяем директорию для загрузки
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'specialists');
          if (!fs.existsSync(uploadDir)) {
            console.log(`[API Specialists Edit] Создаем директорию: ${uploadDir}`);
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          // Проверяем права доступа к директории
          try {
            const stats = fs.statSync(uploadDir);
            console.log(`[API Specialists Edit] Права доступа к директории: ${stats.mode.toString(8)}`);
            
            // Устанавливаем права 777 на директорию, если необходимо
            fs.chmodSync(uploadDir, 0o777);
            console.log(`[API Specialists Edit] Установлены права 777 на директорию`);
          } catch (statError) {
            console.error(`[API Specialists Edit] Ошибка при проверке прав доступа: ${statError}`);
          }
          
          // Пытаемся сохранить изображение через функцию saveOriginalImage
          try {
        const photoPath = await saveOriginalImage(data.photo, 'specialists');
          console.log(`[API Specialists Edit] Получен путь к фото: ${photoPath}`);
          
        if (photoPath) {
          data.photo = photoPath;
            console.log(`[API Specialists Edit] Установлен путь к фото: ${photoPath}`);
            
            // Проверяем, что файл был создан
            const publicPath = path.join(process.cwd(), 'public', photoPath);
            if (fs.existsSync(publicPath)) {
              const stats = fs.statSync(publicPath);
              console.log(`[API Specialists Edit] Файл существует, размер: ${stats.size} байт`);
            } else {
              console.error(`[API Specialists Edit] ОШИБКА: Файл не найден по пути: ${publicPath}`);
                
                // Попробуем создать файл напрямую
                try {
                  // Извлекаем данные из base64
                  const matches = data.photo.match(/^data:image\/([a-zA-Z0-9-+.]+);base64,(.+)$/);
                  if (matches && matches.length === 3) {
                    const imageFormat = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const buffer = Buffer.from(matches[2], 'base64');
                    
                    // Генерируем имя файла
                    const fileId = uuidv4();
                    const filePath = path.join(uploadDir, `${fileId}.${imageFormat}`);
                    const relativePath = `/uploads/specialists/${fileId}.${imageFormat}`;
                    
                    // Записываем файл
                    fs.writeFileSync(filePath, buffer);
                    console.log(`[API Specialists Edit] Файл сохранен напрямую: ${filePath}`);
                    
                    // Устанавливаем путь к файлу
                    data.photo = relativePath;
                    console.log(`[API Specialists Edit] Установлен путь к файлу: ${relativePath}`);
                  } else {
                    console.error(`[API Specialists Edit] Неверный формат base64 данных`);
                    data.photo = specialist.photo; // Используем существующее фото
                  }
                } catch (directSaveError) {
                  console.error(`[API Specialists Edit] Ошибка при прямом сохранении файла: ${directSaveError}`);
                  data.photo = specialist.photo; // Используем существующее фото
                }
            }
          } else {
            console.error(`[API Specialists Edit] Не получен путь к фото`);
              data.photo = specialist.photo; // Используем существующее фото
            }
          } catch (saveError) {
            console.error(`[API Specialists Edit] Ошибка при сохранении через saveOriginalImage: ${saveError}`);
            
            // Запасной вариант - сохраняем файл напрямую
            try {
              // Извлекаем данные из base64
              const matches = data.photo.match(/^data:image\/([a-zA-Z0-9-+.]+);base64,(.+)$/);
              if (matches && matches.length === 3) {
                const imageFormat = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                
                // Генерируем имя файла
                const fileId = uuidv4();
                const filePath = path.join(uploadDir, `${fileId}.${imageFormat}`);
                const relativePath = `/uploads/specialists/${fileId}.${imageFormat}`;
                
                // Записываем файл
                fs.writeFileSync(filePath, buffer);
                console.log(`[API Specialists Edit] Файл сохранен напрямую: ${filePath}`);
                
                // Устанавливаем путь к файлу
                data.photo = relativePath;
                console.log(`[API Specialists Edit] Установлен путь к файлу: ${relativePath}`);
              } else {
                console.error(`[API Specialists Edit] Неверный формат base64 данных`);
                data.photo = specialist.photo; // Используем существующее фото
              }
            } catch (directSaveError) {
              console.error(`[API Specialists Edit] Ошибка при прямом сохранении файла: ${directSaveError}`);
              data.photo = specialist.photo; // Используем существующее фото
            }
          }
        } catch (photoError) {
          console.error(`[API Specialists Edit] Ошибка при обработке фото: ${photoError}`);
          data.photo = specialist.photo; // Используем существующее фото
        }
      } else if (data.photo && typeof data.photo === 'object') {
        console.log(`[API Specialists Edit] Фото является объектом:`, data.photo);
        
        try {
          // Проверяем, является ли это объектом File
          if (data.photo.size && data.photo.name && data.photo.type && data.photo.type.startsWith('image/')) {
            console.log(`[API Specialists Edit] Обрабатываем объект File: ${data.photo.name}`);
            
            // Создаем директорию для загрузки, если она не существует
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'specialists');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // Получаем содержимое файла
            const fileContent = await data.photo.arrayBuffer();
            const buffer = Buffer.from(fileContent);
            
            // Генерируем уникальное имя файла
            const fileExt = data.photo.name.split('.').pop().toLowerCase();
            const fileName = `${uuidv4()}.${fileExt}`;
            const filePath = path.join(uploadDir, fileName);
            const relativePath = `/uploads/specialists/${fileName}`;
            
            // Сохраняем файл
            fs.writeFileSync(filePath, buffer);
            console.log(`[API Specialists Edit] Файл сохранен: ${filePath}`);
            
            // Устанавливаем путь к файлу
            data.photo = relativePath;
          } else {
            // Если это не File или не изображение, используем существующее фото
            console.log(`[API Specialists Edit] Объект не является File или не является изображением`);
            data.photo = specialist.photo;
          }
        } catch (fileError) {
          console.error(`[API Specialists Edit] Ошибка при обработке файла:`, fileError);
          // В случае ошибки используем существующее фото
          data.photo = specialist.photo;
        }
      }
    } else {
      // Обрабатываем JSON данные
      data = await request.json();
    }

    // Обновляем специалиста
    const updatedSpecialist = specialistsAdapter.update(specialistId, data);
    
    if (!updatedSpecialist) {
      logger.error(`[API] Не удалось обновить специалиста с ID ${specialistId}`);
      return NextResponse.json(
        { success: false, error: 'Не удалось обновить специалиста' },
        { status: 500 }
      );
    }
    
    logger.info(`[API] Специалист с ID ${specialistId} успешно обновлен`);
    
    // Возвращаем успешный результат
    return NextResponse.json({
      success: true,
      data: updatedSpecialist
    });
    
  } catch (error) {
    console.error('Ошибка при обновлении специалиста:', error);
    logger.error(`[API] Ошибка при обновлении специалиста: ${error}`);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении специалиста' },
      { status: 500 }
    );
  }
}

// Удаление специалиста по ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info(`[API] Запрос на удаление специалиста по ID: ${params.id}`);
    
    // Проверяем, что текущий пользователь авторизован
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser) {
      logger.warn(`[API] Попытка удаления специалиста без авторизации`);
      return NextResponse.json(
        { success: false, error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Логируем информацию о пользователе для отладки
    logger.info(`[API] Пользователь: ${JSON.stringify({
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      roles: currentUser.roles
    })}`);
    
    // Разрешаем удаление администраторам и специалистам
    const isAdmin = currentUser.role.toUpperCase() === 'ADMIN' || 
                   (currentUser.roles && currentUser.roles.includes('admin'));
    const isSpecialist = currentUser.role.toUpperCase() === 'SPECIALIST' || 
                        (currentUser.roles && currentUser.roles.includes('specialist'));
    
    if (!isAdmin && !isSpecialist) {
      logger.warn(`[API] Попытка удаления специалиста без необходимых прав`);
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    // Проверяем существование специалиста
    const specialist = specialistsAPI.getById(params.id);
    
    if (!specialist) {
      logger.warn(`[API] Специалист с ID ${params.id} не найден при попытке удаления`);
      return NextResponse.json(
        { success: false, error: 'Специалист не найден' },
        { status: 404 }
      );
    }
    
    // Удаляем специалиста
    const result = specialistsAPI.delete(params.id);
    
    if (!result) {
      logger.error(`[API] Не удалось удалить специалиста с ID ${params.id}`);
      return NextResponse.json(
        { success: false, error: 'Не удалось удалить специалиста' },
        { status: 500 }
      );
    }
    
    logger.info(`[API] Специалист с ID ${params.id} успешно удален`);
    
    // Возвращаем успешный результат
    return NextResponse.json({
      success: true,
      data: { id: params.id }
    });
  } catch (error) {
    logger.error(`[API] Ошибка при удалении специалиста с ID ${params.id}: ${error}`);
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении специалиста' },
      { status: 500 }
    );
  }
} 