import { db } from '@/app/api/db';

interface Settings {
  favicon?: string;
  [key: string]: any;
}

/**
 * Получает настройки сайта из базы данных SQLite
 * @returns Объект с настройками или null в случае ошибки
 */
export async function getSettings(): Promise<Settings | null> {
  try {
    // Получаем все настройки из таблицы settings
    const stmt = db.prepare('SELECT name, value FROM settings');
    const settingsRows = stmt.all() as Array<{ name: string, value: string }>;
    
    if (!settingsRows || settingsRows.length === 0) {
      console.log('Настройки не найдены в базе данных');
      return null;
    }
    
    // Преобразуем массив строк в объект настроек
    const settings: Settings = {};
    settingsRows.forEach((row) => {
      try {
        // Пробуем распарсить значение как JSON, если не получается, используем как строку
        settings[row.name] = JSON.parse(row.value);
      } catch {
        settings[row.name] = row.value;
      }
    });
    
    // Изменяем путь к favicon, если он использует стандартный файл favicon.ico
    if (settings.favicon && settings.favicon.includes('favicon.ico')) {
      settings.favicon = settings.favicon.replace('favicon.ico', 'site-icon.ico');
    }
    
    return settings;
  } catch (error) {
    console.error('Ошибка при чтении настроек из базы данных:', error);
    return null;
  }
}

/**
 * Сохраняет настройки сайта в базу данных SQLite
 * @param settings Объект с настройками для сохранения
 * @returns true в случае успеха, false в случае ошибки
 */
export async function saveSettings(settings: Settings): Promise<boolean> {
  try {
    // Начинаем транзакцию
    db.prepare('BEGIN').run();
    
    try {
      // Для каждой настройки выполняем UPSERT (INSERT OR REPLACE)
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO settings (id, name, value, updatedAt)
        VALUES (?, ?, ?, ?)
      `);
      
      const now = new Date().toISOString();
      
      Object.entries(settings).forEach(([name, value]) => {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        stmt.run(name, name, valueStr, now);
      });
      
      // Завершаем транзакцию
      db.prepare('COMMIT').run();
      
      return true;
    } catch (error) {
      // В случае ошибки отменяем транзакцию
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при сохранении настроек в базу данных:', error);
    return false;
  }
} 