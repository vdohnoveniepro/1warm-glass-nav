/**
 * Скрипт для миграции данных из директории /data в директорию /public/data
 * 
 * Этот скрипт копирует все файлы JSON из директории /data в соответствующие поддиректории
 * в /public/data с правильной структурой.
 */

const fs = require('fs');
const path = require('path');

// Пути к директориям
const rootDir = process.cwd();
const oldDataDir = path.join(rootDir, 'data');
const newDataDir = path.join(rootDir, 'public', 'data');

// Создаем директорию, если она не существует
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Создана директория: ${dirPath}`);
  }
}

// Копирует файл данных в новую структуру
function migrateFile(fileName, subDir) {
  const oldPath = path.join(oldDataDir, fileName);
  
  // Проверяем существование файла
  if (!fs.existsSync(oldPath)) {
    console.log(`Файл ${oldPath} не найден, пропускаем`);
    return;
  }
  
  try {
    // Читаем данные из исходного файла
    const data = fs.readFileSync(oldPath, 'utf8');
    
    // Создаем директорию назначения
    const targetDir = path.join(newDataDir, subDir);
    ensureDir(targetDir);
    
    // Путь к файлу назначения
    const targetPath = path.join(targetDir, fileName);
    
    // Записываем данные в новый файл
    fs.writeFileSync(targetPath, data, 'utf8');
    console.log(`Файл ${fileName} успешно перенесен в ${targetPath}`);
  } catch (error) {
    console.error(`Ошибка при переносе файла ${fileName}:`, error);
  }
}

// Проверяем и создаем основную директорию
ensureDir(newDataDir);

// Переносим все JSON файлы с соответствующей структурой
migrateFile('specialists.json', 'specialists');
migrateFile('services.json', 'services');
migrateFile('appointments.json', 'appointments');
migrateFile('articles.json', 'articles');
migrateFile('reviews.json', 'reviews');
migrateFile('events.json', 'events');
migrateFile('users.json', 'users');
migrateFile('settings.json', 'settings');
migrateFile('notifications.json', 'notifications');
migrateFile('notification_settings.json', 'settings');
migrateFile('notification_templates.json', 'settings');

// Проверяем директории с вложенными файлами
const subDirs = ['services', 'specialists', 'users', 'articles', 'reviews', 'events'];
subDirs.forEach(dir => {
  const sourceDirPath = path.join(oldDataDir, dir);
  
  if (fs.existsSync(sourceDirPath) && fs.statSync(sourceDirPath).isDirectory()) {
    // Читаем содержимое директории
    const files = fs.readdirSync(sourceDirPath);
    
    // Создаем соответствующую директорию в новой структуре
    const targetDirPath = path.join(newDataDir, dir);
    ensureDir(targetDirPath);
    
    // Копируем каждый файл
    files.forEach(file => {
      const sourceFilePath = path.join(sourceDirPath, file);
      const targetFilePath = path.join(targetDirPath, file);
      
      if (fs.statSync(sourceFilePath).isFile()) {
        fs.copyFileSync(sourceFilePath, targetFilePath);
        console.log(`Файл ${file} скопирован из ${sourceDirPath} в ${targetFilePath}`);
      }
    });
  }
});

console.log('Миграция данных завершена!');
console.log('Теперь вы можете безопасно удалить директорию /data, так как все файлы перенесены в /public/data'); 