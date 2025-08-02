import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Путь к базе данных
const DB_PATH = path.join(process.cwd(), 'src', 'database', 'vdohnovenie.db');

// Флаг инициализации базы данных
let isInitialized = false;
let dbInstance: Database.Database | null = null;

// Переменная для отслеживания логирования (только первый раз за запуск процесса)
let hasLoggedDbConnection = false;

// Создаем директорию, если она не существует
const ensureDirectoryExists = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Функция для кастомного логирования SQL-запросов
const customLogger = (message?: any) => {
  // Фильтруем часто повторяющиеся сообщения
  const skipPatterns = [
    'SELECT name FROM sqlite_master',
    'База данных SQLite уже инициализирована',
    'getCurrentUser',
    'PRAGMA',
    'select sqlite_version()'
  ];
  
  // Пропускаем сообщения, которые содержат часто встречающиеся паттерны
  if (typeof message === 'string' && skipPatterns.some(pattern => message.includes(pattern))) {
    return;
  }
  
  console.log(message);
};

// Инициализация базы данных
export const getDatabase = () => {
  if (dbInstance) {
    return { db: dbInstance, dbExists: true };
  }

  try {
    ensureDirectoryExists();
    
    // Проверяем, существует ли файл базы данных
    const dbExists = fs.existsSync(DB_PATH);
    
    // Логируем только при первом подключении
    if (!hasLoggedDbConnection) {
      console.log('Подключение к базе данных SQLite...');
      hasLoggedDbConnection = true;
    }
    
    // Создаем подключение к базе данных с улучшенными настройками
    const db = new Database(DB_PATH, {
      fileMustExist: false, // Создаем файл, если он не существует
      readonly: false,
      timeout: 30000, // Увеличиваем таймаут до 30 секунд
      verbose: process.env.NODE_ENV === 'development' ? customLogger : undefined,
    });
    
    // Устанавливаем busy_timeout для предотвращения ошибок блокировки
    db.pragma('busy_timeout = 15000');
    
    // Включаем режим WAL для улучшения производительности и уменьшения блокировок
    db.pragma('journal_mode = WAL');
    
    // Устанавливаем синхронизацию
    db.pragma('synchronous = NORMAL');
    
    // Увеличиваем размер кэша
    db.pragma('cache_size = 10000');
    
    // Отключаем безопасное удаление для оптимизации
    db.pragma('secure_delete = OFF');
    
    // Сохраняем экземпляр для повторного использования
    dbInstance = db;
    
    return { db, dbExists };
  } catch (error) {
    console.error('Ошибка при подключении к базе данных:', error);
    throw new Error('Не удалось подключиться к базе данных');
  }
};

// Экспорт экземпляра базы данных
export const db = getDatabase().db;

// Экспорт функции для проверки инициализации
export const isDbInitialized = () => isInitialized;

// Функция для установки флага инициализации
export const setDbInitialized = (value: boolean) => {
  isInitialized = value;
};

// Закрытие соединения с базой данных при выходе
process.on('exit', () => {
  if (dbInstance) {
    console.log('Закрытие соединения с базой данных...');
    dbInstance.close();
    dbInstance = null;
  }
}); 