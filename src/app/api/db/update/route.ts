import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    console.log('[API] Запуск обновления структуры базы данных...');
    
    // Получаем соединение с базой данных
    const db = await getDb();
    
    // Проверяем наличие колонки avatar в таблице users
    const userColumns = await db.all("PRAGMA table_info(users)");
    const hasAvatarColumn = userColumns.some(col => col.name === 'avatar');
    const hasPhotoColumn = userColumns.some(col => col.name === 'photo');
    const hasPhotoUrlColumn = userColumns.some(col => col.name === 'photo_url');
    
    // Если колонки avatar нет, добавляем её
    if (!hasAvatarColumn) {
      console.log('[API] Добавляем колонку avatar в таблицу users');
      await db.run("ALTER TABLE users ADD COLUMN avatar TEXT");
    }
    
    // Если колонки photo_url нет, добавляем её
    if (!hasPhotoUrlColumn) {
      console.log('[API] Добавляем колонку photo_url в таблицу users');
      await db.exec('ALTER TABLE users ADD COLUMN photo_url TEXT');
    }
    
    // Обновляем photo_url из photo или avatar, если они есть
    if (hasPhotoUrlColumn) {
      console.log('[API] Обновляем photo_url из существующих аватаров');
      await db.exec(`
        UPDATE users 
        SET photo_url = photo 
        WHERE photo_url IS NULL AND photo IS NOT NULL
      `);
      
      await db.exec(`
        UPDATE users 
        SET photo_url = avatar 
        WHERE photo_url IS NULL AND avatar IS NOT NULL
      `);
    }
    
    // Если колонки photo нет, добавляем её
    if (!hasPhotoColumn) {
      console.log('[API] Добавляем колонку photo в таблицу users');
      await db.exec('ALTER TABLE users ADD COLUMN photo TEXT');
    }
    
    // Обновляем photo из photo_url для пользователей с Telegram
    if (hasPhotoColumn && hasPhotoUrlColumn) {
      console.log('[API] Обновляем photo из photo_url для пользователей Telegram');
      await db.exec(`
        UPDATE users 
        SET photo = photo_url 
        WHERE photo IS NULL AND photo_url IS NOT NULL AND telegramId IS NOT NULL
      `);
      
      await db.exec(`
        UPDATE users 
        SET avatar = photo_url 
        WHERE avatar IS NULL AND photo_url IS NOT NULL AND telegramId IS NOT NULL
      `);
    }
    
    // Обновляем данные - копируем значения из photo в avatar
    console.log('[API] Копируем данные из photo в avatar');
    await db.run(`
      UPDATE users 
      SET avatar = photo 
      WHERE photo IS NOT NULL AND (avatar IS NULL OR avatar = '')
    `);
    
    // Обновляем данные - копируем значения из photo_url в avatar и photo
    console.log('[API] Копируем данные из photo_url в avatar и photo');
    await db.run(`
      UPDATE users 
      SET avatar = photo_url, photo = photo_url 
      WHERE photo_url IS NOT NULL AND photo_url != '' AND (avatar IS NULL OR avatar = '')
    `);
    
    // Обновляем данные - копируем значения из avatar в photo_url
    console.log('[API] Копируем данные из avatar в photo_url');
    await db.run(`
      UPDATE users 
      SET photo_url = avatar 
      WHERE avatar IS NOT NULL AND avatar != '' AND (photo_url IS NULL OR photo_url = '')
    `);
    
    // Обновляем данные - копируем значения из photo в photo_url
    console.log('[API] Копируем данные из photo в photo_url');
    await db.run(`
      UPDATE users 
      SET photo_url = photo 
      WHERE photo IS NOT NULL AND photo != '' AND (photo_url IS NULL OR photo_url = '')
    `);
    
    console.log('[API] Обновление структуры базы данных завершено');
    
    return NextResponse.json({
      success: true,
      message: 'Структура базы данных успешно обновлена'
    });
  } catch (error) {
    console.error('[API] Ошибка при обновлении структуры базы данных:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении структуры базы данных'
    }, { status: 500 });
  }
}
