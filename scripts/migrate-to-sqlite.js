const path = require('path');
const { migrateData } = require('../src/database/migration');

/**
 * Скрипт для запуска миграции данных из JSON в SQLite
 * 
 * Запуск: node scripts/migrate-to-sqlite.js
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