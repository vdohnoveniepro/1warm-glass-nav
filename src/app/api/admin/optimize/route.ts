import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { revalidatePath } from 'next/cache';

// Настройки оптимизации по умолчанию
const DEFAULT_OPTIMIZATION_SETTINGS = {
  // Настройки для кэширования страниц и ресурсов
  caching: {
    enabled: true,
    apiCacheTTL: 300, // 5 минут
    staticAssetsTTL: 86400, // 24 часа
    browserCacheControl: true
  },
  // Настройки для предварительной загрузки
  preloading: {
    enabled: true,
    prefetchLinks: true,
    preconnect: true
  },
  // Настройки для изображений
  images: {
    lazyLoad: true,
    optimizeOnUpload: true,
    convertToWebP: true,
    quality: 85
  },
  // Настройки для JavaScript
  javascript: {
    minify: true,
    splitChunks: true,
    treeshaking: true
  },
  // Настройки для CSS
  css: {
    minify: true,
    purgeUnused: false
  }
};

// Путь к файлу с настройками оптимизации
const OPTIMIZATION_SETTINGS_PATH = path.join(process.cwd(), 'public/data/settings/optimization.json');

/**
 * Загружает текущие настройки оптимизации или создает файл с настройками по умолчанию, если файл не существует
 */
async function getOptimizationSettings() {
  try {
    // Проверяем, существует ли файл настроек
    if (!fs.existsSync(OPTIMIZATION_SETTINGS_PATH)) {
      // Создаем директорию, если она не существует
      const dir = path.dirname(OPTIMIZATION_SETTINGS_PATH);
      if (!fs.existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      
      // Создаем файл с настройками по умолчанию
      await writeFile(
        OPTIMIZATION_SETTINGS_PATH,
        JSON.stringify(DEFAULT_OPTIMIZATION_SETTINGS, null, 2)
      );
      
      return DEFAULT_OPTIMIZATION_SETTINGS;
    }
    
    // Чтение существующего файла
    const data = fs.readFileSync(OPTIMIZATION_SETTINGS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при загрузке настроек оптимизации:', error);
    return DEFAULT_OPTIMIZATION_SETTINGS;
  }
}

/**
 * Сохраняет обновленные настройки оптимизации
 */
async function saveOptimizationSettings(settings: any) {
  try {
    await writeFile(
      OPTIMIZATION_SETTINGS_PATH,
      JSON.stringify(settings, null, 2)
    );
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении настроек оптимизации:', error);
    return false;
  }
}

/**
 * GET-обработчик для получения настроек оптимизации
 */
export async function GET() {
  const settings = await getOptimizationSettings();
  return NextResponse.json(settings);
}

/**
 * POST-обработчик для обновления настроек оптимизации
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Сохраняем обновленные настройки
    const result = await saveOptimizationSettings(data);
    
    if (result) {
      // Перевалидируем все страницы для применения новых настроек
      revalidatePath('/');
      return NextResponse.json({ success: true, message: 'Настройки оптимизации обновлены' });
    } else {
      return NextResponse.json(
        { success: false, message: 'Не удалось сохранить настройки оптимизации' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Ошибка при обновлении настроек оптимизации:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при обновлении настроек оптимизации' },
      { status: 500 }
    );
  }
}

/**
 * Очищает все кэши и перевалидирует все страницы
 */
export async function DELETE() {
  try {
    // Перевалидируем все страницы
    revalidatePath('/', 'layout');
    
    return NextResponse.json({
      success: true,
      message: 'Кэш очищен и все страницы перевалидированы'
    });
  } catch (error) {
    console.error('Ошибка при очистке кэша:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при очистке кэша' },
      { status: 500 }
    );
  }
} 