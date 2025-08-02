import { db, getDatabase } from './db';
import { initializeDatabase } from './schema';
import { migrateData } from './migration';

// Экспорт API
export * from './api';
export * from './adapters';

// Экспорт основных функций
export {
  db,
  getDatabase,
  initializeDatabase,
  migrateData
}; 