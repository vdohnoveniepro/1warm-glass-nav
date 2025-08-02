import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// API для загрузки изображений
export async function POST(req: NextRequest) {
  console.log('[API] Начало обработки запроса на загрузку фото отзыва');
  
  try {
    // Получаем данные из запроса
    const data = await req.json();
    const { image, convertToWebp = false } = data; // По умолчанию отключаем конвертацию
    
    console.log(`[API] Параметр convertToWebp: ${convertToWebp}`);
    
    if (!image) {
      console.error('[API] Изображение не предоставлено в запросе');
      return new NextResponse(JSON.stringify({
        success: false,
        error: 'Изображение не предоставлено'
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Проверяем, что данные - это действительно base64
    if (!image.includes('base64,')) {
      console.error('[API] Некорректный формат данных изображения');
      return new NextResponse(JSON.stringify({
        success: false,
        error: 'Некорректный формат данных изображения'
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Определяем тип файла по заголовку base64
    let fileExtension = 'jpg';
    let mimeType = '';
    
    if (image.includes('image/jpeg')) {
      fileExtension = 'jpg';
      mimeType = 'image/jpeg';
    } else if (image.includes('image/png')) {
      fileExtension = 'png';
      mimeType = 'image/png';
    } else if (image.includes('image/webp')) {
      fileExtension = 'webp';
      mimeType = 'image/webp';
    } else if (image.includes('image/gif')) {
      fileExtension = 'gif';
      mimeType = 'image/gif';
    }
    
    console.log(`[API] Определен формат изображения: ${fileExtension}`);
    
    // Извлекаем данные из base64
    const base64Data = image.split('base64,')[1];
    
    // Создаем буфер из base64
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`[API] Создан буфер размером ${buffer.length} байт`);
    
    // Директория для сохранения
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'reviews');
    
    // Создаем директорию, если она не существует
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`[API] Создана директория: ${uploadDir}`);
    }
    
    // Генерируем имя файла
    const fileName = uuidv4();
    console.log(`[API] Сгенерировано имя файла: ${fileName}`);
    
    // Пытаемся создать WebP, если это запрошено
    if (convertToWebp) {
      console.log('[API] Попытка конвертации в WebP - начало');
      
      // Оборачиваем весь блок WebP в отдельный try/catch для изоляции ошибок
      try {
        // Предварительная проверка изображения без использования Sharp
        if (buffer.length > 20 * 1024 * 1024) { // Увеличиваем до 20MB
          console.warn('[API] Слишком большой размер изображения для конвертации в WebP');
          throw new Error('Изображение слишком большое для конвертации в WebP');
        }
        
        // В отдельном блоке пытаемся получить метаданные
        let metadata;
        try {
          console.log('[API] Получение метаданных изображения...');
          metadata = await sharp(buffer).metadata();
          console.log(`[API] Метаданные изображения: ${JSON.stringify({
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            size: metadata.size
          })}`);
          
          // Проверка размеров изображения
          if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
            console.warn('[API] Некорректные размеры изображения:', metadata);
            throw new Error('Изображение имеет некорректные размеры');
          }
        } catch (metadataError) {
          console.error('[API] Ошибка при получении метаданных:', metadataError);
          throw new Error('Не удалось проанализировать изображение');
        }
        
        // Путь для сохранения WebP версии
        const webpFilePath = path.join(uploadDir, `${fileName}.webp`);
        console.log(`[API] Путь для сохранения WebP: ${webpFilePath}`);
        
        // Создаем отдельную переменную для слежения за процессом
        let webpCreationStarted = false;
        let webpCreationCompleted = false;
        
        try {
          // Максимально упрощенная конвертация с дополнительной защитой
          console.log('[API] Начало конвертации в WebP...');
          webpCreationStarted = true;
          
          console.log('[API] Sharp версия:', sharp.versions);
          console.log('[API] Sharp информация:', sharp.format);
          
          // Упрощенная версия конвертации
          const sharpInstance = sharp(buffer, { failOnError: false });
          
          // Используем базовые настройки WebP
          const webpOptions = { 
            quality: 80,
            effort: 1, // Минимальные усилия на сжатие 
          };
          
          console.log('[API] Применение WebP опций:', webpOptions);
          
          // Применяем WebP формат
          const webpBuffer = await sharpInstance.webp(webpOptions).toBuffer();
          console.log('[API] WebP буфер создан, размер:', webpBuffer.length);
          
          // Записываем в файл
          fs.writeFileSync(webpFilePath, webpBuffer);
          console.log('[API] WebP файл записан на диск');
          
          webpCreationCompleted = true;
          console.log('[API] Конвертация в WebP завершена');
        } catch (sharpError) {
          console.error('[API] Ошибка в процессе конвертации WebP:', sharpError);
          if (webpCreationStarted && !webpCreationCompleted) {
            console.warn('[API] Конвертация WebP была начата, но не завершена');
          }
          throw sharpError;
        }
        
        // Проверяем, что файл создан и не пустой
        if (fs.existsSync(webpFilePath)) {
          const webpStats = fs.statSync(webpFilePath);
          console.log(`[API] Размер созданного WebP файла: ${webpStats.size} байт`);
          
          if (webpStats.size > 0) {
            console.log(`[API] WebP файл успешно создан: ${webpFilePath}`);
            
            // Возвращаем URL к WebP файлу
            return new NextResponse(JSON.stringify({
              success: true,
              url: `/uploads/reviews/${fileName}.webp`,
              format: 'webp'
            }), { 
              status: 200, 
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            console.warn('[API] Созданный WebP файл имеет нулевой размер');
            // Не удаляем файл для дальнейшего расследования
            throw new Error('Созданный WebP файл имеет нулевой размер');
          }
        } else {
          console.warn('[API] WebP файл не был создан после записи');
          throw new Error('WebP файл не был создан после записи');
        }
      } catch (webpError) {
        console.error('[API] Ошибка при конвертации в WebP:', webpError instanceof Error ? webpError.message : String(webpError));
        if (webpError instanceof Error && webpError.stack) {
          console.error('[API] Стек ошибки WebP:', webpError.stack);
        }
        console.log('[API] Продолжение с сохранением в оригинальном формате');
        // Продолжаем выполнение и сохраняем в оригинальном формате
      }
    }
    
    // Если WebP не запрошен или конвертация не удалась, сохраняем в оригинальном формате
    const originalFilePath = path.join(uploadDir, `${fileName}.${fileExtension}`);
    console.log(`[API] Сохранение в оригинальном формате: ${originalFilePath}`);
    
    // Сохраняем файл
    try {
      fs.writeFileSync(originalFilePath, buffer);
      console.log(`[API] Файл успешно сохранен: ${originalFilePath}`);
      
      // Проверяем, что файл действительно создан
      if (!fs.existsSync(originalFilePath)) {
        throw new Error('Файл не был создан');
      }
      
      // Проверяем размер файла
      const fileStats = fs.statSync(originalFilePath);
      console.log(`[API] Размер файла: ${fileStats.size} байт`);
      
      if (fileStats.size === 0) {
        fs.unlinkSync(originalFilePath); // Удаляем пустой файл
        throw new Error('Созданный файл имеет нулевой размер');
      }
      
      // Формируем URL для доступа к файлу
      const fileUrl = `/uploads/reviews/${fileName}.${fileExtension}`;
      console.log(`[API] URL для доступа к файлу: ${fileUrl}`);
      
      // Успешный ответ
      return new NextResponse(JSON.stringify({
        success: true,
        url: fileUrl,
        format: fileExtension
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (writeError) {
      console.error('[API] Ошибка при записи файла:', writeError);
      return new NextResponse(JSON.stringify({
        success: false,
        error: `Ошибка при сохранении файла: ${writeError instanceof Error ? writeError.message : 'неизвестная ошибка'}`
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('[API] Критическая ошибка при обработке запроса:', error);
    return new NextResponse(JSON.stringify({
      success: false,
      error: `Ошибка при обработке запроса: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 