import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import crypto from 'crypto';

const execPromise = promisify(exec);

/**
 * Сохраняет оригинальное изображение из base64 строки (серверная версия)
 * @param base64 Base64 строка изображения или Buffer
 * @param subdirectory Поддиректория для сохранения изображения
 * @returns Путь к сохраненному изображению
 */
export async function saveOriginalImage(base64: string, subdirectory: string): Promise<string> {
  try {
    console.log(`[ImageProcessing] Сохранение изображения в директорию: ${subdirectory}`);
    
    // Создаем директорию, если она не существует
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subdirectory);
    console.log(`[ImageProcessing] Полный путь к директории: ${uploadDir}`);
    
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`[ImageProcessing] Создана директория: ${uploadDir}`);
      } catch (mkdirError) {
        console.error(`[ImageProcessing] Ошибка при создании директории: ${mkdirError}`);
        // Проверяем права доступа
        try {
          const stats = fs.statSync(path.dirname(uploadDir));
          console.log(`[ImageProcessing] Права доступа к родительской директории: ${stats.mode.toString(8)}`);
        } catch (statError) {
          console.error(`[ImageProcessing] Не удалось получить информацию о родительской директории: ${statError}`);
        }
      }
    }
    
    // Генерируем уникальный идентификатор для файла
    const fileId = uuidv4();
    console.log(`[ImageProcessing] Сгенерирован ID файла: ${fileId}`);
    
    // Извлекаем данные из base64
    let buffer: Buffer;
    let imageFormat = 'jpg';
    
    if (base64.startsWith('data:image/')) {
      // Извлекаем MIME тип и данные
      const matches = base64.match(/^data:image\/([a-zA-Z0-9-+.]+);base64,(.+)$/);
      
      if (!matches || matches.length !== 3) {
        console.error('[ImageProcessing] Неверный формат base64 изображения');
        throw new Error('Неверный формат base64 изображения');
      }
      
      imageFormat = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      console.log(`[ImageProcessing] Формат изображения: ${imageFormat}`);
      
      try {
        buffer = Buffer.from(matches[2], 'base64');
      } catch (bufferError) {
        console.error(`[ImageProcessing] Ошибка при создании буфера из base64: ${bufferError}`);
        throw bufferError;
      }
    } else {
      // Если это не data URL, предполагаем, что это уже чистый base64
      try {
        buffer = Buffer.from(base64, 'base64');
      } catch (bufferError) {
        console.error(`[ImageProcessing] Ошибка при создании буфера из чистого base64: ${bufferError}`);
        throw bufferError;
      }
    }
    
    // Проверяем размер буфера
    if (buffer.length === 0) {
      console.error('[ImageProcessing] Пустой буфер изображения');
      throw new Error('Пустой буфер изображения');
    }
    
    console.log(`[ImageProcessing] Создан буфер изображения размером ${buffer.length} байт`);
    
    try {
      // Обрабатываем изображение с помощью sharp
      let metadata;
      try {
        metadata = await sharp(buffer).metadata();
        console.log(`[ImageProcessing] Метаданные изображения: формат=${metadata.format}, размер=${metadata.width}x${metadata.height}`);
      } catch (metadataError) {
        console.error(`[ImageProcessing] Ошибка при получении метаданных: ${metadataError}`);
        // Продолжаем выполнение даже при ошибке с метаданными
      }
      
      // Конвертируем в WebP с оптимизацией
      const webpFilePath = path.join(uploadDir, `${fileId}.webp`);
      console.log(`[ImageProcessing] Путь к WebP файлу: ${webpFilePath}`);
      
      try {
        await sharp(buffer)
          .resize({
            width: 800,
            height: 800,
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({
            quality: 85,
            effort: 4
          })
          .toFile(webpFilePath);
        
        console.log(`[ImageProcessing] Изображение сохранено в формате WebP: ${webpFilePath}`);
      } catch (sharpError) {
        console.error(`[ImageProcessing] Ошибка при обработке изображения через Sharp: ${sharpError}`);
        throw sharpError;
      }
      
      // Проверяем, что файл был успешно создан
      if (fs.existsSync(webpFilePath)) {
        const stats = fs.statSync(webpFilePath);
        console.log(`[ImageProcessing] Размер WebP файла: ${stats.size} байт`);
        
        if (stats.size === 0) {
          console.error('[ImageProcessing] Созданный WebP файл имеет нулевой размер');
          throw new Error('Созданный WebP файл имеет нулевой размер');
        }
        
        // Возвращаем относительный путь для использования в веб
        const relativePath = `/uploads/${subdirectory}/${fileId}.webp`;
        console.log(`[ImageProcessing] Возвращаем относительный путь: ${relativePath}`);
        return relativePath;
      } else {
        console.error('[ImageProcessing] WebP файл не был создан');
        throw new Error('WebP файл не был создан');
      }
    } catch (sharpError) {
      console.error(`[ImageProcessing] Ошибка при обработке изображения через Sharp: ${sharpError}`);
      
      // Запасной вариант - сохраняем оригинальное изображение без обработки
      const fallbackPath = path.join(uploadDir, `${fileId}.${imageFormat}`);
      console.log(`[ImageProcessing] Сохраняем оригинальное изображение: ${fallbackPath}`);
      
      try {
        fs.writeFileSync(fallbackPath, buffer);
        console.log(`[ImageProcessing] Сохранено оригинальное изображение: ${fallbackPath}`);
      } catch (writeError) {
        console.error(`[ImageProcessing] Ошибка при записи файла: ${writeError}`);
        
        // Проверяем права доступа
        try {
          const stats = fs.statSync(uploadDir);
          console.log(`[ImageProcessing] Права доступа к директории: ${stats.mode.toString(8)}`);
        } catch (statError) {
          console.error(`[ImageProcessing] Не удалось получить информацию о директории: ${statError}`);
        }
        
        throw writeError;
      }
      
      // Проверяем, что файл был успешно создан
      if (fs.existsSync(fallbackPath)) {
        const stats = fs.statSync(fallbackPath);
        console.log(`[ImageProcessing] Размер оригинального файла: ${stats.size} байт`);
        
        if (stats.size === 0) {
          fs.unlinkSync(fallbackPath); // Удаляем пустой файл
          console.error('[ImageProcessing] Сохраненный файл имеет нулевой размер');
          throw new Error('Сохраненный файл имеет нулевой размер');
        }
        
        const relativePath = `/uploads/${subdirectory}/${fileId}.${imageFormat}`;
        console.log(`[ImageProcessing] Возвращаем относительный путь: ${relativePath}`);
        return relativePath;
      } else {
        console.error('[ImageProcessing] Не удалось сохранить изображение');
        throw new Error('Не удалось сохранить изображение');
      }
    }
  } catch (error) {
    console.error(`[ImageProcessing] Ошибка при сохранении изображения: ${error}`);
    throw error;
  }
}

/**
 * Получение информации об изображении (серверная версия)
 */
export const getImageInfo = async (
  filePath: string
): Promise<{ width: number; height: number; format: string; size: number }> => {
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Файл не найден: ${fullPath}`);
    }
    
    const stats = fs.statSync(fullPath);
    const metadata = await sharp(fullPath).metadata();
    
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: stats.size
    };
  } catch (error) {
    console.error(`Ошибка при получении информации об изображении: ${error}`);
    return {
      width: 0,
      height: 0,
      format: 'unknown',
      size: 0
    };
  }
};

// Вспомогательные функции для работы с файлами

/**
 * Создает директорию для загрузки файлов
 */
export const createUploadDir = (fileId: string): string => {
  // Сохраняем все файлы в корневой директории specialists без создания поддиректорий
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'specialists');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  return uploadDir;
};

/**
 * Создает директорию для документов специалиста
 */
export const createDocumentsDir = (specialistId: string): string => {
  const documentsDir = path.join(process.cwd(), 'public', 'uploads', 'documents', 'specialists', specialistId);
  
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }
  
  return documentsDir;
};

/**
 * Получает путь к оригинальному файлу
 */
export const getOriginalFilePath = (uploadDir: string, originalFileName: string): string => {
  return path.join(uploadDir, originalFileName);
};

/**
 * Получает путь к WebP файлу
 */
export const getWebpFilePath = (uploadDir: string, fileId: string): string => {
  return path.join(uploadDir, `${fileId}.webp`);
};

/**
 * Получает относительный путь к WebP файлу
 */
export const getWebpRelativePath = (fileId: string): string => {
  return `/uploads/specialists/${fileId}/${fileId}.webp`;
};

/**
 * Получает относительный путь к оригинальному файлу
 */
export const getOriginalRelativePath = (fileId: string, extension: string = 'jpg'): string => {
  return `/uploads/specialists/${fileId}/${fileId}.${extension}`;
};

/**
 * Получает путь к документу
 */
export const getDocumentFilePath = (documentsDir: string, fileName: string): string => {
  return path.join(documentsDir, fileName);
};

/**
 * Получает относительный путь к документу
 */
export const getDocumentRelativePath = (specialistId: string, fileName: string): string => {
  return `/uploads/documents/specialists/${specialistId}/${fileName}`;
};

/**
 * Получает полный путь к файлу в публичной директории
 */
export const getPublicPath = (relativePath: string): string => {
  return path.join(process.cwd(), 'public', relativePath);
};

/**
 * Проверяет существование файла
 */
export const checkFileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

/**
 * Получает статистику файла
 */
export const getStats = (filePath: string): fs.Stats => {
  return fs.statSync(filePath);
};

/**
 * Записывает файл асинхронно
 */
export const writeFile = async (filePath: string, data: Buffer): Promise<void> => {
  return fs.promises.writeFile(filePath, data);
};

/**
 * Записывает файл синхронно
 */
export const writeFileSync = (filePath: string, data: Buffer): void => {
  fs.writeFileSync(filePath, data);
};

/**
 * Получает метаданные изображения
 */
export const getMetadata = async (buffer: Buffer): Promise<sharp.Metadata> => {
  return sharp(buffer).metadata();
};

/**
 * Изменяет размер изображения
 */
export const resizeImage = (buffer: Buffer): sharp.Sharp => {
  return sharp(buffer).resize({
    width: 800,
    height: 800,
    fit: 'inside',
    withoutEnlargement: true
  });
};

/**
 * Удаляет файл
 */
export const deleteFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Ошибка при удалении файла ${filePath}:`, error);
    return false;
  }
};

// Экспортируем все функции вместе с основной
export default {
  saveOriginalImage,
  getImageInfo,
  createUploadDir,
  createDocumentsDir,
  getOriginalFilePath,
  getWebpFilePath,
  getWebpRelativePath,
  getOriginalRelativePath,
  getDocumentFilePath,
  getDocumentRelativePath,
  getPublicPath,
  checkFileExists,
  getStats,
  writeFile,
  writeFileSync,
  getMetadata,
  resizeImage,
  deleteFile
}; 