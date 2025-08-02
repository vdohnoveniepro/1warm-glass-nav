import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Интерфейс для настроек оптимизации изображений
export interface ImageSettings {
  enabled: boolean;
  quality: number;
  maxWidth: number;
  maxFileSize: number; // в МБ
  convertToWebp: boolean;
  lazyLoading: boolean;
}

// Настройки по умолчанию
const defaultSettings: ImageSettings = {
  enabled: true,
  quality: 85,
  maxWidth: 1200,
  maxFileSize: 10,
  convertToWebp: true,
  lazyLoading: true,
};

// Используем in-memory кэш вместо чтения из файла
let cachedSettings: ImageSettings = { ...defaultSettings };
let lastSettingsRead = 0;
const SETTINGS_CACHE_TTL = 60000; // 1 минута в миллисекундах

// Получение настроек изображений
export const getImageSettings = (): ImageSettings => {
  return cachedSettings || defaultSettings;
};

// Заглушка для сохранения настроек в серверном режиме
export const saveImageSettings = (settings: ImageSettings): boolean => {
  try {
    // Обновляем только кэш настроек
    cachedSettings = settings;
    lastSettingsRead = Date.now();
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении настроек изображений:', error);
    return false;
  }
};

/**
 * Обрабатывает изображение из base64 строки и возвращает обработанную строку
 * @param base64 Base64 строка изображения
 * @param subdirectory Используется для организации путей
 * @returns Путь к сгенерированному изображению или fallback
 */
export async function processImageFromBase64(base64: string, subdirectory: string): Promise<string> {
  try {
    // Проверка входных данных
    if (!base64 || typeof base64 !== 'string') {
      return `/images/photoPreview.jpg`;
    }

    // Упрощаем логику - возвращаем данные как есть
    // В реальной реализации здесь бы мы отправляли запрос на сервер для обработки
    // Но сейчас просто имитируем успешную загрузку
    
    // Генерируем уникальный идентификатор
    const fileName = uuidv4();
    
    // Возвращаем исходную строку base64 или временный URL
    // В реальном приложении здесь должен быть запрос к серверному API
    
    // Заглушка: возвращаем путь к изображению
    return `/uploads/${subdirectory}/${fileName}.webp`;
  } catch (error) {
    console.error('Ошибка при обработке изображения:', error);
    return `/images/photoPreview.jpg`;
  }
}

/**
 * Сохраняет оригинальное изображение из base64 строки
 * @param base64 Base64 строка изображения или Buffer
 * @param subdirectory Поддиректория для сохранения изображения
 * @returns Путь к сохраненному изображению
 */
export async function saveOriginalImage(base64: string, subdirectory: string): Promise<string> {
  // Клиентская заглушка - всегда возвращаем путь для генерации на сервере
  console.log('[ImageProcessing] Клиентская заглушка saveOriginalImage');
  return `/uploads/${subdirectory}/${uuidv4()}.jpg`;
}

/**
 * Получение информации об изображении
 */
export const getImageInfo = async (
  filePath: string
): Promise<{ width: number; height: number; format: string; size: number }> => {
  // Заглушка для браузерной среды
  return {
    width: 800,
    height: 600,
    format: 'jpeg',
    size: 100000
  };
};

/**
 * Загрузка фото специалиста - клиентская заглушка
 */
export async function uploadSpecialistPhoto(file: Blob, specialistId: string): Promise<string> {
  try {
    // В реальном приложении здесь был бы FormData и fetch на сервер
    return `/uploads/specialists/${specialistId}.jpg`;
  } catch (error) {
    console.error('Ошибка при загрузке фото специалиста:', error);
    return `/images/photoPreview.jpg`;
  }
}