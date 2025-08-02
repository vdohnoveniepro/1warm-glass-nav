import { migrateData } from '../src/database/migration';

/**
 * Скрипт для запуска миграции данных из JSON в SQLite
 * 
 * Запуск: npx ts-node scripts/migrate-to-sqlite.ts
 */
const main = async () => {
  console.log('Запуск миграции данных из JSON в SQLite...');
  
  try {
    const success = await migrateData();
    
    if (success) {
      console.log('Миграция данных успешно завершена!');
      process.exit(0);
    } else {
      console.error('Произошла ошибка при миграции данных');
      process.exit(1);
    }
  } catch (error) {
    console.error('Критическая ошибка при миграции данных:', error);
    process.exit(1);
  }
};

main(); 