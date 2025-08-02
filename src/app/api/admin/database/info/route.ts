import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { initDB } from '@/app/api/db';
import path from 'path';

// Инициализируем базу данных
initDB();

// Путь к базе данных SQLite
const DB_PATH = path.join(process.cwd(), 'src', 'database', 'vdohnovenie.db');

export async function GET(req: NextRequest) {
  try {
    console.log(`[API] Доступ разрешен для всех пользователей`);
    
    try {
      // Получаем список таблиц из базы данных
      const tablesQuery = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      const tables = tablesQuery.all().map((row: any) => row.name);
      
      return NextResponse.json({
        success: true,
        dbPath: DB_PATH,
        tables,
        version: db.pragma('user_version', { simple: true })
      });
    } catch (sqlError: any) {
      console.error('Ошибка при получении информации о базе данных:', sqlError);
      return NextResponse.json({
        success: false,
        error: `Ошибка SQL: ${sqlError.message}`
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Ошибка при обработке запроса:', error);
    return NextResponse.json({
      success: false,
      error: `Ошибка сервера: ${error.message}`
    }, { status: 500 });
  }
} 