import { NextRequest, NextResponse } from 'next/server';
import { migrateData, getDebugInfo } from '@/database/migration';
import { initDB } from '../';
import { db } from '@/database/db';

// Функция для обновления структуры таблицы appointments
const updateAppointmentsTable = () => {
  try {
    // Проверяем, есть ли колонка price
    const columnsInfo = db.prepare("PRAGMA table_info(appointments)").all();
    const hasPriceColumn = columnsInfo.some((column: any) => column.name === 'price');
    const hasOriginalPriceColumn = columnsInfo.some((column: any) => column.name === 'originalPrice');
    
    if (!hasPriceColumn) {
      console.log('Добавляем колонку price в таблицу appointments');
      db.prepare("ALTER TABLE appointments ADD COLUMN price REAL DEFAULT 0").run();
    }
    
    if (!hasOriginalPriceColumn) {
      console.log('Добавляем колонку originalPrice в таблицу appointments');
      db.prepare("ALTER TABLE appointments ADD COLUMN originalPrice REAL DEFAULT 0").run();
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении структуры таблицы appointments:', error);
    return false;
  }
};

export const GET = async (req: NextRequest) => {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Обновляем структуру таблицы appointments
    const success = updateAppointmentsTable();
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Структура таблицы appointments успешно обновлена!'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Произошла ошибка при обновлении структуры таблицы appointments'
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Критическая ошибка: ${error}`,
      error: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Выполняем миграцию данных
    const success = await migrateData();
    
    // Получаем подробную информацию о миграции для отладки
    const debugInfo = getDebugInfo();
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Миграция данных успешно завершена!',
        details: debugInfo
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Произошла ошибка при миграции данных',
        details: debugInfo
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Критическая ошибка: ${error}`,
      error: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}; 