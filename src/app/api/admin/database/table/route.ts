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
    
    // Получаем параметры запроса
    const searchParams = req.nextUrl.searchParams;
    const tableName = searchParams.get('name');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    if (!tableName) {
      return NextResponse.json(
        { success: false, error: 'Не указано имя таблицы' },
        { status: 400 }
      );
    }
    
    try {
      // Получаем общее количество записей в таблице
      const countQuery = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
      const { count } = countQuery.get();
      
      // Получаем данные с пагинацией
      const offset = (page - 1) * pageSize;
      const dataQuery = db.prepare(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`);
      const rows = dataQuery.all(pageSize, offset);
      
      // Получаем информацию о структуре таблицы
      const tableInfoQuery = db.prepare(`PRAGMA table_info(${tableName})`);
      const tableInfo = tableInfoQuery.all();
      
      // Формируем список столбцов
      const columns = tableInfo.map((col: any) => ({
        name: col.name,
        type: col.type,
        notnull: col.notnull === 1,
        pk: col.pk === 1
      }));
      
      return NextResponse.json({
        success: true,
        table: tableName,
        columns: columns.map((col: any) => col.name),
        columnsInfo: columns,
        rows,
        total: count,
        page,
        pageSize
      });
    } catch (sqlError: any) {
      console.error(`Ошибка при получении данных таблицы ${tableName}:`, sqlError);
      return NextResponse.json({
        success: false,
        error: `Ошибка SQL: ${sqlError.message}`
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`Ошибка при обработке запроса:`, error);
    return NextResponse.json(
      { success: false, error: `Ошибка сервера: ${error.message}` },
      { status: 500 }
    );
  }
} 