import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { getImageSettings } from '@/lib/imageProcessing';

interface OptimizationResult {
  directory: string;
  processed: number;
  optimized: number;
  thumbnailsCreated: number;
  errors: number;
}

// POST /api/admin/optimize/images - регенерация всех миниатюр изображений
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const results = await regenerateImageThumbnails();
    const duration = (Date.now() - startTime) / 1000; // в секундах
    
    return NextResponse.json({
      success: true,
      message: `Миниатюры изображений успешно регенерированы (${duration.toFixed(2)} сек)`,
      results
    });
  } catch (error) {
    console.error('Ошибка при регенерации миниатюр:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при регенерации миниатюр' },
      { status: 500 }
    );
  }
}

/**
 * Регенерирует миниатюры для всех изображений
 */
async function regenerateImageThumbnails(): Promise<{
  totalProcessed: number;
  totalOptimized: number;
  totalThumbnails: number;
  totalErrors: number;
  directories: OptimizationResult[];
}> {
  // Директории с изображениями
  const imageDirectories = [
    'articles',
    'specialists',
    'services',
    'users',
    'gallery'
  ];
  
  // Результаты по каждой директории
  const results: OptimizationResult[] = [];
  let totalProcessed = 0;
  let totalOptimized = 0;
  let totalThumbnails = 0;
  let totalErrors = 0;
  
  // Обрабатываем каждую директорию
  for (const dir of imageDirectories) {
    try {
      const result = await processImagesInDirectory(dir);
      results.push(result);
      
      totalProcessed += result.processed;
      totalOptimized += result.optimized;
      totalThumbnails += result.thumbnailsCreated;
      totalErrors += result.errors;
    } catch (error) {
      console.error(`Ошибка при обработке директории ${dir}:`, error);
      results.push({
        directory: dir,
        processed: 0,
        optimized: 0,
        thumbnailsCreated: 0,
        errors: 1
      });
      totalErrors++;
    }
  }
  
  return {
    totalProcessed,
    totalOptimized,
    totalThumbnails,
    totalErrors,
    directories: results
  };
}

/**
 * Обрабатывает изображения в указанной директории
 */
async function processImagesInDirectory(dirName: string): Promise<OptimizationResult> {
  const result: OptimizationResult = {
    directory: dirName,
    processed: 0,
    optimized: 0,
    thumbnailsCreated: 0,
    errors: 0
  };
  
  const settings = getImageSettings();
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', dirName);
  const thumbnailsDir = path.join(process.cwd(), 'public', 'uploads', dirName, 'thumbnails');
  
  // Проверяем существование директории
  if (!fs.existsSync(uploadsDir)) {
    console.log(`Директория ${uploadsDir} не существует, пропускаем`);
    return result;
  }
  
  // Создаем директорию для миниатюр, если её нет
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }
  
  // Получаем список всех файлов в директории
  const files = fs.readdirSync(uploadsDir)
    .filter(file => isImageFile(file));
  
  // Обрабатываем каждый файл
  for (const file of files) {
    try {
      const filePath = path.join(uploadsDir, file);
      const thumbnailPath = path.join(thumbnailsDir, file);
      
      // Пропускаем директории
      if (fs.statSync(filePath).isDirectory()) {
        continue;
      }
      
      result.processed++;
      
      // Создаем миниатюру
      await sharp(filePath)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: settings.quality })
        .toFile(thumbnailPath.replace(/\.\w+$/, '.webp'));
      
      result.thumbnailsCreated++;
      
      // Оптимизируем оригинальное изображение, если оно больше заданного размера
      const metadata = await sharp(filePath).metadata();
      if (metadata.width && metadata.width > settings.maxWidth) {
        const optimizedPath = filePath + '.optimized';
        
        await sharp(filePath)
          .resize(settings.maxWidth)
          .toFormat(metadata.format as keyof sharp.FormatEnum, { quality: settings.quality })
          .toFile(optimizedPath);
        
        // Заменяем оригинал оптимизированным
        fs.unlinkSync(filePath);
        fs.renameSync(optimizedPath, filePath);
        
        result.optimized++;
      }
    } catch (error) {
      console.error(`Ошибка при обработке файла ${file}:`, error);
      result.errors++;
    }
  }
  
  return result;
}

/**
 * Проверяет, является ли файл изображением
 */
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(filename).toLowerCase();
  return imageExtensions.includes(ext);
} 