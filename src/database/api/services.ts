import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export type Service = {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  image: string | null;
  price: number;
  duration: number;
  color: string | null;
  order: number;
  isArchived: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceWithSpecialists = Service & {
  specialists: {
    id: string;
    firstName: string;
    lastName: string;
    photo: string;
  }[];
};

export const servicesAPI = {
  /**
   * Получить все услуги
   */
  getAll: (includeArchived: boolean = false): Service[] => {
    const query = includeArchived 
      ? 'SELECT * FROM services ORDER BY "order" ASC'
      : 'SELECT * FROM services WHERE isArchived = 0 ORDER BY "order" ASC';
    
    return db.prepare(query).all() as Service[];
  },

  /**
   * Получить услугу по ID
   */
  getById: (id: string): Service | null => {
    return db.prepare('SELECT * FROM services WHERE id = ?').get(id) as Service | null;
  },

  /**
   * Получить услугу со специалистами
   */
  getWithSpecialists: (id: string): ServiceWithSpecialists | null => {
    const service = servicesAPI.getById(id);
    
    if (!service) {
      return null;
    }
    
    const specialists = db.prepare(`
      SELECT s.id, s.firstName, s.lastName, s.photo 
      FROM specialists s
      JOIN specialist_services ss ON s.id = ss.specialistId
      WHERE ss.serviceId = ?
    `).all(id) as { id: string; firstName: string; lastName: string; photo: string }[];
    
    return {
      ...service,
      specialists
    };
  },

  /**
   * Получить все услуги со специалистами
   */
  getAllWithSpecialists: (includeArchived: boolean = false): ServiceWithSpecialists[] => {
    const services = servicesAPI.getAll(includeArchived);
    
    return services.map(service => {
      const specialists = db.prepare(`
        SELECT s.id, s.firstName, s.lastName, s.photo 
        FROM specialists s
        JOIN specialist_services ss ON s.id = ss.specialistId
        WHERE ss.serviceId = ?
      `).all(service.id) as { id: string; firstName: string; lastName: string; photo: string }[];
      
      return {
        ...service,
        specialists
      };
    });
  },

  /**
   * Создать новую услугу
   */
  create: (service: Partial<Service>, specialistIds: string[] = []): Service => {
    const id = service.id || uuidv4();
    const now = new Date().toISOString();
    
    const newService: Service = {
      id,
      name: service.name || '',
      description: service.description || null,
      shortDescription: service.shortDescription || null,
      image: service.image || null,
      price: service.price || 0,
      duration: service.duration || 60,
      color: service.color || null,
      order: service.order || 0,
      isArchived: service.isArchived ? 1 : 0,
      createdAt: now,
      updatedAt: now
    };
    
    db.prepare(`
      INSERT INTO services (
        id, name, description, shortDescription, image, 
        price, duration, color, "order", isArchived, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newService.id,
      newService.name,
      newService.description,
      newService.shortDescription,
      newService.image,
      newService.price,
      newService.duration,
      newService.color,
      newService.order,
      newService.isArchived,
      newService.createdAt,
      newService.updatedAt
    );
    
    // Связываем услугу со специалистами
    if (specialistIds.length > 0) {
      const insertSpecialistStmt = db.prepare(`
        INSERT OR REPLACE INTO specialist_services (specialistId, serviceId)
        VALUES (?, ?)
      `);
      
      for (const specialistId of specialistIds) {
        insertSpecialistStmt.run(specialistId, newService.id);
      }
    }
    
    return newService;
  },

  /**
   * Обновить услугу
   */
  update: (id: string, service: Partial<Service>, specialistIds?: string[]): Service | null => {
    const currentService = servicesAPI.getById(id);
    
    if (!currentService) {
      return null;
    }
    
    const updatedService: Service = {
      ...currentService,
      ...service,
      id, // Сохраняем исходный ID
      updatedAt: new Date().toISOString()
    };
    
    db.prepare(`
      UPDATE services
      SET name = ?,
          description = ?,
          shortDescription = ?,
          image = ?,
          price = ?,
          duration = ?,
          color = ?,
          "order" = ?,
          isArchived = ?,
          updatedAt = ?
      WHERE id = ?
    `).run(
      updatedService.name,
      updatedService.description,
      updatedService.shortDescription,
      updatedService.image,
      updatedService.price,
      updatedService.duration,
      updatedService.color,
      updatedService.order,
      updatedService.isArchived,
      updatedService.updatedAt,
      id
    );
    
    // Если переданы specialistIds, обновляем связи
    if (specialistIds !== undefined) {
      // Удаляем существующие связи
      db.prepare('DELETE FROM specialist_services WHERE serviceId = ?').run(id);
      
      // Добавляем новые связи
      if (specialistIds.length > 0) {
        const insertSpecialistStmt = db.prepare(`
          INSERT INTO specialist_services (specialistId, serviceId)
          VALUES (?, ?)
        `);
        
        for (const specialistId of specialistIds) {
          insertSpecialistStmt.run(specialistId, id);
        }
      }
    }
    
    return updatedService;
  },

  /**
   * Удалить услугу
   */
  delete: (id: string): boolean => {
    try {
      // Получаем данные услуги перед удалением
      const service = servicesAPI.getById(id);
      if (!service) {
        console.log(`[servicesAPI.delete] Услуга с ID ${id} не найдена`);
        return false;
      }

      console.log(`[servicesAPI.delete] Начинаем удаление услуги "${service.name}" (ID: ${id})`);

      // Удаляем изображение услуги, если оно есть
      if (service.image) {
        deleteServiceImage(service.image);
      }
      
      // Удаляем связи со специалистами
      try {
      db.prepare(`DELETE FROM specialist_services WHERE serviceId = ?`).run(id);
        console.log(`[servicesAPI.delete] Связи со специалистами удалены`);
      } catch (error) {
        console.warn(`[servicesAPI.delete] Ошибка при удалении связей со специалистами:`, error);
        // Продолжаем выполнение, даже если произошла ошибка
      }
      
      // Удаляем услугу из базы данных
      const result = db.prepare(`DELETE FROM services WHERE id = ?`).run(id);
      
      if (result.changes > 0) {
        console.log(`[servicesAPI.delete] Услуга "${service.name}" (ID: ${id}) успешно удалена из базы данных`);
        return true;
      } else {
        console.error(`[servicesAPI.delete] Не удалось удалить услугу из базы данных`);
        return false;
      }
    } catch (error) {
      console.error(`[servicesAPI.delete] Ошибка при удалении услуги (ID: ${id}):`, error);
      return false;
    }
  },

  /**
   * Поиск услуг
   */
  search: (query: string): Service[] => {
    return db.prepare(`
      SELECT * FROM services
      WHERE name LIKE ? OR description LIKE ?
      ORDER BY "order" ASC
    `).all(`%${query}%`, `%${query}%`) as Service[];
  },
  
  /**
   * Установить порядок услуг
   */
  setOrder: (serviceIds: string[]): boolean => {
    const updateStmt = db.prepare(`
      UPDATE services
      SET "order" = ?
      WHERE id = ?
    `);
    
    const transaction = db.transaction((ids: string[]) => {
      ids.forEach((id, index) => {
        updateStmt.run(index, id);
      });
    });
    
    try {
      transaction(serviceIds);
      return true;
    } catch (error) {
      console.error('Ошибка при установке порядка услуг:', error);
      return false;
    }
  },
  
  /**
   * Обновить порядок нескольких услуг
   */
  updateBulkOrders: (updates: Array<{id: string, order: number}>): boolean => {
    const updateStmt = db.prepare(`
      UPDATE services
      SET "order" = ?,
          updatedAt = ?
      WHERE id = ?
    `);
    
    const now = new Date().toISOString();
    
    const transaction = db.transaction((items: Array<{id: string, order: number}>) => {
      items.forEach(item => {
        updateStmt.run(item.order, now, item.id);
      });
    });
    
    try {
      transaction(updates);
      console.log(`[updateBulkOrders] Успешно обновлен порядок для ${updates.length} услуг`);
      return true;
    } catch (error) {
      console.error('[updateBulkOrders] Ошибка при обновлении порядка услуг:', error);
      return false;
    }
  },
  
  /**
   * Сохранить изображение услуги из base64
   */
  saveImage: async (base64Image: string): Promise<string> => {
    try {
      console.log('[servicesAPI.saveImage] Начало сохранения изображения из base64');
      
      // Создаем директорию для загрузок, если она не существует
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'services');
      console.log(`[servicesAPI.saveImage] Проверка директории: ${uploadDir}`);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`[servicesAPI.saveImage] Создана директория: ${uploadDir}`);
        // Устанавливаем права доступа 777 для директории
        fs.chmodSync(uploadDir, 0o777);
      }
      
      // Генерируем уникальное имя файла
      const serviceId = uuidv4();
      const originalFileName = `${serviceId}_original.jpg`;
      const originalFilePath = path.join(uploadDir, originalFileName);
      
      // Извлекаем данные из base64
      const base64Data = base64Image.split(';base64,').pop();
      if (!base64Data) {
        throw new Error('Некорректный формат base64');
      }
      
      // Сохраняем файл
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(originalFilePath, buffer);
      
      // Устанавливаем права доступа 777 для файла
      fs.chmodSync(originalFilePath, 0o777);
      
      // Проверяем, что файл был создан и доступен
      if (fs.existsSync(originalFilePath)) {
        console.log(`[servicesAPI.saveImage] Файл успешно создан: ${originalFilePath}, размер: ${fs.statSync(originalFilePath).size} байт`);
      } else {
        console.error(`[servicesAPI.saveImage] Ошибка: файл не был создан: ${originalFilePath}`);
      }
      
      // Возвращаем путь к файлу для сохранения в БД
      return `/uploads/services/${originalFileName}`;
    } catch (error) {
      console.error('[servicesAPI.saveImage] Ошибка при сохранении изображения:', error);
      throw error;
    }
  },
  
  /**
   * Получить услуги специалиста
   */
  getBySpecialistId: (specialistId: string): Service[] => {
    return db.prepare(`
      SELECT s.* FROM services s
      JOIN specialist_services ss ON s.id = ss.serviceId
      WHERE ss.specialistId = ? AND s.isArchived = 0
      ORDER BY s."order" ASC
    `).all(specialistId) as Service[];
  }
};

// Функция для удаления изображения услуги
function deleteServiceImage(imagePath: string): boolean {
  try {
    if (!imagePath) {
      console.log(`[deleteServiceImage] Путь к изображению не указан`);
      return false;
    }
    
    if (imagePath.startsWith('http') || imagePath.includes('placeholder')) {
      console.log(`[deleteServiceImage] Пропуск внешнего изображения или плейсхолдера: ${imagePath}`);
      return false; // Пропускаем внешние изображения и плейсхолдеры
    }
    
    // Нормализуем путь (убираем начальный слеш, если есть)
    const normalizedPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    // Преобразуем URL в путь к файлу
    const filePath = path.join(process.cwd(), 'public', normalizedPath);
    
    console.log(`[deleteServiceImage] Попытка удаления файла: ${filePath}`);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.warn(`[deleteServiceImage] Файл для удаления не найден: ${filePath}`);
    } else {
      // Удаляем файл
      fs.unlinkSync(filePath);
      console.log(`[deleteServiceImage] Файл услуги успешно удален: ${filePath}`);
    }
    
    // Проверяем и удаляем WebP версию, если она может существовать
    const webpPath = normalizedPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    if (webpPath !== normalizedPath) {
      const webpFilePath = path.join(process.cwd(), 'public', webpPath);
      console.log(`[deleteServiceImage] Проверка наличия WebP версии: ${webpFilePath}`);
      
      if (fs.existsSync(webpFilePath)) {
        fs.unlinkSync(webpFilePath);
        console.log(`[deleteServiceImage] WebP версия файла успешно удалена: ${webpFilePath}`);
      }
    }
    
    // Проверяем и удаляем миниатюры, если они могут существовать
    const thumbPath = normalizedPath.replace(/(\.[^.]+)$/, '-thumb$1');
    const thumbFilePath = path.join(process.cwd(), 'public', thumbPath);
    console.log(`[deleteServiceImage] Проверка наличия миниатюры: ${thumbFilePath}`);
    
    if (fs.existsSync(thumbFilePath)) {
      fs.unlinkSync(thumbFilePath);
      console.log(`[deleteServiceImage] Миниатюра файла успешно удалена: ${thumbFilePath}`);
    }
    
    // Проверяем и удаляем WebP версию миниатюры
    const thumbWebpPath = thumbPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    if (thumbWebpPath !== thumbPath) {
      const thumbWebpFilePath = path.join(process.cwd(), 'public', thumbWebpPath);
      console.log(`[deleteServiceImage] Проверка наличия WebP версии миниатюры: ${thumbWebpFilePath}`);
      
      if (fs.existsSync(thumbWebpFilePath)) {
        fs.unlinkSync(thumbWebpFilePath);
        console.log(`[deleteServiceImage] WebP версия миниатюры успешно удалена: ${thumbWebpFilePath}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[deleteServiceImage] Ошибка при удалении изображения услуги:', error);
    return false;
  }
} 