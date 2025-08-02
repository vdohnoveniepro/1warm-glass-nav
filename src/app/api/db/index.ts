import { initializeDatabase } from '@/database/schema';
import { db, isDbInitialized, setDbInitialized } from '@/database/db';

// Переменная для отслеживания логирования (только первый раз за запуск процесса)
let hasLoggedInitialization = false;

// Инициализируем базу данных при первом вызове API
// Это позволит гарантировать, что база данных будет создана перед использованием
export const initDB = () => {
  // Инициализируем базу только если она еще не была инициализирована
  if (!isDbInitialized()) {
    // Логируем только при первом вызове
    if (!hasLoggedInitialization) {
      console.log('[API] Инициализация базы данных SQLite...');
      hasLoggedInitialization = true;
    }
    
    // Выполняем инициализацию
    initializeDatabase();
    setDbInitialized(true);
    
    // Логируем успешную инициализацию только при первом вызове
    if (hasLoggedInitialization) {
      console.log('[API] База данных SQLite инициализирована');
    }
  }
  // Не выводим сообщение о том, что БД уже инициализирована - это слишком частое событие
};

// Экспортируем базу данных из @/database/db вместо локального экземпляра
export { db } from '@/database/db'; 