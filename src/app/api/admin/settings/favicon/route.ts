import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Проверяем, что получили данные base64
    if (!data.favicon || typeof data.favicon !== 'string' || !data.favicon.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Неверный формат данных изображения' },
        { status: 400 }
      );
    }
    
    // Удаляем префикс data:image/xyz;base64, из строки base64
    const matches = data.favicon.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json(
        { error: 'Неверный формат base64 данных' },
        { status: 400 }
      );
    }
    
    const imageType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Создаем метку времени для версионирования и предотвращения кеширования
    const timestamp = Date.now();
    
    // Путь для сохранения фавикона - изменяем на site-icon.ico вместо favicon.ico
    // чтобы избежать конфликта с путем /favicon.ico в Next.js
    const publicDir = path.join(process.cwd(), 'public');
    const faviconPath = path.join(publicDir, 'site-icon.ico');
    const timestampedIconName = `site-icon-${timestamp}.ico`;
    const timestampedIconPath = path.join(publicDir, timestampedIconName);
    
    try {
      // Используем sharp для преобразования изображения в ico формат
      // и создания нескольких размеров (16x16, 32x32, 48x48)
      const resizedBuffer = await sharp(buffer)
        .resize({
          width: 32,
          height: 32,
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFormat('png')
        .toBuffer();
      
      // Сохраняем файл как site-icon.ico вместо favicon.ico
      fs.writeFileSync(faviconPath, resizedBuffer);
      
      // Также сохраняем версионную копию фавикона для принудительного обновления
      fs.writeFileSync(timestampedIconPath, resizedBuffer);
      
      // Создаем фавиконы разных размеров для разных устройств
      await sharp(buffer)
        .resize(16, 16)
        .toFile(path.join(publicDir, 'favicon-16x16.png'));
      
      await sharp(buffer)
        .resize(32, 32)
        .toFile(path.join(publicDir, 'favicon-32x32.png'));
      
      await sharp(buffer)
        .resize(180, 180)
        .toFile(path.join(publicDir, 'apple-touch-icon.png'));
      
      await sharp(buffer)
        .resize(192, 192)
        .toFile(path.join(publicDir, 'android-chrome-192x192.png'));
    } catch (error) {
      console.error('Ошибка при обработке изображения:', error);
      // Если sharp не сработал, просто сохраняем оригинал
      fs.writeFileSync(faviconPath, buffer);
      fs.writeFileSync(timestampedIconPath, buffer);
    }
    
    // Сохраняем информацию о фавиконе в настройках
    const settingsDir = path.join(process.cwd(), 'public', 'data', 'settings');
    const settingsPath = path.join(settingsDir, 'general.json');
    
    // Создаем директорию, если она не существует
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    
    // Получаем текущие настройки или создаем новые
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      } catch (error) {
        console.error('Ошибка при чтении файла настроек:', error);
      }
    }
    
    // Обновляем настройки с информацией о фавиконе
    settings = {
      ...settings,
      favicon: `/${timestampedIconName}` // Версионная ссылка на фавикон с новым именем
    };
    
    // Сохраняем обновленные настройки
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Фавикон успешно обновлен',
      favicon: `/${timestampedIconName}`
    });
  } catch (error) {
    console.error('Ошибка при обновлении фавикона:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении фавикона' },
      { status: 500 }
    );
  }
} 