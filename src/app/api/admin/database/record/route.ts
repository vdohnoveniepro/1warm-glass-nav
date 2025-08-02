import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { initDB } from '@/app/api/db';

// Инициализируем базу данных
initDB();

// Обработчик POST запросов (создание и обновление записей)
export async function POST(request: NextRequest) {
  try {
    console.log(`[API] Доступ разрешен для всех пользователей`);
    
    const data = await request.json();
    const { table, action, record, where } = data;

    if (!table) {
      return NextResponse.json({ success: false, error: 'Не указана таблица' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ success: false, error: 'Не указано действие' }, { status: 400 });
    }

    try {
      // Получаем информацию о структуре таблицы
      const tableInfoQuery = db.prepare(`PRAGMA table_info(${table})`);
      const tableInfo = tableInfoQuery.all();
      
      // Действие: создание новой записи
      if (action === 'create') {
        if (!record || Object.keys(record).length === 0) {
          return NextResponse.json({ success: false, error: 'Не указаны данные для создания записи' }, { status: 400 });
        }
        
        // Формируем SQL запрос для вставки
        const columns = Object.keys(record);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(col => record[col]);
        
        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
        const result = db.prepare(query).run(...values);
        
        return NextResponse.json({
          success: true,
          message: 'Запись успешно создана',
          result: {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid
          }
        });
      }
      
      // Действие: обновление записи
      else if (action === 'update') {
        if (!record || Object.keys(record).length === 0) {
          return NextResponse.json({ success: false, error: 'Не указаны данные для обновления записи' }, { status: 400 });
        }
        
        if (!where || Object.keys(where).length === 0) {
          return NextResponse.json({ success: false, error: 'Не указаны условия для обновления записи' }, { status: 400 });
        }
        
        // Формируем SQL запрос для обновления
        const setClause = Object.keys(record).map(col => `${col} = ?`).join(', ');
        const whereClause = Object.keys(where).map(col => `${col} = ?`).join(' AND ');
        const values = [...Object.keys(record).map(col => record[col]), ...Object.keys(where).map(col => where[col])];
        
        const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        const result = db.prepare(query).run(...values);
        
        return NextResponse.json({
          success: true,
          message: 'Запись успешно обновлена',
          result: {
            changes: result.changes
          }
        });
      }
      
      // Действие: удаление записи
      else if (action === 'delete') {
        if (!where || Object.keys(where).length === 0) {
          return NextResponse.json({ success: false, error: 'Не указаны условия для удаления записи' }, { status: 400 });
        }
        
        // Формируем SQL запрос для удаления
        const whereClause = Object.keys(where).map(col => `${col} = ?`).join(' AND ');
        const values = Object.keys(where).map(col => where[col]);
        
        const query = `DELETE FROM ${table} WHERE ${whereClause}`;
        const result = db.prepare(query).run(...values);
        
        return NextResponse.json({
          success: true,
          message: 'Запись успешно удалена',
          result: {
            changes: result.changes
          }
        });
      }
      
      else {
        return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 });
      }
    } catch (sqlError: any) {
      console.error('Ошибка при выполнении операции с записью:', sqlError);
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