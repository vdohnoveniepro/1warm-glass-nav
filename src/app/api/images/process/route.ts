import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Функция для создания директории, если она не существует
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export async function POST(request: NextRequest) {
  try {
    // Получаем данные из запроса
    const data = await request.json();
    const { image, folder = 'uploads', convertToWebp = true } = data;
    
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: 'Изображение не предоставлено или имеет неверный формат' 
      }, { status: 400 });
    }
    
    // Проверяем, что это base64-изображение
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Неверный формат изображения' 
      }, { status: 400 });
    }
    
    // Извлекаем MIME-тип и данные из base64
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ 
        success: false, 
        error: 'Неверный формат base64' 
      }, { status: 400 });
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Генерируем уникальное имя файла
    const fileName = uuidv4();
    
    // Определяем путь для сохранения
    const publicDir = path.join(process.cwd(), 'public');
    const uploadDir = path.join(publicDir, folder);
    
    console.log(`[API Images] Путь для сохранения: ${uploadDir}`);
    
    // Создаем директорию, если она не существует
    try {
      ensureDirectoryExists(publicDir);
      ensureDirectoryExists(uploadDir);
      console.log(`[API Images] Директории проверены и созданы`);
    } catch (dirError) {
      console.error(`[API Images] Ошибка при создании директорий:`, dirError);
      return NextResponse.json({ 
        success: false, 
        error: 'Не удалось создать директорию для сохранения изображений' 
      }, { status: 500 });
    }
    
    // Определяем формат вывода
    const outputFormat = convertToWebp ? 'webp' : mimeType.split('/')[1];
    const outputFileName = `${fileName}.${outputFormat}`;
    const outputPath = path.join(uploadDir, outputFileName);
    const publicPath = `/${folder}/${outputFileName}`;
    
    console.log(`[API Images] Имя выходного файла: ${outputFileName}`);
    
    // Обрабатываем изображение с помощью sharp
    try {
      let sharpInstance = sharp(buffer);
      
      // Настройки для оптимизации
      if (outputFormat === 'webp') {
        sharpInstance = sharpInstance.webp({ 
          quality: 85,
          lossless: false
        });
      } else if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
        sharpInstance = sharpInstance.jpeg({ 
          quality: 85,
          progressive: true
        });
      } else if (outputFormat === 'png') {
        sharpInstance = sharpInstance.png({ 
          compressionLevel: 9,
          progressive: true
        });
      }
      
      // Изменяем размер, если изображение слишком большое
      const metadata = await sharpInstance.metadata();
      if (metadata.width && metadata.width > 1200) {
        sharpInstance = sharpInstance.resize({ 
          width: 1200,
          withoutEnlargement: true
        });
      }
      
      console.log(`[API Images] Сохранение в: ${outputPath}`);
      
      // Сохраняем обработанное изображение
      await sharpInstance.toFile(outputPath);
      
      // Проверяем, существует ли файл после сохранения
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Файл не был создан: ${outputPath}`);
      }
      
      console.log(`[API Images] Изображение успешно сохранено: ${publicPath}`);
      
      // Возвращаем путь к обработанному изображению
      return NextResponse.json({
        success: true,
        url: publicPath,
        format: outputFormat,
        originalFormat: mimeType.split('/')[1]
      });
      
    } catch (sharpError) {
      console.error('[API Images] Ошибка при обработке изображения:', sharpError);
      
      try {
        // В случае ошибки обработки, сохраняем оригинал
        const originalFormat = mimeType.split('/')[1];
        const originalFileName = `${fileName}.${originalFormat}`;
        const originalPath = path.join(uploadDir, originalFileName);
        const originalPublicPath = `/${folder}/${originalFileName}`;
        
        console.log(`[API Images] Сохранение оригинала в: ${originalPath}`);
        fs.writeFileSync(originalPath, buffer);
        
        if (!fs.existsSync(originalPath)) {
          throw new Error(`Оригинальный файл не был создан: ${originalPath}`);
        }
        
        console.log(`[API Images] Оригинал успешно сохранен: ${originalPublicPath}`);
        
        return NextResponse.json({
          success: true,
          url: originalPublicPath,
          format: originalFormat,
          originalFormat: originalFormat,
          note: 'Сохранен оригинал из-за ошибки обработки'
        });
      } catch (fsError) {
        console.error('[API Images] Ошибка при сохранении оригинала:', fsError);
        return NextResponse.json({ 
          success: false, 
          error: 'Не удалось сохранить изображение' 
        }, { status: 500 });
      }
    }
    
  } catch (error) {
    console.error('[API Images] Ошибка при обработке запроса:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
} 