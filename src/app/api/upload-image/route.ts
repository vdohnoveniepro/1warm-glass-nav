import { NextRequest, NextResponse } from 'next/server';
import { processImageFromBase64 } from '@/lib/imageProcessing';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  console.log('[API] Начало обработки запроса на загрузку изображения');
  
  // Блок try/catch верхнего уровня для предотвращения непредвиденных сбоев сервера
  try {
    // Проверяем, что запрос содержит JSON-данные
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('[API] Ошибка при разборе JSON в запросе:', parseError);
      return NextResponse.json({ 
        success: false, 
        error: 'Некорректный формат запроса' 
      }, { status: 400 });
    }
    
    const { image, directory = 'reviews' } = body;
    
    if (!image) {
      console.log('[API] Изображение не предоставлено в запросе');
      return NextResponse.json({ 
        success: false, 
        error: 'Изображение не предоставлено' 
      }, { status: 400 });
    }
    
    // Проверяем, что директория допустима (защита от path traversal)
    if (directory.includes('..') || directory.includes('/') || directory.includes('\\')) {
      console.error('[API] Попытка использования недопустимого пути директории:', directory);
      return NextResponse.json({ 
        success: false, 
        error: 'Недопустимый путь директории' 
      }, { status: 400 });
    }
    
    // Проверяем наличие директории uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', directory);
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`[API] Создана директория для загрузок: ${uploadDir}`);
      }
    } catch (dirError) {
      console.error(`[API] Ошибка при создании директории ${uploadDir}:`, dirError);
      return NextResponse.json({ 
        success: false, 
        error: 'Не удалось создать директорию для загрузки' 
      }, { status: 500 });
    }
    
    // Генерируем имя файла
    const fileName = uuidv4();
    console.log(`[API] Сгенерировано имя файла: ${fileName}`);
    
    // Извлекаем данные из base64
    let base64Data = image;
    let imageFormat = 'jpeg'; // Формат по умолчанию
    
    // Определяем формат изображения на основе строки base64
    if (base64Data.includes('base64,')) {
      if (base64Data.includes('image/jpeg')) {
        imageFormat = 'jpeg';
      } else if (base64Data.includes('image/png')) {
        imageFormat = 'png';
      } else if (base64Data.includes('image/gif')) {
        imageFormat = 'gif';
      } else if (base64Data.includes('image/webp')) {
        imageFormat = 'webp';
      }
      
      base64Data = base64Data.split('base64,')[1];
    }
    
    console.log(`[API] Определен формат изображения: ${imageFormat}`);
    
    // Декодируем base64 в буфер
    let buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length === 0) {
        throw new Error('Пустой буфер изображения');
      }
      
      console.log(`[API] Создан буфер изображения размером ${buffer.length} байт`);
    } catch (bufferError) {
      console.error('[API] Ошибка при декодировании base64 в буфер:', bufferError);
      return NextResponse.json({ 
        success: false, 
        error: 'Не удалось обработать изображение: некорректные данные' 
      }, { status: 400 });
    }
    
    try {
      console.log('[API] Начинаем обработку изображения через Sharp');
      
      // Проверяем, является ли буфер корректным изображением
      let metadata;
      try {
        metadata = await sharp(buffer).metadata();
        console.log(`[API] Метаданные изображения: формат=${metadata.format}, размер=${metadata.width}x${metadata.height}`);
        
        // Защита от возможных битых изображений
        if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
          console.error('[API] Некорректные размеры изображения:', metadata);
          throw new Error('Изображение имеет некорректные размеры');
        }
      } catch (metadataError) {
        console.error('[API] Ошибка при чтении метаданных изображения:', metadataError);
        // Вместо выброса ошибки, пробуем сохранить оригинальное изображение
        return await saveOriginalImage(buffer, uploadDir, fileName, directory, imageFormat);
      }
      
      // Создаем WebP изображение с оптимизацией
      const outputPath = path.join(uploadDir, `${fileName}.webp`);
      console.log(`[API] Путь для сохранения оптимизированного изображения: ${outputPath}`);
      
      // Создаем экземпляр sharp с настройками изображения
      const sharpInstance = sharp(buffer).resize({
        width: 1200,
        withoutEnlargement: true,
        fit: 'inside'
      });
      
      // Преобразуем в WebP
      const webpOptions = {
        quality: 85,
        effort: 4
      };
      
      console.log('[API] Применение WebP опций:', webpOptions);
      
      // Создаем WebP буфер и записываем в файл
      const webpBuffer = await sharpInstance.webp(webpOptions).toBuffer();
      console.log(`[API] WebP буфер создан, размер: ${webpBuffer.length} байт`);
      fs.writeFileSync(outputPath, webpBuffer);
      console.log(`[API] WebP файл записан на диск: ${outputPath}`);
      
      // Создаем миниатюру для предпросмотра
      const thumbPath = path.join(uploadDir, `${fileName}_thumb.webp`);
      console.log(`[API] Путь для сохранения миниатюры: ${thumbPath}`);
      
      // Преобразуем миниатюру через новый метод
      const thumbInstance = sharp(buffer).resize(300, 300, {
        fit: 'cover',
        position: 'centre'
      });
      
      const thumbWebpBuffer = await thumbInstance.webp({
        quality: 75,
        effort: 4
      }).toBuffer();
      
      fs.writeFileSync(thumbPath, thumbWebpBuffer);
      console.log(`[API] Миниатюра записана на диск: ${thumbPath}`);
      
      // Проверяем, что файлы были успешно созданы
      if (!fs.existsSync(outputPath)) {
        console.error('[API] Файл не был создан после обработки:', outputPath);
        throw new Error('Не удалось создать файл изображения');
      }
      
      // Возвращаем URL изображения для сохранения в базе данных
      const imageUrl = `/uploads/${directory}/${fileName}.webp`;
      console.log(`[API] Изображение успешно сохранено: ${imageUrl}`);
      
      return NextResponse.json({ 
        success: true, 
        url: imageUrl,
        thumbnail: `/uploads/${directory}/${fileName}_thumb.webp`
      });
      
    } catch (sharpError) {
      console.error('[API] Ошибка при обработке изображения через Sharp:', sharpError);
      
      // Запасной вариант - сохраняем оригинальное изображение без оптимизации
      try {
        return await saveOriginalImage(buffer, uploadDir, fileName, directory, imageFormat);
      } catch (fallbackError) {
        console.error('[API] Ошибка при сохранении оригинального изображения:', fallbackError);
        return NextResponse.json({ 
          success: false, 
          error: 'Не удалось сохранить изображение: ' + (fallbackError instanceof Error ? fallbackError.message : 'неизвестная ошибка')
        }, { status: 500 });
      }
    }
    
  } catch (error) {
    console.error('[API] Критическая ошибка при загрузке изображения:', error);
    
    // Гарантируем, что сервер не упадет даже при неожиданных ошибках
    try {
      return NextResponse.json({ 
        success: false, 
        error: 'Ошибка при обработке изображения: ' + (error instanceof Error ? error.message : 'неизвестная ошибка')
      }, { status: 500 });
    } catch (responseError) {
      console.error('[API] Не удалось вернуть ответ с ошибкой:', responseError);
      // Крайний случай, отправляем простой ответ
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
}

// Вынесем логику сохранения оригинального изображения в отдельную функцию
async function saveOriginalImage(
  buffer: Buffer, 
  uploadDir: string, 
  fileName: string, 
  directory: string, 
  imageFormat: string
) {
  try {
    console.log('[API] Пробуем сохранить изображение без обработки Sharp');
    const fallbackFormat = imageFormat || 'jpg';
    const fallbackPath = path.join(uploadDir, `${fileName}.${fallbackFormat}`);
    
    fs.writeFileSync(fallbackPath, buffer);
    
    if (fs.existsSync(fallbackPath)) {
      console.log(`[API] Сохранено резервное изображение: ${fallbackPath}`);
      
      // Проверяем размер файла
      const stats = fs.statSync(fallbackPath);
      console.log(`[API] Размер сохраненного файла: ${stats.size} байт`);
      
      if (stats.size === 0) {
        console.error('[API] Сохраненный файл имеет нулевой размер');
        fs.unlinkSync(fallbackPath); // Удаляем пустой файл
        throw new Error('Сохраненный файл имеет нулевой размер');
      }
      
      return NextResponse.json({ 
        success: true, 
        url: `/uploads/${directory}/${fileName}.${fallbackFormat}`,
        isOptimized: false
      });
    } else {
      console.error('[API] Не удалось сохранить файл:', fallbackPath);
      throw new Error('Не удалось сохранить изображение');
    }
  } catch (fallbackError) {
    console.error('[API] Ошибка при сохранении оригинального изображения:', fallbackError);
    return NextResponse.json({ 
      success: false, 
      error: 'Не удалось сохранить изображение: ' + (fallbackError instanceof Error ? fallbackError.message : 'неизвестная ошибка')
    }, { status: 500 });
  }
} 