import { db } from '@/app/api/db';
import { WorkSchedule, WorkDay, LunchBreak, Vacation } from '@/types/schedule';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * API для работы с расписаниями специалистов
 */
export class ScheduleAPI {
  /**
   * Получает расписание специалиста по его ID
   */
  static async getSpecialistSchedule(specialistId: string): Promise<WorkSchedule> {
    try {
      // Получаем основную информацию о расписании
      const scheduleStmt = db.prepare(`
        SELECT * FROM specialist_work_schedules 
        WHERE specialistId = ? AND enabled = 1
      `);
      
      const schedule = scheduleStmt.get(specialistId) as any;
      
      if (!schedule) {
        throw new Error(`Расписание для специалиста ${specialistId} не найдено`);
      }
      
      // Получаем рабочие дни
      const workDaysStmt = db.prepare(`
        SELECT * FROM work_days
        WHERE scheduleId = ?
      `);
      
      const workDays = workDaysStmt.all(schedule.id) as WorkDay[];
      
      // Для каждого рабочего дня получаем обеденные перерывы
      const workDaysWithBreaks = await Promise.all(workDays.map(async (day) => {
        const lunchBreaksStmt = db.prepare(`
          SELECT * FROM lunch_breaks
          WHERE workDayId = ? AND enabled = 1
        `);
        
        const lunchBreaks = lunchBreaksStmt.all(day.id) as LunchBreak[];
        
        return {
          ...day,
          lunchBreaks
        };
      }));
      
      // Получаем отпуска
      const vacationsStmt = db.prepare(`
        SELECT * FROM vacations
        WHERE scheduleId = ? AND enabled = 1
      `);
      
      const vacations = vacationsStmt.all(schedule.id) as Vacation[];
      
      // Формируем полное расписание
      const workSchedule: WorkSchedule = {
        id: schedule.id,
        specialistId,
        enabled: Boolean(schedule.enabled),
        workDays: workDaysWithBreaks,
        vacations,
        bookingPeriodMonths: schedule.bookingPeriodMonths || 3
      };
      
      return workSchedule;
    } catch (error) {
      logger.error(`Ошибка при получении расписания для специалиста ${specialistId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Обновляет расписание специалиста
   */
  static async updateSpecialistSchedule(specialistId: string, schedule: WorkSchedule): Promise<void> {
    try {
      // Начинаем транзакцию
      db.prepare('BEGIN').run();
      
      try {
        // Обновляем основную информацию о расписании
        const scheduleId = schedule.id || uuidv4();
        
        const scheduleStmt = db.prepare(`
          INSERT OR REPLACE INTO specialist_work_schedules 
          (id, specialistId, enabled, bookingPeriodMonths, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        scheduleStmt.run(
          scheduleId,
          specialistId,
          schedule.enabled ? 1 : 0,
          schedule.bookingPeriodMonths || 3,
          new Date().toISOString()
        );
        
        // Удаляем старые рабочие дни
        const deleteWorkDaysStmt = db.prepare(`
          DELETE FROM work_days WHERE scheduleId = ?
        `);
        
        deleteWorkDaysStmt.run(scheduleId);
        
        // Добавляем новые рабочие дни
        const insertWorkDayStmt = db.prepare(`
          INSERT INTO work_days 
          (id, scheduleId, dayOfWeek, active, startTime, endTime)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        // Для каждого рабочего дня добавляем обеденные перерывы
        const insertLunchBreakStmt = db.prepare(`
          INSERT INTO lunch_breaks
          (id, workDayId, enabled, startTime, endTime)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        schedule.workDays.forEach(day => {
          const workDayId = day.id || uuidv4();
          
          insertWorkDayStmt.run(
            workDayId,
            scheduleId,
            day.dayOfWeek,
            day.active ? 1 : 0,
            day.startTime,
            day.endTime
          );
          
          // Добавляем обеденные перерывы
          if (day.lunchBreaks && day.lunchBreaks.length > 0) {
            day.lunchBreaks.forEach(break_ => {
              insertLunchBreakStmt.run(
                break_.id || uuidv4(),
                workDayId,
                break_.enabled ? 1 : 0,
                break_.startTime,
                break_.endTime
              );
            });
          }
        });
        
        // Удаляем старые отпуска
        const deleteVacationsStmt = db.prepare(`
          DELETE FROM vacations WHERE scheduleId = ?
        `);
        
        deleteVacationsStmt.run(scheduleId);
        
        // Добавляем новые отпуска
        if (schedule.vacations && schedule.vacations.length > 0) {
          const insertVacationStmt = db.prepare(`
            INSERT INTO vacations
            (id, scheduleId, enabled, startDate, endDate)
            VALUES (?, ?, ?, ?, ?)
          `);
          
          schedule.vacations.forEach(vacation => {
            insertVacationStmt.run(
              vacation.id || uuidv4(),
              scheduleId,
              vacation.enabled ? 1 : 0,
              vacation.startDate,
              vacation.endDate
            );
          });
        }
        
        // Завершаем транзакцию
        db.prepare('COMMIT').run();
        
        logger.info(`Расписание для специалиста ${specialistId} успешно обновлено`);
      } catch (error) {
        // В случае ошибки отменяем транзакцию
        db.prepare('ROLLBACK').run();
        throw error;
      }
    } catch (error) {
      logger.error(`Ошибка при обновлении расписания для специалиста ${specialistId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Получает доступные временные слоты для записи к специалисту
   */
  static async getAvailableTimeSlots(specialistId: string, startDate: string, endDate: string) {
    // TODO: Реализовать логику получения доступных слотов на основе расписания и существующих записей
    // Это будет сложный алгоритм, который нужно будет реализовать отдельно
    
    logger.info(`Запрос доступных слотов для специалиста ${specialistId} с ${startDate} по ${endDate}`);
    
    // Получаем расписание специалиста
    const schedule = await this.getSpecialistSchedule(specialistId);
    
    // На данном этапе возвращаем заглушку - фиктивные данные
    // В реальной реализации нужно будет:
    // 1. Получить расписание специалиста
    // 2. Получить все существующие записи в указанный период
    // 3. Сформировать доступные временные слоты с учетом расписания и занятых слотов
    
    return {
      specialistId,
      scheduleData: [
        {
          date: startDate,
          dayOfWeek: new Date(startDate).getDay(),
          slots: [
            { startTime: '09:00', endTime: '09:30', available: true },
            { startTime: '09:30', endTime: '10:00', available: true },
            { startTime: '10:00', endTime: '10:30', available: false }, // уже занято
            { startTime: '10:30', endTime: '11:00', available: true },
          ]
        },
        // Другие дни можно будет добавить в реальной реализации
      ]
    };
  }
} 