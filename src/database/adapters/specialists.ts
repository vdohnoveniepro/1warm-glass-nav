import { specialistsAPI, Specialist, WorkSchedule } from '../api/specialists';
import path from 'path';
import fs from 'fs';
import { db } from '../db';

/**
 * Адаптер для совместимости старого API специалистов с SQLite
 */
export const specialistsAdapter = {
  /**
   * Получить всех специалистов
   */
  getAll: (): Specialist[] => {
    const specialists = specialistsAPI.getAll();
    
    // Проверяем и корректируем пути к фото для всех специалистов
    specialists.forEach(specialist => {
      if (specialist && specialist.photo) {
        // Проверяем существование файла WebP
        const photoPath = specialist.photo;
        const publicPath = path.join(process.cwd(), 'public', photoPath);
        
        if (!fs.existsSync(publicPath)) {
          console.warn(`[specialistsAdapter.getAll] Файл не найден по пути: ${publicPath}`);
          
          // Проверяем оригинальное изображение
          const originalPath = photoPath.replace('.webp', '_original.jpg');
          const originalPublicPath = path.join(process.cwd(), 'public', originalPath);
          
          if (fs.existsSync(originalPublicPath)) {
            console.log(`[specialistsAdapter.getAll] Найден оригинальный файл: ${originalPublicPath}`);
            specialist.photo = originalPath;
          } else {
            console.warn(`[specialistsAdapter.getAll] Оригинальный файл не найден: ${originalPublicPath}`);
            // Используем запасное изображение
            specialist.photo = '/images/photoPreview.jpg';
          }
        }
      }
    });
    
    return specialists;
  },
  
  /**
   * Получить специалиста по ID
   */
  getById: (id: string): Specialist | null => {
    const specialist = specialistsAPI.getById(id);
    
    // Проверяем и корректируем путь к фото
    if (specialist && specialist.photo) {
      // Проверяем существование файла WebP
      const photoPath = specialist.photo;
      const publicPath = path.join(process.cwd(), 'public', photoPath);
      
      console.log(`[specialistsAdapter.getById] Проверка пути к фото: ${publicPath}`);
      
      if (!fs.existsSync(publicPath)) {
        console.warn(`[specialistsAdapter.getById] Файл не найден по пути: ${publicPath}`);
        
        // Проверяем оригинальное изображение
        const originalPath = photoPath.replace('.webp', '_original.jpg');
        const originalPublicPath = path.join(process.cwd(), 'public', originalPath);
        
        if (fs.existsSync(originalPublicPath)) {
          console.log(`[specialistsAdapter.getById] Найден оригинальный файл: ${originalPublicPath}`);
          specialist.photo = originalPath;
        } else {
          console.warn(`[specialistsAdapter.getById] Оригинальный файл не найден: ${originalPublicPath}`);
          // Используем запасное изображение
          specialist.photo = '/images/photoPreview.jpg';
        }
      }
    }
    
    return specialist;
  },
  
  /**
   * Создать нового специалиста
   */
  create: (data: any): Specialist => {
    // Преобразуем данные в формат для нового API
    const specialist: Partial<Specialist> = {
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      photo: data.photo || null,
      description: data.description || null,
      position: data.position || null,
      experience: parseInt(data.experience) || 0,
      order: parseInt(data.order) || 0,
      userId: data.userId || null,
      additionalPositions: data.additionalPositions || [],
      selectedServices: data.selectedServices || []
    };
    
    // Преобразуем рабочее расписание, если оно есть
    if (data.workSchedule) {
      const enabled = data.workSchedule.enabled === undefined ? true : !!data.workSchedule.enabled;
      
      const workSchedule: Partial<WorkSchedule> = {
        enabled: enabled ? 1 : 0,
        workDays: [],
        vacations: []
      };
      
      // Рабочие дни
      if (data.workSchedule.workDays && Array.isArray(data.workSchedule.workDays)) {
        workSchedule.workDays = data.workSchedule.workDays.map((day: any) => {
          const workDay = {
            day: day.day,
            active: day.active ? 1 : 0,
            startTime: day.startTime,
            endTime: day.endTime,
            lunchBreaks: []
          };
          
          // Обеденные перерывы
          if (day.lunchBreaks && Array.isArray(day.lunchBreaks)) {
            workDay.lunchBreaks = day.lunchBreaks.map((lunch: any) => ({
              id: lunch.id,
              enabled: lunch.enabled ? 1 : 0,
              startTime: lunch.startTime,
              endTime: lunch.endTime
            }));
          }
          
          return workDay;
        });
      }
      
      // Отпуска
      if (data.workSchedule.vacations && Array.isArray(data.workSchedule.vacations)) {
        workSchedule.vacations = data.workSchedule.vacations.map((vacation: any) => ({
          id: vacation.id,
          enabled: vacation.enabled ? 1 : 0,
          startDate: vacation.startDate,
          endDate: vacation.endDate
        }));
      }
      
      specialist.workSchedule = workSchedule as WorkSchedule;
    }
    
    // Преобразуем документы, если они есть
    if (data.documents && Array.isArray(data.documents)) {
      specialist.documents = data.documents.map((doc: any) => ({
        path: doc.path,
        name: doc.name || null,
        type: doc.type || null
      }));
    }
    
    return specialistsAPI.create(specialist);
  },
  
  /**
   * Обновить специалиста
   */
  update: (id: string, data: Partial<Specialist> & { documentsInfo?: any, selectedServices?: string[] }): Specialist | null => {
    try {
      console.log(`[SpecialistsAdapter] Обновление специалиста с ID: ${id}`);
      console.log(`[SpecialistsAdapter] Данные для обновления:`, JSON.stringify(data, null, 2));
      
      // Проверяем существование специалиста
      const specialist = specialistsAPI.getById(id);
      if (!specialist) {
        console.log(`[SpecialistsAdapter] Специалист с ID ${id} не найден`);
      return null;
    }
    
      // Подготавливаем данные для обновления
      const updateData: Record<string, any> = {};
      
      // Обрабатываем только разрешенные поля и преобразуем их в простые типы данных
      if (data.firstName !== undefined) updateData.firstName = String(data.firstName);
      if (data.lastName !== undefined) updateData.lastName = String(data.lastName);
      if (data.description !== undefined) updateData.description = String(data.description);
      if (data.position !== undefined) updateData.position = String(data.position);
      
      // Обрабатываем фото специальным образом
      if (data.photo !== undefined) {
        // Если фото - это объект (FormData или File), берем существующее фото
        if (data.photo === null) {
          console.log(`[SpecialistsAdapter] Фото равно null, устанавливаем null`);
          updateData.photo = null;
        } else if (typeof data.photo === 'object' && Object.keys(data.photo).length === 0) {
          console.log(`[SpecialistsAdapter] Фото является пустым объектом, сохраняем существующее фото`);
          updateData.photo = specialist.photo;
        } else {
          console.log(`[SpecialistsAdapter] Тип фото:`, typeof data.photo);
          updateData.photo = data.photo ? String(data.photo) : null;
        }
      }
      
      // Обрабатываем userId специальным образом
      if ('userId' in data) {
        updateData.userId = data.userId === null ? null : String(data.userId);
      }
      
      // Обрабатываем массивы и объекты, преобразуя их в JSON строки
      if (data.additionalPositions) {
        // Колонки additionalPositions нет в таблице, поэтому не добавляем в updateData
        console.log(`[SpecialistsAdapter] additionalPositions не сохраняются в базу данных`);
      }
      
      // Обрабатываем services
      if (data.selectedServices || data.services) {
        const servicesToSave = data.selectedServices || 
          (data.services ? data.services.map(s => typeof s === 'string' ? s : s.id) : []);
        
        // Обновляем связи специалиста с услугами
        specialistsAdapter.updateSpecialistServices(id, servicesToSave);
      }
      
      // Обрабатываем workSchedule
      if (data.workSchedule) {
        // Колонки workSchedule нет в таблице, сохраняем в отдельную таблицу или пропускаем
        console.log(`[SpecialistsAdapter] workSchedule не сохраняется в основную таблицу`);
      }
      
      console.log(`[SpecialistsAdapter] Подготовленные данные для обновления:`, updateData);
      
      // Если нет данных для обновления, возвращаем текущего специалиста
      if (Object.keys(updateData).length === 0) {
        console.log(`[SpecialistsAdapter] Нет данных для обновления`);
        return specialist;
      }
      
      // Формируем SQL запрос
      const fields = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
      const values = Object.values(updateData);
      
      // Добавляем ID в конец значений
      values.push(id);
      
      // Выполняем запрос
      const sql = `UPDATE specialists SET ${fields} WHERE id = ?`;
      console.log(`[SpecialistsAdapter] SQL запрос: ${sql}`);
      console.log(`[SpecialistsAdapter] Значения:`, values);
      
      const stmt = db.prepare(sql);
      stmt.run(...values);
      
      console.log(`[SpecialistsAdapter] Специалист успешно обновлен`);
      
      // Обрабатываем документы, если они есть
      if (data.documentsInfo) {
        specialistsAdapter.updateSpecialistDocuments(id, data.documentsInfo);
      }
      
      // Возвращаем обновленного специалиста
      return specialistsAPI.getById(id);
    } catch (error) {
      console.error(`[SpecialistsAdapter] Ошибка при обновлении специалиста:`, error);
      return null;
    }
  },
  
  /**
   * Удалить специалиста
   */
  delete: (id: string): boolean => {
    return specialistsAPI.delete(id);
  },
  
  /**
   * Поиск специалистов
   */
  search: (query: string): Specialist[] => {
    return specialistsAPI.search(query);
  },
  
  /**
   * Получить специалистов по услуге
   */
  getByServiceId: (serviceId: string): Specialist[] => {
    return specialistsAPI.getByServiceId(serviceId);
  },
  
  /**
   * Установить порядок специалистов
   */
  setOrder: (specialistIds: string[]): boolean => {
    return specialistsAPI.setOrder(specialistIds);
  },

  /**
   * Обновить связи специалиста с услугами
   */
  updateSpecialistServices: (specialistId: string, serviceIds: string[]): boolean => {
    try {
      // Удаляем старые связи
      db.prepare('DELETE FROM specialist_services WHERE specialistId = ?').run(specialistId);
      
      // Добавляем новые связи
      if (serviceIds && serviceIds.length > 0) {
        const insertStmt = db.prepare('INSERT INTO specialist_services (specialistId, serviceId) VALUES (?, ?)');
        
        for (const serviceId of serviceIds) {
          insertStmt.run(specialistId, serviceId);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`[SpecialistsAdapter] Ошибка при обновлении услуг специалиста:`, error);
      return false;
    }
  },
  
  /**
   * Обновить документы специалиста
   */
  updateSpecialistDocuments: (specialistId: string, documentsInfo: any[]): boolean => {
    try {
      // Логика обновления документов
      console.log(`[SpecialistsAdapter] Обновление документов для специалиста ${specialistId}`);
      return true;
    } catch (error) {
      console.error(`[SpecialistsAdapter] Ошибка при обновлении документов специалиста:`, error);
      return false;
    }
  }
}; 