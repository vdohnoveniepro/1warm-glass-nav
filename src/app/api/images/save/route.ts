import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from 'fs/promises';

// Максимальный возраст неиспользуемых изображений (7 дней в миллисекундах)
const MAX_IMAGE_AGE = 7 * 24 * 60 * 60 * 1000;

// Периодичность очистки (24 часа в миллисекундах)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

// Базовые директории для сохранения изображений
const imagesDir = path.join(process.cwd(), 'public', 'uploads', 'images');
const tempImagesDir = path.join(imagesDir, 'temp');

// Объект для отслеживания использования изображений
const imageUsageTracker: Record<string, { lastAccessed: number; isUsed: boolean }> = {};

/**
 * Инициализация директорий для хранения изображений
 */
async function ensureDirectoriesExist() {
  try {
    // Создаем основную директорию для изображений
    if (!fs.existsSync(imagesDir)) {
      await mkdir(imagesDir, { recursive: true });
    }
    
    // Создаем директорию для временных изображений
    if (!fs.existsSync(tempImagesDir)) {
      await mkdir(tempImagesDir, { recursive: true });
    }
  } catch (error) {
    console.error('Ошибка при создании директорий для изображений:', error);
  }
}

/**
 * Функция очистки неиспользуемых временных изображений
 */
async function cleanupUnusedImages() {
  try {
    // Проверяем, существует ли директория
    if (!fs.existsSync(tempImagesDir)) {
      return;
    }
    
    const files = fs.readdirSync(tempImagesDir);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(tempImagesDir, file);
      
      // Получаем информацию о файле
      const stats = fs.statSync(filePath);
      const imageId = path.basename(file, path.extname(file));
      
      // Проверяем, отслеживается ли изображение
      const isTracked = imageUsageTracker[imageId];
      
      // Проверяем время создания/модификации
      const fileAge = now - stats.mtimeMs;
      
      // Удаляем файлы, которые:
      // 1. Старше MAX_IMAGE_AGE
      // 2. ИЛИ отмечены как неиспользуемые и прошло более 24 часов
      if (fileAge > MAX_IMAGE_AGE || (isTracked && !isTracked.isUsed && now - isTracked.lastAccessed > 24 * 60 * 60 * 1000)) {
        fs.unlinkSync(filePath);
        console.log(`Удалено неиспользуемое изображение: ${file}`);
        
        // Удаляем из трекера
        if (isTracked) {
          delete imageUsageTracker[imageId];
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при очистке неиспользуемых изображений:', error);
  }
}

// Запускаем очистку при старте и затем периодически
ensureDirectoriesExist().then(() => {
  // Начальная очистка
  cleanupUnusedImages();
  
  // Регулярная очистка
  setInterval(cleanupUnusedImages, CLEANUP_INTERVAL);
});

export async function POST(request: NextRequest) {
  try {
    // Проверяем и создаем директории, если необходимо
    await ensureDirectoriesExist();
    
    // Получаем данные из запроса
    const { imageData, fileName, altText } = await request.json();
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Не переданы данные изображения' },
        { status: 400 }
      );
    }
    
    // Генерируем уникальный идентификатор для файла
    const uniqueId = uuidv4();
    const fileExtension = (fileName && path.extname(fileName)) || '.png';
    const safeFileName = `${uniqueId}${fileExtension}`;
    
    // Декодируем данные base64
    let base64Data = imageData;
    if (base64Data.startsWith('data:')) {
      // Если данные в формате data URL, извлекаем только base64 часть
      const parts = base64Data.split(',');
      if (parts.length > 1) {
        base64Data = parts[1];
      }
    }
    
    // Приводим к буферу
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Сохраняем во временную директорию
    const filePath = path.join(tempImagesDir, safeFileName);
    fs.writeFileSync(filePath, buffer);
    
    // Добавляем в трекер как временное
    imageUsageTracker[uniqueId] = {
      lastAccessed: Date.now(),
      isUsed: false // Изначально не используется
    };
    
    // URL для использования в клиенте
    const imageUrl = `/uploads/images/temp/${safeFileName}`;
    
    return NextResponse.json({
      success: true,
      imageUrl,
      imageId: uniqueId,
      message: 'Изображение успешно сохранено'
    });
  } catch (error) {
    console.error('Ошибка при сохранении изображения:', error);
    return NextResponse.json(
      { error: 'Ошибка при сохранении изображения' },
      { status: 500 }
    );
  }
}

/**
 * Обработка GET-запросов для маркировки изображения как используемого
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    
    if (imageId && imageUsageTracker[imageId]) {
      // Помечаем изображение как используемое и обновляем время доступа
      imageUsageTracker[imageId] = {
        lastAccessed: Date.now(),
        isUsed: true
      };
      
      return NextResponse.json({
        success: true,
        message: 'Статус изображения обновлен'
      });
    }
    
    return NextResponse.json(
      { error: 'Изображение не найдено' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Ошибка при обновлении статуса изображения:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
} 