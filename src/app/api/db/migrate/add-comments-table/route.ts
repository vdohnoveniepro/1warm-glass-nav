import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { initDB } from '@/app/api/db';

// Инициализируем базу данных при импорте модуля
try {
  initDB();
  console.log('[Миграция комментариев] База данных инициализирована');
} catch (error) {
  console.error('[Миграция комментариев] Ошибка при инициализации базы данных:', error);
}

export async function GET(request: NextRequest) {
  try {
    console.log('[Миграция] Добавление таблицы комментариев...');

    // Проверяем существование таблицы
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='comments'
    `).get();

    if (tableExists) {
      console.log('[Миграция] Таблица comments уже существует');
      return NextResponse.json({
        success: true,
        message: 'Таблица comments уже существует'
      });
    }

    // Создаем таблицу комментариев
    db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userName TEXT NOT NULL,
        userAvatar TEXT,
        content TEXT NOT NULL,
        articleId TEXT NOT NULL,
        parentId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        likedBy TEXT,
        dislikedBy TEXT,
        photo TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (parentId) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    // Создаем индексы для улучшения производительности
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_comments_articleId ON comments (articleId);
      CREATE INDEX IF NOT EXISTS idx_comments_userId ON comments (userId);
      CREATE INDEX IF NOT EXISTS idx_comments_parentId ON comments (parentId);
    `);

    console.log('[Миграция] Таблица comments успешно создана с индексами');
    return NextResponse.json({
      success: true,
      message: 'Таблица comments успешно создана с индексами'
    });
  } catch (error) {
    console.error('[Миграция] Ошибка при создании таблицы comments:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка при создании таблицы comments',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 