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
    const tableName = searchParams.get('table');
    const format = searchParams.get('format') || 'json';
    
    if (!tableName) {
      return NextResponse.json(
        { success: false, error: 'Не указано имя таблицы' },
        { status: 400 }
      );
    }
    
    try {
      // Получаем все данные из таблицы
      const query = db.prepare(`SELECT * FROM ${tableName}`);
      const rows = query.all();
      
      if (format === 'json') {
        // Экспорт в JSON
        const jsonData = JSON.stringify(rows, null, 2);
        
        return new NextResponse(jsonData, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename=${tableName}.json`
          }
        });
      } else if (format === 'csv') {
        // Экспорт в CSV
        if (rows.length === 0) {
          return new NextResponse('', {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename=${tableName}.csv`
            }
          });
        }
        
        const headers = Object.keys(rows[0]);
        let csv = headers.join(',') + '\n';
        
        rows.forEach(row => {
          const values = headers.map(header => {
            const val = row[header];
            // Экранируем значения, содержащие запятые, кавычки или переносы строк
            if (val === null || val === undefined) {
              return '';
            } else if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
              return `"${val.replace(/"/g, '""')}"`;
            } else {
              return val;
            }
          });
          csv += values.join(',') + '\n';
        });
        
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=${tableName}.csv`
          }
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Неподдерживаемый формат экспорта' },
          { status: 400 }
        );
      }
    } catch (sqlError: any) {
      console.error(`Ошибка при экспорте таблицы ${tableName}:`, sqlError);
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