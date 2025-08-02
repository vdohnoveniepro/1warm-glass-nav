import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponse } from '@/models/types';

export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Проверка прав администратора
    if (user.role.toUpperCase() !== 'ADMIN' && user.email !== 'bakeevd@yandex.ru') {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Недостаточно прав'
      }, { status: 403 });
    }
    
    // Проверяем наличие таблицы site_visits
    const visitTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='site_visits'
    `).get();
    
    // Если таблицы нет, создаем её
    if (!visitTableExists) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS site_visits (
          id TEXT PRIMARY KEY,
          page TEXT NOT NULL,
          userId TEXT,
          sessionId TEXT NOT NULL,
          userAgent TEXT,
          ipAddress TEXT,
          referrer TEXT,
          timestamp TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      console.log('Таблица site_visits успешно создана');
    }
    
    // Проверяем наличие таблицы visit_statistics
    const statsTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='visit_statistics'
    `).get();
    
    // Если таблицы нет, создаем её
    if (!statsTableExists) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS visit_statistics (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          page TEXT NOT NULL,
          visits INTEGER DEFAULT 0,
          unique_visitors INTEGER DEFAULT 0,
          registered_users INTEGER DEFAULT 0,
          bounce_rate REAL DEFAULT 0,
          avg_time_on_page REAL DEFAULT 0,
          UNIQUE(date, page)
        )
      `);
      console.log('Таблица visit_statistics успешно создана');
    }
    
    // Проверяем наличие колонки views в таблице specialists
    const specialistsColumns = db.prepare("PRAGMA table_info(specialists)").all() as any[];
    const hasViewsColumn = specialistsColumns.some(col => col.name === 'views');
    
    // Если колонки нет, добавляем её
    if (!hasViewsColumn) {
      db.exec(`
        ALTER TABLE specialists
        ADD COLUMN views INTEGER DEFAULT 0
      `);
      console.log('Колонка views добавлена в таблицу specialists');
    }
    
    // Проверяем наличие колонки views в таблице articles
    const articlesColumns = db.prepare("PRAGMA table_info(articles)").all() as any[];
    const hasArticleViewsColumn = articlesColumns.some(col => col.name === 'views');
    
    // Если колонки нет, добавляем её
    if (!hasArticleViewsColumn) {
      db.exec(`
        ALTER TABLE articles
        ADD COLUMN views INTEGER DEFAULT 0
      `);
      console.log('Колонка views добавлена в таблицу articles');
    }
    
    // Возвращаем успешный результат
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: {
        message: 'Миграция успешно выполнена',
        tablesCreated: {
          site_visits: !visitTableExists,
          visit_statistics: !statsTableExists
        },
        columnsAdded: {
          specialists_views: !hasViewsColumn,
          articles_views: !hasArticleViewsColumn
        }
      }
    });
    
  } catch (error) {
    console.error('Ошибка при выполнении миграции:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при выполнении миграции'
    }, { status: 500 });
  }
} 