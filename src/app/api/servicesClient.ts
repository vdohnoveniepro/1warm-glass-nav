// API клиент для работы с услугами
import { Service } from '@/models/types';
import { getCachedData, withCache } from '@/lib/caching';

// Константы для кэширования
const SERVICES_CACHE_KEY = 'services:all';
const SERVICE_CACHE_PREFIX = 'services:id';
const SERVICES_CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Получить все услуги
 */
export async function getServices() {
  return getCachedData(SERVICES_CACHE_KEY, async () => {
    console.log('Запрос списка услуг из API (не из кэша)...');
    
    try {
      const response = await fetch('/api/services', {
        // Заголовки для предотвращения кэширования на стороне браузера
        // для разработки, чтобы всегда получать свежие данные
        headers: process.env.NODE_ENV === 'development' 
          ? { 'Cache-Control': 'no-cache, no-store' }
          : {}
      });
      
      console.log('Получен ответ от API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        console.error(`Ошибка загрузки услуг: ${response.status} ${response.statusText}`);
        throw new Error(`Ошибка загрузки услуг: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Если API возвращает структуру с success/data
      if (data && typeof data.success !== 'undefined') {
        if (!data.success) {
          console.error('API вернул ошибку:', data.error);
          throw new Error(data.error || 'Ошибка при загрузке услуг');
        }

        // Проверяем, пустой ли ответ
        if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
          console.log('API вернул пустой список услуг');
          return [];
        }

        console.log('Получено услуг:', data.data.length);
        
        // Сортируем услуги по полю order
        return data.data.sort((a: Service, b: Service) => (a.order || 0) - (b.order || 0));
      } else {
        // Если API возвращает просто массив
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.log('API вернул пустой список услуг');
          return [];
        }
        
        // Сортируем услуги по полю order
        return data.sort((a: Service, b: Service) => (a.order || 0) - (b.order || 0));
      }
    } catch (error) {
      console.error('Ошибка при загрузке услуг:', error);
      throw error;
    }
  }, SERVICES_CACHE_TTL);
}

/**
 * Получить услугу по ID с использованием кэширования
 */
export const getServiceById = withCache(async (serviceId: string) => {
  console.log(`Запрос услуги с ID ${serviceId} из API (не из кэша)...`);

  try {
    const response = await fetch(`/api/services/${serviceId}`);

    if (!response.ok) {
      console.error(`Ошибка загрузки услуги: ${response.status} ${response.statusText}`);
      throw new Error(`Ошибка загрузки услуги: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Если API возвращает структуру с success/data
    if (data && typeof data.success !== 'undefined') {
      if (!data.success) {
        console.error('API вернул ошибку:', data.error);
        throw new Error(data.error || 'Услуга не найдена');
      }

      return data.data;
    } else {
      // Если API возвращает просто объект
      return data;
    }
  } catch (error) {
    console.error(`Ошибка при загрузке услуги с ID ${serviceId}:`, error);
    throw error;
  }
}, SERVICE_CACHE_PREFIX, SERVICES_CACHE_TTL);

/**
 * Получить активные услуги (не архивированные)
 */
export async function getActiveServices() {
  return getCachedData('services:active', async () => {
    const services = await getServices();
    return services.filter((service: Service) => !service.isArchived);
  }, SERVICES_CACHE_TTL);
}

/**
 * Получить архивированные услуги
 */
export async function getArchivedServices() {
  return getCachedData('services:archived', async () => {
    const services = await getServices();
    return services.filter((service: Service) => service.isArchived);
  }, SERVICES_CACHE_TTL);
} 