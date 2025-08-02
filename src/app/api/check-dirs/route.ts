import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Функция для проверки и создания директории
const checkAndCreateDir = (dirPath: string) => {
  console.log(`[API] Проверка директории: ${dirPath}`);
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`[API] Директория не существует, создаю: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`[API] Директория создана: ${dirPath}`);
    } else {
      console.log(`[API] Директория существует: ${dirPath}`);
    }

    // Проверяем права на запись
    try {
      const testFilePath = path.join(dirPath, '.test_write_access');
      fs.writeFileSync(testFilePath, 'test');
      fs.unlinkSync(testFilePath);
      console.log(`[API] Есть права на запись в директорию: ${dirPath}`);
    } catch (writeError) {
      console.error(`[API] Нет прав на запись в директорию: ${dirPath}`, writeError);
      return { success: false, error: `Нет прав на запись в директорию: ${dirPath}` };
    }

    return { success: true };
  } catch (error) {
    console.error(`[API] Ошибка при работе с директорией: ${dirPath}`, error);
    return { success: false, error: String(error) };
  }
};

// Проверка необходимых файлов
const checkAndCreateFile = (filePath: string, defaultContent: string) => {
  console.log(`[API] Проверка файла: ${filePath}`);
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`[API] Файл не существует, создаю: ${filePath}`);
      fs.writeFileSync(filePath, defaultContent);
      console.log(`[API] Файл создан: ${filePath}`);
    } else {
      console.log(`[API] Файл существует: ${filePath}`);
    }
    return { success: true };
  } catch (error) {
    console.error(`[API] Ошибка при работе с файлом: ${filePath}`, error);
    return { success: false, error: String(error) };
  }
};

export async function GET(request: NextRequest) {
  const results: any[] = [];
  const basePath = path.join(process.cwd(), 'public', 'data');
  
  // Проверяем и создаем основную директорию для данных
  results.push({ path: basePath, ...checkAndCreateDir(basePath) });
  
  // Проверяем и создаем директории для каждого типа данных
  const directories = [
    'appointments',
    'settings',
    'specialists',
    'services',
    'users',
    'notifications'
  ];
  
  directories.forEach(dir => {
    const dirPath = path.join(basePath, dir);
    results.push({ path: dirPath, ...checkAndCreateDir(dirPath) });
  });
  
  // Проверяем и создаем необходимые файлы
  const files = [
    { 
      path: path.join(basePath, 'appointments', 'appointments.json'), 
      defaultContent: '[]' 
    },
    { 
      path: path.join(basePath, 'settings', 'appointments.json'), 
      defaultContent: '{"requireConfirmation": false}' 
    },
    { 
      path: path.join(basePath, 'users', 'users.json'), 
      defaultContent: '[]' 
    }
  ];
  
  files.forEach(file => {
    results.push({ 
      path: file.path, 
      ...checkAndCreateFile(file.path, file.defaultContent) 
    });
  });
  
  // Проверяем наличие правильного контента в файле настроек
  const settingsPath = path.join(basePath, 'settings', 'appointments.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const fileData = fs.readFileSync(settingsPath, 'utf8');
      
      if (fileData && fileData.trim() !== '') {
        const settings = JSON.parse(fileData);
        
        // Если настройки пустые или не содержат нужное свойство, обновляем их
        if (!settings || typeof settings !== 'object' || !('requireConfirmation' in settings)) {
          console.log('[API] Файл настроек не содержит необходимых свойств, обновляем...');
          const defaultSettings = { requireConfirmation: false };
          fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
          
          results.push({ 
            path: settingsPath, 
            success: true, 
            message: 'Файл настроек обновлен с корректными значениями'
          });
        } else {
          console.log('[API] Файл настроек содержит все необходимые свойства');
          results.push({ 
            path: settingsPath, 
            success: true, 
            message: 'Файл настроек содержит все необходимые свойства'
          });
        }
      }
    } catch (error) {
      console.error(`[API] Ошибка при проверке содержимого файла настроек:`, error);
      const defaultSettings = { requireConfirmation: false };
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      
      results.push({ 
        path: settingsPath, 
        success: true, 
        message: 'Файл настроек восстановлен после ошибки'
      });
    }
  }
  
  // Проверяем наличие ошибок
  const hasErrors = results.some(result => !result.success);
  
  return NextResponse.json({
    success: !hasErrors,
    results
  }, { status: hasErrors ? 500 : 200 });
} 