import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Путь к директории с JSON данными
const DATA_DIR = path.join(process.cwd(), 'public', 'data');

export const POST = async (req: NextRequest) => {
  try {
    // Проверяем существование директории
    if (!fs.existsSync(DATA_DIR)) {
      return NextResponse.json(
        { success: false, message: 'Директория с JSON данными не найдена' },
        { status: 404 }
      );
    }

    // Получаем список всех JSON файлов в директории и поддиректориях
    const jsonFiles = findJsonFiles(DATA_DIR);
    const deletedFiles: string[] = [];

    // Удаляем каждый JSON файл
    for (const file of jsonFiles) {
      try {
        fs.unlinkSync(file);
        deletedFiles.push(file.replace(process.cwd(), ''));
      } catch (error) {
        console.error(`Ошибка при удалении файла ${file}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Успешно удалено ${deletedFiles.length} JSON файлов`,
      deletedFiles
    });
  } catch (error) {
    console.error('Ошибка при очистке JSON данных:', error);
    return NextResponse.json(
      { success: false, message: `Ошибка: ${error}` },
      { status: 500 }
    );
  }
};

// Функция для рекурсивного поиска всех JSON файлов
function findJsonFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  let results: string[] = [];
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // Рекурсивно обходим поддиректории
      results = results.concat(findJsonFiles(itemPath));
    } else if (path.extname(itemPath).toLowerCase() === '.json') {
      // Добавляем JSON файлы
      results.push(itemPath);
    }
  }

  return results;
} 