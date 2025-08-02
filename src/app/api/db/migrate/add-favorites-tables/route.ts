import { NextResponse } from 'next/server';
import { db } from '@/database/db';
import { initDB } from '@/app/api/db';

// Функция для создания таблиц избранного
export async function GET() {
  try {
    console.log('[API] Начало миграции таблиц избранного...');
    
    // Инициализируем базу данных
    initDB();
    
    // Создаем таблицу для избранных статей
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_favorite_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        article_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, article_id)
      )
    `);
    console.log('[API] Таблица user_favorite_articles создана или уже существует');
    
    // Создаем таблицу для избранных услуг
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_favorite_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, service_id)
      )
    `);
    console.log('[API] Таблица user_favorite_services создана или уже существует');
    
    // Создаем таблицу для избранных специалистов
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_favorite_specialists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        specialist_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, specialist_id)
      )
    `);
    console.log('[API] Таблица user_favorite_specialists создана или уже существует');
    
    // Создаем индексы для ускорения поиска
    db.exec(`CREATE INDEX IF NOT EXISTS idx_user_favorite_articles_user_id ON user_favorite_articles(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_user_favorite_services_user_id ON user_favorite_services(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_user_favorite_specialists_user_id ON user_favorite_specialists(user_id)`);
    
    console.log('[API] Миграция таблиц избранного успешно завершена');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Таблицы избранного успешно созданы' 
    });
  } catch (error) {
    console.error('[API] Ошибка при миграции таблиц избранного:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка при создании таблиц избранного', 
      error: (error as Error).message 
    }, { status: 500 });
  }
} 