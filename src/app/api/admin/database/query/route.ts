import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { initDB } from '@/app/api/db';

// Инициализируем базу данных
initDB();

export async function POST(request: NextRequest) {
  try {
    console.log(`[API] Доступ разрешен для всех пользователей`);
    
    const data = await request.json();
    const { query } = data;

    if (!query) {
      return NextResponse.json({ success: false, error: 'SQL-запрос не указан' }, { status: 400 });
    }

    try {
      // Проверяем, что запрос не изменяет данные, если это не разрешено
      const isModifyingQuery = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\s+/i.test(query);
      const { allowModifying = false } = data;
      
      // Проверка разрешения на модификацию данных
      if (isModifyingQuery && !allowModifying) {
        return NextResponse.json({
          success: false,
          error: 'Для изменения данных необходимо включить опцию allowModifying=true'
        }, { status: 403 });
      }
      
      let result;
      
      if (isModifyingQuery) {
        // Выполняем запрос на изменение данных
        result = db.prepare(query).run();
        
        return NextResponse.json({
          success: true,
          result: {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid
          }
        });
      } else {
        // Выполняем запрос на чтение данных
        const stmt = db.prepare(query);
        const rows = stmt.all();
        
        // Получаем имена столбцов из первой строки результата
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        
        return NextResponse.json({
          success: true,
          columns,
          rows
        });
      }
    } catch (sqlError: any) {
      console.error('Ошибка при выполнении SQL-запроса:', sqlError);
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