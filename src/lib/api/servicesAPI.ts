import fs from 'fs';
import path from 'path';
import { Service } from '@/types/service';
import { generateId } from '../utils';
import { processImageFromBase64 } from '../imageProcessing';

// Путь к файлу с данными
const SERVICES_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'services', 'services.json');
const PUBLIC_SERVICES_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'services', 'services.json');
const SERVICES_IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'services');

// Функция для чтения данных из файла
const readServicesData = (): Service[] => {
  try {
    console.log('[servicesAPI] getAll: SERVICES_FILE_PATH =', SERVICES_FILE_PATH);
    console.log('[servicesAPI] getAll: PUBLIC_SERVICES_FILE_PATH =', PUBLIC_SERVICES_FILE_PATH);
    
    // Проверяем существование файла
    if (!fs.existsSync(SERVICES_FILE_PATH)) {
      // Если файл не существует, создаем директорию и пустой файл
      const dir = path.dirname(SERVICES_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('[servicesAPI] Создана директория:', dir);
      }
      
      fs.writeFileSync(SERVICES_FILE_PATH, JSON.stringify([], null, 2));
      console.log('[servicesAPI] Создан пустой файл услуг:', SERVICES_FILE_PATH);
      return [];
    }
    
    // Читаем данные из файла
    const data = fs.readFileSync(SERVICES_FILE_PATH, 'utf8');
    const services = JSON.parse(data);
    console.log('[servicesAPI] getAll: Загружено услуг:', services.length);
    
    // Проверка и установка значения isArchived, если оно отсутствует
    services.forEach((service: Service) => {
      if (typeof service.isArchived === 'undefined') {
        console.log(`[servicesAPI] getAll: Услуга ${service.id} не имеет свойства isArchived, устанавливаем false`);
        service.isArchived = false;
      }
    });
    
    return services;
  } catch (error) {
    console.error('Ошибка при чтении данных услуг:', error);
    return [];
  }
};

// Функция для записи данных в файл
const writeServicesData = (services: Service[]): boolean => {
  try {
    // Создаем директорию, если она не существует
    const dir = path.dirname(SERVICES_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('[servicesAPI] Создана директория для записи:', dir);
    }
    
    // Записываем данные в файл
    fs.writeFileSync(SERVICES_FILE_PATH, JSON.stringify(services, null, 2));
    console.log(`[servicesAPI] Успешно записано ${services.length} услуг в файл`);
    return true;
  } catch (error) {
    console.error('Ошибка при записи данных услуг:', error);
    return false;
  }
};

// API для работы с услугами
export const servicesAPI = {
  // Получить все услуги
  getAll: (): Service[] => {
    console.log('[servicesAPI] getAll: Начало загрузки услуг');
    const services = readServicesData();
    
    // Сортируем услуги по полю order
    return services.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
  
  // Получить услугу по ID
  getById: (id: string): Service | null => {
    console.log(`[servicesAPI] getById: Поиск услуги с ID ${id}`);
    const services = readServicesData();
    const service = services.find(service => service.id === id) || null;
    
    if (!service) {
      console.log(`[servicesAPI] getById: Услуга с ID ${id} не найдена`);
    } else {
      console.log(`[servicesAPI] getById: Найдена услуга ${service.name}`);
    }
    
    return service;
  },
  
  // Создать новую услугу
  create: (serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'isArchived'>): Service | null => {
    try {
      console.log('[servicesAPI] create: Создание новой услуги');
      const services = readServicesData();
      
      // Создаем новую услугу
      const newService: Service = {
        id: generateId(),
        ...serviceData,
        order: services.length, // Устанавливаем порядок в конец списка
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log(`[servicesAPI] create: Создана новая услуга с ID ${newService.id}`);
      
      // Добавляем услугу в список
      services.push(newService);
      
      // Записываем обновленный список в файл
      if (writeServicesData(services)) {
        return newService;
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при создании услуги:', error);
      return null;
    }
  },
  
  // Обновить существующую услугу
  update: (id: string, serviceData: Partial<Service>): Service | null => {
    try {
      console.log(`[servicesAPI] update: Обновление услуги с ID ${id}`);
      const services = readServicesData();
      
      // Находим индекс услуги
      const index = services.findIndex(service => service.id === id);
      
      if (index === -1) {
        console.log(`[servicesAPI] update: Услуга с ID ${id} не найдена`);
        return null;
      }
      
      // Обновляем услугу
      const updatedService: Service = {
        ...services[index],
        ...serviceData,
        updatedAt: new Date().toISOString()
      };
      
      services[index] = updatedService;
      console.log(`[servicesAPI] update: Услуга с ID ${id} обновлена`);
      
      // Записываем обновленный список в файл
      if (writeServicesData(services)) {
        return updatedService;
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при обновлении услуги:', error);
      return null;
    }
  },
  
  // Обновить статус архивации услуги
  updateStatus: (id: string, isArchived: boolean): Service | null => {
    try {
      console.log(`[servicesAPI] updateStatus: Обновление статуса архивации для ID ${id}: ${isArchived}`);
      const services = readServicesData();
      
      // Находим индекс услуги
      const index = services.findIndex(service => service.id === id);
      
      if (index === -1) {
        console.log(`[servicesAPI] updateStatus: Услуга с ID ${id} не найдена`);
        return null;
      }
      
      // Обновляем статус архивации
      services[index].isArchived = isArchived;
      services[index].updatedAt = new Date().toISOString();
      
      console.log(`[servicesAPI] updateStatus: Статус архивации обновлен для услуги ${services[index].name}`);
      
      // Записываем обновленный список в файл
      if (writeServicesData(services)) {
        return services[index];
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при обновлении статуса услуги:', error);
      return null;
    }
  },
  
  // Удалить услугу
  delete: (id: string): boolean => {
    try {
      console.log(`[servicesAPI] delete: Удаление услуги с ID ${id}`);
      const services = readServicesData();
      
      // Фильтруем список, исключая услугу с указанным ID
      const updatedServices = services.filter(service => service.id !== id);
      
      // Если длина списка не изменилась, значит услуга не найдена
      if (updatedServices.length === services.length) {
        console.log(`[servicesAPI] delete: Услуга с ID ${id} не найдена`);
        return false;
      }
      
      console.log(`[servicesAPI] delete: Услуга с ID ${id} удалена`);
      
      // Записываем обновленный список в файл
      return writeServicesData(updatedServices);
    } catch (error) {
      console.error('Ошибка при удалении услуги:', error);
      return false;
    }
  },
  
  // Обновить порядок услуг
  updateOrder: (orderUpdates: { id: string; order: number }[]): boolean => {
    try {
      console.log(`[servicesAPI] updateOrder: Обновление порядка для ${orderUpdates.length} услуг`);
      const services = readServicesData();
      
      // Обновляем порядок для каждой услуги
      orderUpdates.forEach(update => {
        const service = services.find(s => s.id === update.id);
        if (service) {
          service.order = update.order;
          service.updatedAt = new Date().toISOString();
        }
      });
      
      console.log('[servicesAPI] updateOrder: Порядок услуг обновлен');
      
      // Записываем обновленный список в файл
      return writeServicesData(services);
    } catch (error) {
      console.error('Ошибка при обновлении порядка услуг:', error);
      return false;
    }
  },
  
  // Обновить порядок для нескольких услуг (используется в /api/admin/services/reorder)
  updateBulkOrders: (orderUpdates: { id: string; order: number }[]): boolean => {
    try {
      console.log(`[servicesAPI] updateBulkOrders: Обновление порядка для ${orderUpdates.length} услуг`);
      const services = readServicesData();
      
      // Обновляем порядок для каждой услуги
      orderUpdates.forEach(update => {
        const service = services.find(s => s.id === update.id);
        if (service) {
          console.log(`[servicesAPI] updateBulkOrders: Обновление порядка для услуги ${service.name} (ID: ${service.id}): ${service.order} -> ${update.order}`);
          service.order = update.order;
          service.updatedAt = new Date().toISOString();
        } else {
          console.warn(`[servicesAPI] updateBulkOrders: Услуга с ID ${update.id} не найдена`);
        }
      });
      
      console.log('[servicesAPI] updateBulkOrders: Порядок услуг обновлен');
      
      // Записываем обновленный список в файл
      return writeServicesData(services);
    } catch (error) {
      console.error('[servicesAPI] updateBulkOrders: Ошибка при обновлении порядка услуг:', error);
      return false;
    }
  },
  
  // Сохранение изображения из base64
  saveImage: async (base64Image: string): Promise<string> => {
    try {
      console.log('[servicesAPI] saveImage: Сохранение изображения из base64');
      
      // Создаем директорию для изображений, если она не существует
      if (!fs.existsSync(SERVICES_IMAGES_DIR)) {
        fs.mkdirSync(SERVICES_IMAGES_DIR, { recursive: true });
        console.log(`[servicesAPI] saveImage: Создана директория для изображений: ${SERVICES_IMAGES_DIR}`);
      }
      
      // Генерируем уникальное имя файла
      const fileName = `service-${generateId()}.jpg`;
      const filePath = path.join(SERVICES_IMAGES_DIR, fileName);
      const publicPath = `/images/services/${fileName}`;
      
      // Создаем директорию для сохранения изображения
      const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log(`[servicesAPI] saveImage: Изображение сохранено в ${filePath}`);
      
      return publicPath;
    } catch (error) {
      console.error('Ошибка при сохранении изображения:', error);
      throw error;
    }
  }
};

// Удаление услуги по ID
export const deleteService = (id: string): boolean => {
  try {
    console.log(`[servicesAPI] deleteService: Удаление услуги с ID ${id}`);
    // Получаем все услуги
    const services = readServicesData();
    
    // Проверяем существование услуги
    const serviceIndex = services.findIndex(service => service.id === id);
    if (serviceIndex === -1) {
      console.error(`Услуга с ID ${id} не найдена`);
      return false;
    }
    
    // Удаляем услугу из массива
    services.splice(serviceIndex, 1);
    
    // Сохраняем обновленный список услуг
    const result = writeServicesData(services);
    
    console.log(`Услуга с ID ${id} успешно удалена`);
    return result;
  } catch (error) {
    console.error('Ошибка при удалении услуги:', error);
    return false;
  }
}; 