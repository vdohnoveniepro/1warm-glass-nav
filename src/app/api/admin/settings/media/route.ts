import { NextRequest, NextResponse } from 'next/server';
import { getImageSettings, saveImageSettings, ImageSettings } from '@/lib/imageProcessing';

// GET /api/admin/settings/media - получить настройки медиа
export async function GET() {
  try {
    const settings = getImageSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка при получении настроек медиа:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении настроек медиа' },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/media - сохранить настройки медиа
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Валидация настроек
    if (typeof data.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Некорректное значение для поля enabled' },
        { status: 400 }
      );
    }

    if (typeof data.quality !== 'number' || data.quality < 10 || data.quality > 100) {
      return NextResponse.json(
        { error: 'Качество должно быть числом от 10 до 100' },
        { status: 400 }
      );
    }

    if (typeof data.maxWidth !== 'number' || data.maxWidth < 100) {
      return NextResponse.json(
        { error: 'Максимальная ширина должна быть числом не менее 100' },
        { status: 400 }
      );
    }

    if (typeof data.maxFileSize !== 'number' || data.maxFileSize < 1) {
      return NextResponse.json(
        { error: 'Максимальный размер файла должен быть числом не менее 1 МБ' },
        { status: 400 }
      );
    }

    if (typeof data.convertToWebp !== 'boolean') {
      return NextResponse.json(
        { error: 'Некорректное значение для поля convertToWebp' },
        { status: 400 }
      );
    }

    if (typeof data.lazyLoading !== 'boolean') {
      return NextResponse.json(
        { error: 'Некорректное значение для поля lazyLoading' },
        { status: 400 }
      );
    }

    // Создаем объект с настройками
    const settings: ImageSettings = {
      enabled: data.enabled,
      quality: data.quality,
      maxWidth: data.maxWidth,
      maxFileSize: data.maxFileSize,
      convertToWebp: data.convertToWebp,
      lazyLoading: data.lazyLoading,
    };

    // Сохраняем настройки
    const success = saveImageSettings(settings);

    if (!success) {
      return NextResponse.json(
        { error: 'Ошибка при сохранении настроек медиа' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки медиа успешно сохранены',
      settings,
    });
  } catch (error) {
    console.error('Ошибка при сохранении настроек медиа:', error);
    return NextResponse.json(
      { error: 'Ошибка при сохранении настроек медиа' },
      { status: 500 }
    );
  }
} 