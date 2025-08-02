/**
 * Скрипт для проверки и исправления путей к файлам данных
 * 
 * Этот скрипт проверяет все файлы в /src директории и заменяет 
 * ссылки на файлы в /data на ссылки в /public/data
 */

const fs = require('fs');
const path = require('path');

// Директория исходников
const srcDir = path.join(process.cwd(), 'src');

// Регулярные выражения для поиска путей
const pathRegexps = [
  /path\.join\(process\.cwd\(\), ['"]data['"]/g,
  /['"]\.\.\/data['"]/g,
  /['"]\.\.\/\.\.\/data['"]/g,
  /['"]\.\.\/\.\.\/\.\.\/data['"]/g,
];

// Функция для обхода директории и обработки файлов
function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Рекурсивно обрабатываем поддиректории
      processDirectory(filePath);
    } else if (stats.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
      // Обрабатываем только файлы TypeScript и JavaScript
      processFile(filePath);
    }
  }
}

// Функция для обработки одного файла
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Проверяем файл на наличие путей к старой директории
    for (const regexp of pathRegexps) {
      if (regexp.test(content)) {
        console.log(`Файл ${filePath} содержит ссылки на директорию /data`);
        
        // Заменяем пути
        if (regexp === pathRegexps[0]) {
          // Для path.join(process.cwd(), 'data'
          content = content.replace(regexp, `path.join(process.cwd(), 'public', 'data'`);
        } else {
          // Для относительных путей
          content = content.replace(regexp, `'../../public/data'`);
        }
        
        modified = true;
      }
    }
    
    // Сохраняем модифицированный файл
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Файл ${filePath} обновлен с новыми путями`);
    }
  } catch (error) {
    console.error(`Ошибка при обработке файла ${filePath}:`, error);
  }
}

// Запускаем обработку
console.log('Начинаю проверку и обновление путей к файлам данных...');
processDirectory(srcDir);
console.log('Проверка завершена!'); 