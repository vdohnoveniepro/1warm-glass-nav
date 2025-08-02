import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export type WorkDay = {
  id: string;
  scheduleId: string;
  day: number;
  active: number;
  startTime: string;
  endTime: string;
  lunchBreaks?: LunchBreak[];
};

export type LunchBreak = {
  id: string;
  workDayId: string;
  enabled: number;
  startTime: string;
  endTime: string;
};

export type Vacation = {
  id: string;
  scheduleId: string;
  enabled: number;
  startDate: string;
  endDate: string;
};

export type WorkSchedule = {
  id: string;
  specialistId: string;
  enabled: number;
  createdAt: string;
  updatedAt: string;
  workDays: WorkDay[];
  vacations: Vacation[];
};

export type Document = {
  id: number;
  specialistId: string;
  path: string;
  name: string | null;
  type: string | null;
};

export type Specialist = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  description: string | null;
  position: string | null;
  experience: number;
  order: number;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  additionalPositions?: string[];
  documents?: Document[];
  workSchedule?: WorkSchedule;
  services?: { id: string; name?: string; color?: string }[];
  selectedServices?: string[];
};

export const specialistsAPI = {
  /**
   * Получить всех специалистов
   */
  getAll: (): Specialist[] => {
    const specialists = db.prepare('SELECT * FROM specialists ORDER BY "order" ASC').all() as Specialist[];
    
    // Загружаем дополнительные данные для каждого специалиста
    return specialists.map(specialist => {
      return {
        ...specialist,
        additionalPositions: specialistsAPI.getAdditionalPositions(specialist.id),
        documents: specialistsAPI.getDocuments(specialist.id),
        workSchedule: specialistsAPI.getWorkSchedule(specialist.id),
        selectedServices: specialistsAPI.getSelectedServices(specialist.id),
        services: specialistsAPI.getServices(specialist.id)
      };
    });
  },

  /**
   * Получить специалиста по ID
   */
  getById: (id: string): Specialist | null => {
    const specialist = db.prepare('SELECT * FROM specialists WHERE id = ?').get(id) as Specialist | null;
    
    if (!specialist) {
      return null;
    }
    
    // Загружаем дополнительные данные
    specialist.additionalPositions = specialistsAPI.getAdditionalPositions(specialist.id);
    specialist.documents = specialistsAPI.getDocuments(specialist.id);
    specialist.workSchedule = specialistsAPI.getWorkSchedule(specialist.id);
    specialist.selectedServices = specialistsAPI.getSelectedServices(specialist.id);
    specialist.services = specialistsAPI.getServices(specialist.id);
    
    return specialist;
  },

  /**
   * Получить дополнительные позиции специалиста
   */
  getAdditionalPositions: (specialistId: string): string[] => {
    try {
      // Получаем позиции из таблицы specialist_positions
      const positions = db.prepare(`
        SELECT position FROM specialist_positions
        WHERE specialistId = ?
      `).all(specialistId) as { position: string }[];
      
      // Возвращаем массив строк
      return positions.map(p => p.position);
    } catch (error) {
      console.error(`[SpecialistsAPI] Ошибка при получении additionalPositions для специалиста ${specialistId}:`, error);
      return [];
    }
  },

  /**
   * Получить документы специалиста
   */
  getDocuments: (specialistId: string): Document[] => {
    return db.prepare(`
      SELECT * FROM specialist_documents
      WHERE specialistId = ?
    `).all(specialistId) as Document[];
  },

  /**
   * Получить рабочее расписание специалиста
   */
  getWorkSchedule: (specialistId: string): WorkSchedule | undefined => {
    // Получаем основную информацию о расписании
    const schedule = db.prepare(`
      SELECT * FROM specialist_work_schedules
      WHERE specialistId = ?
    `).get(specialistId) as WorkSchedule | undefined;
    
    if (!schedule) {
      return undefined;
    }
    
    // Получаем рабочие дни
    const workDays = db.prepare(`
      SELECT * FROM work_days
      WHERE scheduleId = ?
      ORDER BY day
    `).all(schedule.id) as WorkDay[];
    
    // Для каждого рабочего дня получаем обеденные перерывы
    workDays.forEach(workDay => {
      workDay.lunchBreaks = db.prepare(`
        SELECT * FROM lunch_breaks
        WHERE workDayId = ?
      `).all(workDay.id) as LunchBreak[];
    });
    
    // Получаем отпуска
    const vacations = db.prepare(`
      SELECT * FROM vacations
      WHERE scheduleId = ?
    `).all(schedule.id) as Vacation[];
    
    return {
      ...schedule,
      workDays,
      vacations
    };
  },

  /**
   * Получить выбранные услуги специалиста
   */
  getSelectedServices: (specialistId: string): string[] => {
    const services = db.prepare(`
      SELECT serviceId FROM specialist_services
      WHERE specialistId = ?
    `).all(specialistId) as { serviceId: string }[];
    
    return services.map(s => s.serviceId);
  },

  /**
   * Получить услуги специалиста с полной информацией
   */
  getServices: (specialistId: string): { id: string; name: string; color: string }[] => {
    return db.prepare(`
      SELECT s.id, s.name, s.color 
      FROM services s
      JOIN specialist_services ss ON s.id = ss.serviceId
      WHERE ss.specialistId = ?
    `).all(specialistId) as { id: string; name: string; color: string }[];
  },

  /**
   * Создать нового специалиста
   */
  create: (specialist: Partial<Specialist>): Specialist => {
    const id = specialist.id || uuidv4();
    const now = new Date().toISOString();
    
    const newSpecialist: Specialist = {
      id,
      firstName: specialist.firstName || '',
      lastName: specialist.lastName || '',
      photo: specialist.photo || null,
      description: specialist.description || null,
      position: specialist.position || null,
      experience: specialist.experience || 0,
      order: specialist.order || 0,
      userId: specialist.userId || null,
      createdAt: now,
      updatedAt: now
    };
    
    // Вставляем основные данные
    db.prepare(`
      INSERT INTO specialists (
        id, firstName, lastName, photo, description, 
        position, experience, "order", userId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newSpecialist.id,
      newSpecialist.firstName,
      newSpecialist.lastName,
      newSpecialist.photo,
      newSpecialist.description,
      newSpecialist.position,
      newSpecialist.experience,
      newSpecialist.order,
      newSpecialist.userId,
      newSpecialist.createdAt,
      newSpecialist.updatedAt
    );
    
    // Сохраняем дополнительные должности
    if (specialist.additionalPositions && specialist.additionalPositions.length > 0) {
      const positionStmt = db.prepare(`
        INSERT INTO specialist_positions (specialistId, position)
        VALUES (?, ?)
      `);
      
      for (const position of specialist.additionalPositions) {
        positionStmt.run(newSpecialist.id, position);
      }
    }
    
    // Сохраняем документы
    if (specialist.documents && specialist.documents.length > 0) {
      const docStmt = db.prepare(`
        INSERT INTO specialist_documents (specialistId, path, name, type)
        VALUES (?, ?, ?, ?)
      `);
      
      for (const doc of specialist.documents) {
        docStmt.run(newSpecialist.id, doc.path, doc.name, doc.type);
      }
    }
    
    // Создаем рабочее расписание
    if (specialist.workSchedule) {
      const scheduleId = `schedule_${newSpecialist.id}`;
      
      // Вставляем основные данные расписания
      db.prepare(`
        INSERT INTO specialist_work_schedules (id, specialistId, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        scheduleId,
        newSpecialist.id,
        specialist.workSchedule.enabled ? 1 : 0,
        now,
        now
      );
      
      // Вставляем рабочие дни
      if (specialist.workSchedule.workDays && specialist.workSchedule.workDays.length > 0) {
        const workDayStmt = db.prepare(`
          INSERT INTO work_days (id, scheduleId, day, active, startTime, endTime)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const lunchBreakStmt = db.prepare(`
          INSERT INTO lunch_breaks (id, workDayId, enabled, startTime, endTime)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const workDay of specialist.workSchedule.workDays) {
          const workDayId = workDay.id || `workday_${newSpecialist.id}_${workDay.day}`;
          
          workDayStmt.run(
            workDayId,
            scheduleId,
            workDay.day,
            workDay.active ? 1 : 0,
            workDay.startTime,
            workDay.endTime
          );
          
          // Вставляем обеденные перерывы
          if (workDay.lunchBreaks && workDay.lunchBreaks.length > 0) {
            for (const lunchBreak of workDay.lunchBreaks) {
              lunchBreakStmt.run(
                lunchBreak.id || `lunchbreak_${workDayId}_${lunchBreak.startTime}`,
                workDayId,
                lunchBreak.enabled ? 1 : 0,
                lunchBreak.startTime,
                lunchBreak.endTime
              );
            }
          }
        }
      }
      
      // Вставляем отпуска
      if (specialist.workSchedule.vacations && specialist.workSchedule.vacations.length > 0) {
        const vacationStmt = db.prepare(`
          INSERT INTO vacations (id, scheduleId, enabled, startDate, endDate)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const vacation of specialist.workSchedule.vacations) {
          vacationStmt.run(
            vacation.id || `vacation_${newSpecialist.id}_${vacation.startDate}`,
            scheduleId,
            vacation.enabled ? 1 : 0,
            vacation.startDate,
            vacation.endDate
          );
        }
      }
    }
    
    // Связываем с услугами
    if (specialist.selectedServices && specialist.selectedServices.length > 0) {
      const serviceStmt = db.prepare(`
        INSERT INTO specialist_services (specialistId, serviceId)
        VALUES (?, ?)
      `);
      
      for (const serviceId of specialist.selectedServices) {
        serviceStmt.run(newSpecialist.id, serviceId);
      }
    }
    
    return specialistsAPI.getById(newSpecialist.id) as Specialist;
  },

  /**
   * Обновить специалиста
   */
  update: (id: string, specialist: Partial<Specialist>): Specialist | null => {
    const currentSpecialist = specialistsAPI.getById(id);
    
    if (!currentSpecialist) {
      return null;
    }
    
    const updatedSpecialist: Specialist = {
      ...currentSpecialist,
      ...specialist,
      id, // Сохраняем исходный ID
      updatedAt: new Date().toISOString()
    };
    
    // Обновляем основные данные
    db.prepare(`
      UPDATE specialists
      SET firstName = ?,
          lastName = ?,
          photo = ?,
          description = ?,
          position = ?,
          experience = ?,
          "order" = ?,
          userId = ?,
          updatedAt = ?
      WHERE id = ?
    `).run(
      updatedSpecialist.firstName,
      updatedSpecialist.lastName,
      updatedSpecialist.photo,
      updatedSpecialist.description,
      updatedSpecialist.position,
      updatedSpecialist.experience,
      updatedSpecialist.order,
      updatedSpecialist.userId,
      updatedSpecialist.updatedAt,
      id
    );
    
    // Обновляем дополнительные должности
    if (specialist.additionalPositions !== undefined) {
      // Удаляем старые должности
      db.prepare(`DELETE FROM specialist_positions WHERE specialistId = ?`).run(id);
      
      // Добавляем новые должности
      if (specialist.additionalPositions.length > 0) {
        const positionStmt = db.prepare(`
          INSERT INTO specialist_positions (specialistId, position)
          VALUES (?, ?)
        `);
        
        for (const position of specialist.additionalPositions) {
          positionStmt.run(id, position);
        }
      }
    }
    
    // Обновляем документы (если они указаны)
    if (specialist.documents !== undefined) {
      // Удаляем старые документы
      db.prepare(`DELETE FROM specialist_documents WHERE specialistId = ?`).run(id);
      
      // Добавляем новые документы
      if (specialist.documents.length > 0) {
        const docStmt = db.prepare(`
          INSERT INTO specialist_documents (specialistId, path, name, type)
          VALUES (?, ?, ?, ?)
        `);
        
        for (const doc of specialist.documents) {
          docStmt.run(id, doc.path, doc.name, doc.type);
        }
      }
    }
    
    // Обновляем рабочее расписание
    if (specialist.workSchedule !== undefined) {
      const scheduleId = `schedule_${id}`;
      
      // Проверяем существует ли расписание
      const existingSchedule = db.prepare(`
        SELECT id FROM specialist_work_schedules WHERE specialistId = ?
      `).get(id);
      
      if (existingSchedule) {
        // Обновляем существующее расписание
        db.prepare(`
          UPDATE specialist_work_schedules
          SET enabled = ?, updatedAt = ?
          WHERE specialistId = ?
        `).run(
          specialist.workSchedule.enabled ? 1 : 0,
          updatedSpecialist.updatedAt,
          id
        );
      } else {
        // Создаем новое расписание
        db.prepare(`
          INSERT INTO specialist_work_schedules (id, specialistId, enabled, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          scheduleId,
          id,
          specialist.workSchedule.enabled ? 1 : 0,
          updatedSpecialist.createdAt,
          updatedSpecialist.updatedAt
        );
      }
      
      // Удаляем старые рабочие дни и отпуска
      db.prepare(`
        DELETE FROM lunch_breaks WHERE workDayId IN (
          SELECT id FROM work_days WHERE scheduleId = ?
        )
      `).run(scheduleId);
      
      db.prepare(`DELETE FROM work_days WHERE scheduleId = ?`).run(scheduleId);
      db.prepare(`DELETE FROM vacations WHERE scheduleId = ?`).run(scheduleId);
      
      // Добавляем новые рабочие дни
      if (specialist.workSchedule.workDays && specialist.workSchedule.workDays.length > 0) {
        const workDayStmt = db.prepare(`
          INSERT INTO work_days (id, scheduleId, day, active, startTime, endTime)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const lunchBreakStmt = db.prepare(`
          INSERT INTO lunch_breaks (id, workDayId, enabled, startTime, endTime)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const workDay of specialist.workSchedule.workDays) {
          const workDayId = workDay.id || `workday_${id}_${workDay.day}`;
          
          workDayStmt.run(
            workDayId,
            scheduleId,
            workDay.day,
            workDay.active ? 1 : 0,
            workDay.startTime,
            workDay.endTime
          );
          
          // Добавляем обеденные перерывы
          if (workDay.lunchBreaks && workDay.lunchBreaks.length > 0) {
            for (const lunchBreak of workDay.lunchBreaks) {
              lunchBreakStmt.run(
                lunchBreak.id || `lunchbreak_${workDayId}_${lunchBreak.startTime}`,
                workDayId,
                lunchBreak.enabled ? 1 : 0,
                lunchBreak.startTime,
                lunchBreak.endTime
              );
            }
          }
        }
      }
      
      // Добавляем новые отпуска
      if (specialist.workSchedule.vacations && specialist.workSchedule.vacations.length > 0) {
        const vacationStmt = db.prepare(`
          INSERT INTO vacations (id, scheduleId, enabled, startDate, endDate)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const vacation of specialist.workSchedule.vacations) {
          vacationStmt.run(
            vacation.id || `vacation_${id}_${vacation.startDate}`,
            scheduleId,
            vacation.enabled ? 1 : 0,
            vacation.startDate,
            vacation.endDate
          );
        }
      }
    }
    
    // Обновляем связи с услугами
    if (specialist.selectedServices !== undefined) {
      // Удаляем старые связи
      db.prepare(`DELETE FROM specialist_services WHERE specialistId = ?`).run(id);
      
      // Добавляем новые связи
      if (specialist.selectedServices.length > 0) {
        const serviceStmt = db.prepare(`
          INSERT INTO specialist_services (specialistId, serviceId)
          VALUES (?, ?)
        `);
        
        for (const serviceId of specialist.selectedServices) {
          serviceStmt.run(id, serviceId);
        }
      }
    }
    
    return specialistsAPI.getById(id);
  },

  /**
   * Удалить специалиста
   */
  delete: (id: string): boolean => {
    try {
      console.log(`[specialistsAPI.delete] Начало удаления специалиста с ID: ${id}`);
      
      // Получаем данные специалиста перед удалением
      const specialist = specialistsAPI.getById(id);
      if (!specialist) {
        console.log(`[specialistsAPI.delete] Специалист с ID ${id} не найден`);
        return false;
      }

      console.log(`[specialistsAPI.delete] Найден специалист: ${specialist.firstName} ${specialist.lastName}`);

      // Удаляем фото специалиста, если оно есть
      if (specialist.photo) {
        console.log(`[specialistsAPI.delete] Удаление фото: ${specialist.photo}`);
        
        // Удаляем оригинальное фото
        deleteSpecialistImage(specialist.photo);
        
        // Проверяем и удаляем WebP версию, если она существует
        const photoPath = specialist.photo;
        const webpPath = photoPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        if (webpPath !== photoPath) {
          console.log(`[specialistsAPI.delete] Проверка наличия WebP версии: ${webpPath}`);
          deleteSpecialistImage(webpPath);
        }
      }

      // Удаляем документы специалиста
      const documents = specialistsAPI.getDocuments(id);
      console.log(`[specialistsAPI.delete] Найдено документов для удаления: ${documents.length}`);
      
      if (documents && documents.length > 0) {
        documents.forEach(doc => {
          if (doc.path) {
            console.log(`[specialistsAPI.delete] Удаление документа: ${doc.path}`);
            deleteSpecialistDocument(doc.path);
          }
        });
      }

      const scheduleId = `schedule_${id}`;
      console.log(`[specialistsAPI.delete] Удаление связанных данных для scheduleId: ${scheduleId}`);
      
      // Удаляем все связанные данные
      console.log(`[specialistsAPI.delete] Удаление обеденных перерывов`);
      db.prepare(`
        DELETE FROM lunch_breaks WHERE workDayId IN (
          SELECT id FROM work_days WHERE scheduleId = ?
        )
      `).run(scheduleId);
      
      console.log(`[specialistsAPI.delete] Удаление рабочих дней`);
      db.prepare(`DELETE FROM work_days WHERE scheduleId = ?`).run(scheduleId);
      
      console.log(`[specialistsAPI.delete] Удаление отпусков`);
      db.prepare(`DELETE FROM vacations WHERE scheduleId = ?`).run(scheduleId);
      
      console.log(`[specialistsAPI.delete] Удаление расписания`);
      db.prepare(`DELETE FROM specialist_work_schedules WHERE specialistId = ?`).run(id);
      
      console.log(`[specialistsAPI.delete] Удаление должностей`);
      db.prepare(`DELETE FROM specialist_positions WHERE specialistId = ?`).run(id);
      
      console.log(`[specialistsAPI.delete] Удаление документов из БД`);
      db.prepare(`DELETE FROM specialist_documents WHERE specialistId = ?`).run(id);
      
      console.log(`[specialistsAPI.delete] Удаление связей с услугами`);
      db.prepare(`DELETE FROM specialist_services WHERE specialistId = ?`).run(id);
      
      // Удаляем записи на прием к этому специалисту
      console.log(`[specialistsAPI.delete] Удаление записей на прием`);
      db.prepare(`DELETE FROM appointments WHERE specialistId = ?`).run(id);
      
      // Удаляем заметки специалиста
      console.log(`[specialistsAPI.delete] Удаление заметок специалиста`);
      db.prepare(`DELETE FROM specialist_notes WHERE specialistId = ?`).run(id);
      
      // Удаляем специалиста
      console.log(`[specialistsAPI.delete] Удаление записи специалиста из БД`);
      const result = db.prepare(`DELETE FROM specialists WHERE id = ?`).run(id);
      
      console.log(`[specialistsAPI.delete] Результат удаления: ${result.changes > 0 ? 'успешно' : 'неудачно'}`);
      return result.changes > 0;
    } catch (error) {
      console.error(`Ошибка при удалении специалиста (ID: ${id}):`, error);
      return false;
    }
  },

  /**
   * Поиск специалистов
   */
  search: (query: string): Specialist[] => {
    const specialists = db.prepare(`
      SELECT * FROM specialists
      WHERE firstName LIKE ? OR lastName LIKE ? OR position LIKE ?
      ORDER BY "order" ASC
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as Specialist[];
    
    // Загружаем дополнительные данные
    return specialists.map(specialist => {
      return {
        ...specialist,
        additionalPositions: specialistsAPI.getAdditionalPositions(specialist.id),
        documents: specialistsAPI.getDocuments(specialist.id),
        workSchedule: specialistsAPI.getWorkSchedule(specialist.id),
        selectedServices: specialistsAPI.getSelectedServices(specialist.id)
      };
    });
  },
  
  /**
   * Установить порядок специалистов
   */
  setOrder: (specialistIds: string[]): boolean => {
    const updateStmt = db.prepare(`
      UPDATE specialists
      SET "order" = ?
      WHERE id = ?
    `);
    
    const transaction = db.transaction((ids: string[]) => {
      ids.forEach((id, index) => {
        updateStmt.run(index, id);
      });
    });
    
    try {
      transaction(specialistIds);
      return true;
    } catch (error) {
      console.error('Ошибка при установке порядка специалистов:', error);
      return false;
    }
  },
  
  /**
   * Получить специалистов по услуге
   */
  getByServiceId: (serviceId: string): Specialist[] => {
    const specialists = db.prepare(`
      SELECT s.* FROM specialists s
      JOIN specialist_services ss ON s.id = ss.specialistId
      WHERE ss.serviceId = ?
      ORDER BY s."order" ASC
    `).all(serviceId) as Specialist[];
    
    // Загружаем дополнительные данные
    return specialists.map(specialist => {
      return {
        ...specialist,
        additionalPositions: specialistsAPI.getAdditionalPositions(specialist.id),
        documents: specialistsAPI.getDocuments(specialist.id),
        workSchedule: specialistsAPI.getWorkSchedule(specialist.id),
        selectedServices: specialistsAPI.getSelectedServices(specialist.id)
      };
    });
  },

  /**
   * Найти специалиста по telegramId пользователя
   */
  findByTelegramId: (telegramId: string): Specialist | null => {
    // Сначала находим пользователя по telegramId
    const user = db.prepare('SELECT * FROM users WHERE telegramId = ?').get(telegramId) as { id: string; specialistId?: string } | undefined;
    
    if (!user || !user.specialistId) {
      return null;
    }
    
    // Затем находим специалиста по ID из пользователя
    return specialistsAPI.getById(user.specialistId);
  },

  /**
   * Найти специалиста по userId
   */
  getByUserId: (userId: string): Specialist | null => {
    const specialist = db.prepare('SELECT * FROM specialists WHERE userId = ?').get(userId) as Specialist | null;
    
    if (!specialist) {
      return null;
    }
    
    // Загружаем дополнительные данные
    specialist.additionalPositions = specialistsAPI.getAdditionalPositions(specialist.id);
    specialist.documents = specialistsAPI.getDocuments(specialist.id);
    specialist.workSchedule = specialistsAPI.getWorkSchedule(specialist.id);
    specialist.selectedServices = specialistsAPI.getSelectedServices(specialist.id);
    specialist.services = specialistsAPI.getServices(specialist.id);
    
    return specialist;
  },
};

// Функции для удаления файлов
function deleteSpecialistImage(imagePath: string): boolean {
  try {
    if (!imagePath) {
      console.log(`[deleteSpecialistImage] Путь к изображению не указан`);
      return false;
    }
    
    if (imagePath.startsWith('http') || imagePath.includes('placeholder')) {
      console.log(`[deleteSpecialistImage] Пропуск внешнего изображения или плейсхолдера: ${imagePath}`);
      return false; // Пропускаем внешние изображения и плейсхолдеры
    }
    
    // Нормализуем путь (убираем начальный слеш, если есть)
    const normalizedPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    // Преобразуем URL в путь к файлу
    const filePath = path.join(process.cwd(), 'public', normalizedPath);
    
    console.log(`[deleteSpecialistImage] Попытка удаления файла: ${filePath}`);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.warn(`[deleteSpecialistImage] Файл для удаления не найден: ${filePath}`);
      return false;
    }
    
    // Удаляем файл
    fs.unlinkSync(filePath);
    console.log(`[deleteSpecialistImage] Файл успешно удален: ${filePath}`);
    return true;
  } catch (error) {
    console.error('[deleteSpecialistImage] Ошибка при удалении изображения:', error);
    return false;
  }
}

function deleteSpecialistDocument(docPath: string): boolean {
  try {
    if (!docPath) {
      console.log(`[deleteSpecialistDocument] Путь к документу не указан`);
      return false;
    }
    
    if (docPath.startsWith('http')) {
      console.log(`[deleteSpecialistDocument] Пропуск внешнего документа: ${docPath}`);
      return false; // Пропускаем внешние документы
    }
    
    // Нормализуем путь (убираем начальный слеш, если есть)
    const normalizedPath = docPath.startsWith('/') ? docPath.substring(1) : docPath;
    
    // Преобразуем URL в путь к файлу
    const filePath = path.join(process.cwd(), 'public', normalizedPath);
    
    console.log(`[deleteSpecialistDocument] Попытка удаления документа: ${filePath}`);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.warn(`[deleteSpecialistDocument] Документ для удаления не найден: ${filePath}`);
      return false;
    }
    
    // Удаляем файл
    fs.unlinkSync(filePath);
    console.log(`[deleteSpecialistDocument] Документ успешно удален: ${filePath}`);
    return true;
  } catch (error) {
    console.error('[deleteSpecialistDocument] Ошибка при удалении документа:', error);
    return false;
  }
} 