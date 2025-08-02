import { getDatabase } from '@/database';
import { Database } from 'better-sqlite3';
export { db } from '@/app/api/db';

// Создаем промис для асинхронного получения базы данных
let dbPromise: Promise<Database> | null = null;

// Функция для получения соединения с базой данных
export async function getDb() {
  try {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        try {
          const { db } = getDatabase();
          
          // Добавляем методы all и run, если их нет
          if (!db.all) {
            db.all = function(sql: string, params: any[] = []) {
              try {
                const stmt = this.prepare(sql);
                // Проверяем, является ли params массивом
                if (Array.isArray(params)) {
                  return stmt.all(...params);
                } else if (params !== undefined) {
                  return stmt.all(params);
                } else {
                  return stmt.all();
                }
              } catch (error) {
                console.error(`Ошибка при выполнении запроса all: ${sql}`, error);
                // Возвращаем пустой массив в случае ошибки
                return [];
              }
            };
          }
          
          resolve(db);
        } catch (error) {
          console.error('Ошибка при получении соединения с базой данных:', error);
          reject(error);
        }
      });
    }
    
    return await dbPromise;
  } catch (error) {
    console.error('Ошибка при получении соединения с базой данных:', error);
    throw error;
  }
}

export function ensureDatabaseInitialized() {
  try {
    const { initDB } = require('@/app/api/db');
    initDB();
  } catch (error) {
    console.error('Ошибка при инициализации базы данных SQLite:', error);
  }
}

ensureDatabaseInitialized();
