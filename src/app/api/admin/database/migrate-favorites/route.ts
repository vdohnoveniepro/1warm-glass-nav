import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/models/types';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/database/db';
import path from 'path';
import fs from 'fs';
import { initDB } from '@/app/api/db';

// Функция для чтения JSON файла
const readJsonFile = (filePath: string): any[] => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Файл не найден: ${filePath}`);
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка чтения файла ${filePath}:`, error);
    return [];
  }
};

// POST /api/admin/database/migrate-favorites - запуск миграции избранного
export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию и права администратора
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, message: 'Необходимы права администратора' },
        { status: 403 }
      );
    }
    
    // Запускаем миграцию избранного
    console.log('Запуск миграции избранного...');
    
    // 1. Проверяем, есть ли колонка favorites у пользователей
    try {
      // Обновляем схему таблицы пользователей, добавляя колонку favorites, если ее нет
      const columnsInfo = db.prepare("PRAGMA table_info(users)").all();
      const hasFavoritesColumn = columnsInfo.some((column: any) => column.name === 'favorites');
      
      if (!hasFavoritesColumn) {
        console.log('Добавляем колонку favorites в таблицу users');
        db.prepare("ALTER TABLE users ADD COLUMN favorites TEXT").run();
      }
    } catch (error) {
      console.error('Ошибка при проверке/обновлении схемы таблицы users:', error);
      return NextResponse.json(
        { success: false, message: 'Ошибка при обновлении схемы базы данных' },
        { status: 500 }
      );
    }
    
    // 2. Получаем данные пользователей из JSON
    const DATA_DIR = path.join(process.cwd(), 'public', 'data');
    const usersFilePath = path.join(DATA_DIR, 'users', 'users.json');
    const jsonUsers = readJsonFile(usersFilePath);
    
    if (jsonUsers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Не найдены данные пользователей в JSON-файлах' },
        { status: 404 }
      );
    }
    
    // 3. Подготавливаем и мигрируем данные избранного
    let usersWithFavorites = 0;
    let totalUsers = 0;
    
    for (const jsonUser of jsonUsers) {
      totalUsers++;
      
      try {
        // Получаем пользователя из SQLite
        const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(jsonUser.id);
        
        if (!dbUser) {
          console.warn(`Пользователь с ID ${jsonUser.id} не найден в базе SQLite. Пропускаем.`);
          continue;
        }
        
        // Проверяем наличие избранного в JSON
        if (jsonUser.favorites) {
          usersWithFavorites++;
          
          // Подготавливаем структуру избранного
          const favorites = {
            articles: jsonUser.favorites.articles || [],
            services: jsonUser.favorites.services || [],
            specialists: jsonUser.favorites.specialists || []
          };
          
          // Сериализуем и обновляем в базе
          const favoritesJson = JSON.stringify(favorites);
          
          db.prepare(`
            UPDATE users
            SET favorites = ?
            WHERE id = ?
          `).run(favoritesJson, jsonUser.id);
          
          console.log(`Обновлено избранное пользователя ${jsonUser.id}:`, {
            articles: favorites.articles.length,
            services: favorites.services.length,
            specialists: favorites.specialists.length
          });
        }
      } catch (error) {
        console.error(`Ошибка при миграции избранного для пользователя ${jsonUser.id}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Миграция избранного успешно завершена. Обновлено ${usersWithFavorites} из ${totalUsers} пользователей.`,
      stats: {
        totalUsers,
        usersWithFavorites
      }
    });
  } catch (error) {
    console.error('Ошибка при запуске миграции:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Ошибка сервера при миграции избранного',
        error: `${error}`
      },
      { status: 500 }
    );
  }
}

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