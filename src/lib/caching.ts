/**
 * Система кэширования для оптимизации повторных запросов данных
 */

// Тип для хранимых в кэше данных
type CacheItem<T> = {
  data: T;              // Кэшированные данные
  timestamp: number;    // Время создания кэша
  ttl: number;          // Время жизни кэша в миллисекундах
};

// Глобальный кэш для хранения данных
const cache: Map<string, CacheItem<any>> = new Map();

/**
 * Получает данные из кэша, если они есть и не устарели,
 * или вызывает функцию для получения новых данных
 */
export async function getCachedData<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl: number = 60000 // 1 минута по умолчанию
): Promise<T> {
  const now = Date.now();
  const cachedItem = cache.get(key);

  // Если данные есть в кэше и не устарели, возвращаем их
  if (cachedItem && now - cachedItem.timestamp < cachedItem.ttl) {
    return cachedItem.data;
  }

  // Иначе получаем новые данные
  try {
    const data = await fetchFunction();
    
    // Сохраняем в кэш
    cache.set(key, {
      data,
      timestamp: now,
      ttl
    });
    
    return data;
  } catch (error) {
    // В случае ошибки, если есть устаревшие данные, возвращаем их
    if (cachedItem) {
      console.warn(`Ошибка при получении новых данных для ${key}, используем устаревшие данные из кэша.`);
      return cachedItem.data;
    }
    
    // Иначе пробрасываем ошибку дальше
    throw error;
  }
}

/**
 * Очищает весь кэш или удаляет конкретные ключи
 */
export function clearCache(keys?: string[]): void {
  if (!keys || keys.length === 0) {
    // Очищаем весь кэш
    cache.clear();
  } else {
    // Удаляем только указанные ключи
    keys.forEach(key => cache.delete(key));
  }
}

/**
 * Обновляет данные в кэше для указанного ключа
 */
export function updateCache<T>(key: string, data: T, ttl?: number): void {
  const cachedItem = cache.get(key);
  
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttl || (cachedItem?.ttl || 60000)
  });
}

/**
 * Проверяет наличие данных в кэше
 */
export function isCached(key: string): boolean {
  return cache.has(key);
}

/**
 * Оборачивает функцию в кэширующую обертку
 */
export function withCache<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  keyPrefix: string,
  ttl: number = 60000
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    // Создаем уникальный ключ на основе префикса и аргументов
    const key = `${keyPrefix}:${JSON.stringify(args)}`;
    
    return getCachedData(key, () => fn(...args), ttl);
  };
}

/**
 * Статистика кэша
 */
export function getCacheStats(): { 
  totalItems: number, 
  keys: string[], 
  sizes: { key: string, age: number, ttl: number }[] 
} {
  const keys = Array.from(cache.keys());
  const now = Date.now();
  
  const sizes = keys.map(key => {
    const item = cache.get(key)!;
    return { 
      key, 
      age: now - item.timestamp,  // Возраст в миллисекундах
      ttl: item.ttl 
    };
  });
  
  return {
    totalItems: cache.size,
    keys,
    sizes
  };
}

/**
 * Удаляет все устаревшие элементы из кэша
 */
export function cleanupCache(): number {
  const now = Date.now();
  let removedCount = 0;
  
  cache.forEach((item, key) => {
    if (now - item.timestamp > item.ttl) {
      cache.delete(key);
      removedCount++;
    }
  });
  
  return removedCount;
}

// Автоматически очищаем устаревшие данные каждые 5 минут
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 минут
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, CLEANUP_INTERVAL);
} 