import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { initDB } from '@/app/api/db';

// Инициализируем базу данных SQLite
initDB();

export async function GET(request: NextRequest) {
  try {
    console.log('[Миграция Telegram] Начало миграции для добавления полей Telegram');
    
    // Проверяем, существуют ли уже нужные колонки
    let columnsInfo = db.prepare("PRAGMA table_info(users)").all();
    const columns = columnsInfo.map((col: any) => col.name);
    
    const missingColumns = [];
    if (!columns.includes('telegramId')) missingColumns.push('telegramId');
    if (!columns.includes('telegramUsername')) missingColumns.push('telegramUsername');
    
    if (missingColumns.length === 0) {
      console.log('[Миграция Telegram] Все необходимые колонки уже существуют');
      return NextResponse.json({
        success: true,
        message: 'Все необходимые колонки уже существуют',
        columnsAdded: []
      });
    }
    
    // Начинаем транзакцию
    db.exec('BEGIN TRANSACTION');
    
    const columnsAdded = [];
    
    // Добавляем отсутствующие колонки
    if (missingColumns.includes('telegramId')) {
      db.exec('ALTER TABLE users ADD COLUMN telegramId TEXT');
      columnsAdded.push('telegramId');
      console.log('[Миграция Telegram] Добавлена колонка telegramId');
    }
    
    if (missingColumns.includes('telegramUsername')) {
      db.exec('ALTER TABLE users ADD COLUMN telegramUsername TEXT');
      columnsAdded.push('telegramUsername');
      console.log('[Миграция Telegram] Добавлена колонка telegramUsername');
    }
    
    // Фиксируем транзакцию
    db.exec('COMMIT');
    
    console.log('[Миграция Telegram] Миграция успешно завершена');
    return NextResponse.json({
      success: true,
      message: 'Миграция успешно завершена',
      columnsAdded
    });
  } catch (error) {
    // В случае ошибки откатываем транзакцию
    db.exec('ROLLBACK');
    
    console.error('[Миграция Telegram] Ошибка при миграции:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при миграции: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
} 