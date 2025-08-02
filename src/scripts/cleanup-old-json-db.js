/**
 * Скрипт для удаления старых файлов JSON базы данных
 * и предотвращения их автоматического создания
 */

const fs = require('fs');
const path = require('path');

// Директории со старыми JSON файлами
const oldJsonDirs = [
  path.join(process.cwd(), 'public', 'data'),
  path.join(process.cwd(), 'public', 'data_backup_json')
];

// Файлы и директории, которые нужно удалить
const filesToRemove = [
  // Пользователи
  'users/users.json',
  'users',
  
  // Услуги
  'services/services.json',
  'services',
  
  // Специалисты
  'specialists/specialists.json',
  'specialists',
  
  // Записи
  'appointments/appointments.json',
  'appointments',
  
  // Статьи
  'articles/articles.json',
  'articles',
  
  // Настройки
  'settings/settings.json',
  'settings'
];

// Функция для рекурсивного удаления директории
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Рекурсивно удаляем поддиректорию
        deleteFolderRecursive(curPath);
      } else {
        // Удаляем файл
        fs.unlinkSync(curPath);
        console.log(`Удален файл: ${curPath}`);
      }
    });
    
    // Удаляем пустую директорию
    fs.rmdirSync(folderPath);
    console.log(`Удалена директория: ${folderPath}`);
  }
}

// Создаем пустой файл .gitkeep для сохранения структуры директорий
function createGitKeep(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const gitkeepPath = path.join(dirPath, '.gitkeep');
  fs.writeFileSync(gitkeepPath, '');
  console.log(`Создан файл: ${gitkeepPath}`);
}

// Создаем файл .nomedia для предотвращения автоматического создания файлов
function createNoMedia(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const nomediaPath = path.join(dirPath, '.nomedia');
  fs.writeFileSync(nomediaPath, 'Эта директория не должна использоваться для хранения данных. Используйте SQLite базу данных.');
  console.log(`Создан файл: ${nomediaPath}`);
}

// Удаляем старые файлы JSON
console.log('Начинаем удаление старых файлов JSON базы данных...');

oldJsonDirs.forEach(baseDir => {
  if (fs.existsSync(baseDir)) {
    console.log(`Обрабатываем директорию: ${baseDir}`);
    
    filesToRemove.forEach(filePath => {
      const fullPath = path.join(baseDir, filePath);
      
      if (fs.existsSync(fullPath)) {
        if (fs.lstatSync(fullPath).isDirectory()) {
          deleteFolderRecursive(fullPath);
        } else {
          fs.unlinkSync(fullPath);
          console.log(`Удален файл: ${fullPath}`);
        }
      }
    });
    
    // Создаем файлы для предотвращения автоматического создания
    createNoMedia(baseDir);
    createGitKeep(baseDir);
  } else {
    console.log(`Директория не существует: ${baseDir}`);
    
    // Создаем директорию и файлы для предотвращения автоматического создания
    fs.mkdirSync(baseDir, { recursive: true });
    createNoMedia(baseDir);
    createGitKeep(baseDir);
  }
});

console.log('Удаление старых файлов JSON базы данных завершено.'); 