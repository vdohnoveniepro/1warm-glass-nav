import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { initializeDatabase } from '@/database/schema';
import path from 'path';
import fs from 'fs';

// GET /api/debug - получить информацию о базе данных для отладки
export async function GET(request: NextRequest) {
  console.log('[API Debug] Начало обработки запроса GET /api/debug');
  
  try {
    const dbPath = path.join(process.cwd(), 'src', 'database', 'vdohnovenie.db');
    const dbExists = fs.existsSync(dbPath);
    const dbSize = dbExists ? fs.statSync(dbPath).size : 0;
    
    // Проверка соединения с базой данных
    let dbConnection = false;
    let testResult = null;
    try {
      testResult = db.prepare('SELECT 1 AS test').get();
      dbConnection = !!testResult;
    } catch (error) {
      console.error('[API Debug] Ошибка при проверке соединения с базой данных:', error);
    }
    
    // Проверка таблиц
    let tables: string[] = [];
    try {
      const tablesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      tables = tablesResult.map((t: any) => t.name);
    } catch (error) {
      console.error('[API Debug] Ошибка при получении списка таблиц:', error);
    }
    
    // Проверка и миграция структуры таблицы users
    let usersTableInfo: any[] = [];
    let hasLastLoginColumn = false;
    try {
      usersTableInfo = db.prepare("PRAGMA table_info(users)").all();
      hasLastLoginColumn = usersTableInfo.some(col => col.name === 'lastLogin');
      
      // Если столбца lastLogin нет, добавляем его
      if (!hasLastLoginColumn) {
        console.log('[API Debug] Добавление столбца lastLogin в таблицу users');
        db.prepare("ALTER TABLE users ADD COLUMN lastLogin TEXT").run();
        console.log('[API Debug] Столбец lastLogin успешно добавлен');
        hasLastLoginColumn = true;
      }
    } catch (error) {
      console.error('[API Debug] Ошибка при проверке/миграции таблицы users:', error);
    }
    
    // Проверка данных специалистов
    let specialistsCount = 0;
    try {
      const countResult = db.prepare('SELECT COUNT(*) as count FROM specialists').get();
      specialistsCount = countResult?.count || 0;
    } catch (error) {
      console.error('[API Debug] Ошибка при подсчете специалистов:', error);
    }
    
    // Проверка данных услуг
    let servicesCount = 0;
    try {
      const countResult = db.prepare('SELECT COUNT(*) as count FROM services').get();
      servicesCount = countResult?.count || 0;
    } catch (error) {
      console.error('[API Debug] Ошибка при подсчете услуг:', error);
    }
    
    // Проверка данных отзывов
    let reviewsCount = 0;
    try {
      const countResult = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
      reviewsCount = countResult?.count || 0;
    } catch (error) {
      console.error('[API Debug] Ошибка при подсчете отзывов:', error);
    }
    
    // Если база данных не инициализирована, пробуем инициализировать
    if (!dbConnection || tables.length === 0) {
      console.log('[API Debug] Попытка инициализации базы данных...');
      try {
        initializeDatabase();
        console.log('[API Debug] База данных успешно инициализирована');
        
        // Повторная проверка таблиц
        const tablesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        tables = tablesResult.map((t: any) => t.name);
      } catch (error) {
        console.error('[API Debug] Ошибка при инициализации базы данных:', error);
      }
    }
    
    return NextResponse.json({
      dbExists,
      dbSize: `${(dbSize / (1024 * 1024)).toFixed(2)} MB`,
      dbConnection,
      testResult,
      tables,
      usersTable: {
        columns: usersTableInfo,
        hasLastLoginColumn
      },
      counts: {
        specialists: specialistsCount,
        services: servicesCount,
        reviews: reviewsCount
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('[API Debug] Критическая ошибка:', error);
    return NextResponse.json({ 
      error: 'Ошибка при отладке базы данных',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
} 