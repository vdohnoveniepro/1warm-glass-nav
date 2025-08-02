import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Интерфейс для результатов оптимизации по коллекции
interface CollectionOptimizationResult {
  name: string;
  filesOptimized: number;
  originalSizeKb: number;
  optimizedSizeKb: number;
  percentReduced: number;
}

// POST /api/admin/optimize/database - оптимизация базы данных
export async function POST() {
  try {
    const startTime = Date.now();
    
    // Выполняем оптимизацию базы данных
    const results = await optimizeDatabase();
    
    // Подсчитываем итоговую статистику
    const totalFilesOptimized = results.reduce((sum, r) => sum + r.filesOptimized, 0);
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSizeKb, 0);
    const totalOptimizedSize = results.reduce((sum, r) => sum + r.optimizedSizeKb, 0);
    const totalReduction = totalOriginalSize > 0 
      ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100 
      : 0;
    
    const duration = (Date.now() - startTime) / 1000; // в секундах
    
    return NextResponse.json({
      success: true,
      message: `Оптимизация базы данных завершена за ${duration.toFixed(2)} сек. Оптимизировано файлов: ${totalFilesOptimized}, размер уменьшен на ${totalReduction.toFixed(2)}%`,
      summary: {
        collectionsProcessed: results.length,
        totalFilesOptimized,
        originalSizeKb: Math.round(totalOriginalSize),
        optimizedSizeKb: Math.round(totalOptimizedSize),
        reductionPercent: Math.round(totalReduction * 100) / 100
      },
      details: results
    });
  } catch (error) {
    console.error('Ошибка при оптимизации базы данных:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при оптимизации базы данных' },
      { status: 500 }
    );
  }
}

/**
 * Оптимизирует JSON-файлы базы данных
 */
async function optimizeDatabase(): Promise<CollectionOptimizationResult[]> {
  const results: CollectionOptimizationResult[] = [];
  const dbDir = path.join(process.cwd(), 'db');
  
  // Проверяем, существует ли директория базы данных
  if (!fs.existsSync(dbDir)) {
    console.warn('Директория базы данных не найдена:', dbDir);
    return results;
  }
  
  // Получаем список коллекций (поддиректорий в db)
  const collections = fs.readdirSync(dbDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  // Обрабатываем каждую коллекцию
  for (const collection of collections) {
    const collectionDir = path.join(dbDir, collection);
    
    try {
      const result = await optimizeCollection(collection, collectionDir);
      if (result.filesOptimized > 0) {
        results.push(result);
      }
    } catch (error) {
      console.error(`Ошибка при оптимизации коллекции ${collection}:`, error);
    }
  }
  
  return results;
}

/**
 * Оптимизирует файлы в указанной коллекции
 */
async function optimizeCollection(
  name: string, 
  directory: string
): Promise<CollectionOptimizationResult> {
  const result: CollectionOptimizationResult = {
    name,
    filesOptimized: 0,
    originalSizeKb: 0,
    optimizedSizeKb: 0,
    percentReduced: 0
  };
  
  // Получаем список JSON-файлов в директории
  const files = fs.readdirSync(directory)
    .filter(file => file.endsWith('.json'));
  
  if (files.length === 0) {
    return result;
  }
  
  // Оптимизируем каждый файл
  for (const file of files) {
    const filePath = path.join(directory, file);
    
    try {
      // Получаем размер файла до оптимизации
      const stats = fs.statSync(filePath);
      const originalSizeBytes = stats.size;
      
      // Читаем файл
      const readFile = promisify(fs.readFile);
      const fileContent = await readFile(filePath, 'utf-8');
      
      try {
        // Парсим JSON
        const data = JSON.parse(fileContent);
        
        // Подготавливаем данные для оптимизации
        const optimizedData = optimizeData(data);
        
        // Сериализуем оптимизированные данные
        const optimizedContent = JSON.stringify(optimizedData);
        
        // Если оптимизированный контент отличается от оригинала,
        // записываем обратно в файл
        if (optimizedContent !== fileContent) {
          const writeFile = promisify(fs.writeFile);
          await writeFile(filePath, optimizedContent, 'utf-8');
          
          // Получаем размер после оптимизации
          const newStats = fs.statSync(filePath);
          const optimizedSizeBytes = newStats.size;
          
          // Обновляем статистику
          result.filesOptimized++;
          result.originalSizeKb += originalSizeBytes / 1024;
          result.optimizedSizeKb += optimizedSizeBytes / 1024;
        }
      } catch (parseError) {
        console.warn(`Ошибка при парсинге JSON в файле ${filePath}:`, parseError);
      }
    } catch (fileError) {
      console.error(`Ошибка при обработке файла ${filePath}:`, fileError);
    }
  }
  
  // Вычисляем процент уменьшения размера
  if (result.originalSizeKb > 0) {
    result.percentReduced = ((result.originalSizeKb - result.optimizedSizeKb) / result.originalSizeKb) * 100;
  }
  
  return result;
}

/**
 * Оптимизирует данные объекта
 */
function optimizeData(data: any): any {
  // Если это массив, оптимизируем каждый элемент
  if (Array.isArray(data)) {
    return data.map(item => optimizeData(item));
  }
  
  // Если это объект, оптимизируем каждое свойство
  if (data !== null && typeof data === 'object') {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Пропускаем пустые строки, null, undefined и пустые массивы
      if (value === '' || value === null || value === undefined || 
          (Array.isArray(value) && value.length === 0)) {
        continue;
      }
      
      // Рекурсивно оптимизируем значение
      result[key] = optimizeData(value);
    }
    
    return result;
  }
  
  // Для примитивных типов возвращаем как есть
  return data;
}