import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { initDB } from '@/app/api/db';

// Инициализируем базу данных
initDB();

// Путь к базе данных SQLite
const DB_PATH = path.join(process.cwd(), 'src', 'database', 'vdohnovenie.db');

export async function GET(req: NextRequest) {
  try {
    console.log(`[API] Доступ разрешен для всех пользователей`);
    
    // Проверяем, существует ли файл базы данных
    try {
      await fs.access(DB_PATH);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'База данных не найдена' },
        { status: 404 }
      );
    }
    
    // Читаем файл базы данных
    const fileBuffer = await fs.readFile(DB_PATH);
    
    // Возвращаем файл базы данных для скачивания
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename=vdohnovenie.db'
      }
    });
  } catch (error: any) {
    console.error(`Ошибка при скачивании базы данных:`, error);
    return NextResponse.json(
      { success: false, error: `Ошибка при скачивании базы данных: ${error.message}` },
      { status: 500 }
    );
  }
} 