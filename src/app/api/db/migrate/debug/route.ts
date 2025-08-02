import { NextRequest, NextResponse } from 'next/server';
import { migrateData, getDebugInfo } from '@/database/migration';
import { initDB } from '../../';
import fs from 'fs';
import path from 'path';

export const POST = async (req: NextRequest) => {
  const debugInfo: any = {
    step: 'начало',
    errors: [],
    success: false
  };
  
  try {
    // Проверка существования директории с данными
    const dataDir = path.join(process.cwd(), 'public', 'data');
    debugInfo.dataDirectoryExists = fs.existsSync(dataDir);
    debugInfo.dataDirectory = dataDir;
    
    if (!debugInfo.dataDirectoryExists) {
      debugInfo.errors.push('Директория с данными не найдена');
      return NextResponse.json(debugInfo);
    }
    
    // Получаем список JSON файлов
    debugInfo.step = 'проверка файлов';
    const jsonFiles: string[] = [];
    
    try {
      const checkSubdir = (dir: string) => {
        if (fs.existsSync(dir)) {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
              checkSubdir(fullPath);
            } else if (path.extname(fullPath) === '.json') {
              jsonFiles.push(fullPath.replace(process.cwd(), ''));
            }
          }
        }
      };
      
      checkSubdir(dataDir);
      debugInfo.jsonFiles = jsonFiles;
    } catch (error) {
      debugInfo.errors.push(`Ошибка при сканировании директории: ${error}`);
    }
    
    // Проверка доступа к базе данных
    debugInfo.step = 'проверка базы данных';
    try {
      const dbDir = path.join(process.cwd(), 'src', 'database');
      const dbPath = path.join(dbDir, 'vdohnovenie.db');
      
      debugInfo.dbDirectoryExists = fs.existsSync(dbDir);
      debugInfo.dbExists = fs.existsSync(dbPath);
      debugInfo.canWriteToDbDir = true;
      
      try {
        // Пробуем создать временный файл для проверки прав записи
        const testPath = path.join(dbDir, 'test-write.tmp');
        fs.writeFileSync(testPath, 'test');
        fs.unlinkSync(testPath);
      } catch (error) {
        debugInfo.canWriteToDbDir = false;
        debugInfo.writeError = `${error}`;
      }
    } catch (error) {
      debugInfo.errors.push(`Ошибка при проверке базы данных: ${error}`);
    }
    
    // Инициализируем базу данных
    debugInfo.step = 'инициализация базы данных';
    try {
      initDB();
      debugInfo.dbInitialized = true;
    } catch (error) {
      debugInfo.dbInitialized = false;
      debugInfo.errors.push(`Ошибка при инициализации базы данных: ${error}`);
      return NextResponse.json(debugInfo);
    }
    
    // Выполняем миграцию данных
    debugInfo.step = 'миграция данных';
    try {
      const success = await migrateData();
      debugInfo.migrationSuccess = success;
      
      // Получаем детальную отладочную информацию из модуля миграции
      const migrationDebugInfo = getDebugInfo();
      debugInfo.migration = migrationDebugInfo;
      
      if (success) {
        debugInfo.success = true;
        debugInfo.message = 'Миграция данных успешно завершена!';
      } else {
        debugInfo.errors.push('Произошла ошибка при миграции данных');
      }
    } catch (error) {
      debugInfo.errors.push(`Критическая ошибка при миграции данных: ${error}`);
      // Добавляем stack trace для более подробной отладки
      if (error instanceof Error) {
        debugInfo.errorStack = error.stack;
      }
    }
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    debugInfo.errors.push(`Неожиданная ошибка: ${error}`);
    if (error instanceof Error) {
      debugInfo.errorStack = error.stack;
    }
    return NextResponse.json(debugInfo);
  }
}; 