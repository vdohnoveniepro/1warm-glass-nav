import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth';
import { specialistsAPI } from '@/database/api/specialists';

interface WorkDay {
  day: number;
  active: boolean;
  startTime: string;
  endTime: string;
  lunchBreaks: LunchBreak[];
}

interface LunchBreak {
  id: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface Vacation {
  id: string;
  enabled: boolean;
  startDate: string;
  endDate: string;
  description?: string;
}

interface WorkSchedule {
  enabled: boolean;
  workDays: WorkDay[];
  vacations: Vacation[];
  bookingPeriodMonths: number;
}

// GET запрос для получения расписания специалиста
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const specialistId = params.id;
    logger.info(`[API] Запрос на получение расписания специалиста: ${specialistId}`);
    
    // Получаем текущего пользователя
    const { user } = await getCurrentUser();
    
    // Проверяем, что пользователь авторизован и имеет доступ к расписанию
    // (админ, специалист, которому принадлежит расписание, или публичный доступ для клиентов)
    if (!user) {
      logger.warn(`[API] Неавторизованный запрос к расписанию специалиста ${specialistId}`);
      // Для неавторизованных пользователей разрешаем только просмотр (для клиентов)
    }
    
    // Проверяем существование специалиста
    const specialist = specialistsAPI.getById(specialistId);
    if (!specialist) {
      logger.warn(`[API] Специалист с ID ${specialistId} не найден при запросе расписания`);
      return NextResponse.json(
        { success: false, error: 'Специалист не найден' },
        { status: 404 }
      );
    }
    
    // Получаем расписание специалиста
    const scheduleStmt = db.prepare(`
      SELECT * FROM specialist_work_schedules 
      WHERE specialistId = ?
    `);
    
    const schedule = scheduleStmt.get(specialistId);
    
    if (!schedule) {
      // Если расписание не найдено, возвращаем пустое расписание по умолчанию
      logger.info(`[API] Расписание для специалиста ${specialistId} не найдено, возвращаем шаблон`);
      
      const defaultSchedule: WorkSchedule = {
        enabled: true,
        workDays: Array(7).fill(null).map((_, index) => ({
          day: index === 0 ? 0 : index, // 0-воскресенье, 1-понедельник и т.д.
          active: index > 0 && index < 6, // По умолчанию рабочие дни - будни (пн-пт)
          startTime: '09:00',
          endTime: '18:00',
          lunchBreaks: [
            {
              id: `default_${Date.now()}${index}`,
              enabled: true,
              startTime: '13:00',
              endTime: '14:00'
            }
          ]
        })),
        vacations: [],
        bookingPeriodMonths: 2 // По умолчанию 2 месяца
      };
      
      return NextResponse.json({ success: true, data: defaultSchedule });
    }
    
    // Получаем рабочие дни
    const workDaysStmt = db.prepare(`
      SELECT * FROM work_days
      WHERE scheduleId = ?
    `);
    
    const workDays = workDaysStmt.all(schedule.id) || [];
    
    // Для каждого рабочего дня получаем обеденные перерывы
    const workDaysWithBreaks = workDays.map(day => {
      const lunchBreaksStmt = db.prepare(`
        SELECT * FROM lunch_breaks
        WHERE workDayId = ?
      `);
      
      const lunchBreaks = lunchBreaksStmt.all(day.id) || [];
      
      return {
        day: day.day,
        active: Boolean(day.active),
        startTime: day.startTime,
        endTime: day.endTime,
        lunchBreaks: lunchBreaks.map(breakItem => ({
          id: breakItem.id,
          enabled: Boolean(breakItem.enabled),
          startTime: breakItem.startTime,
          endTime: breakItem.endTime
        }))
      };
    });
    
    // Получаем отпуска
    const vacationsStmt = db.prepare(`
      SELECT * FROM vacations
      WHERE scheduleId = ?
    `);
    
    const vacations = vacationsStmt.all(schedule.id) || [];
    const vacationsFormatted = vacations.map(vacation => ({
      id: vacation.id,
      enabled: Boolean(vacation.enabled),
      startDate: vacation.startDate,
      endDate: vacation.endDate,
      description: vacation.description
    }));
    
    // Формируем полное расписание
    const workSchedule: WorkSchedule = {
      enabled: Boolean(schedule.enabled),
      workDays: workDaysWithBreaks,
      vacations: vacationsFormatted,
      bookingPeriodMonths: schedule.bookingPeriodMonths || 2
    };
    
    logger.info(`[API] Успешно получено расписание для специалиста ${specialistId}`);
    
    return NextResponse.json({ success: true, data: workSchedule });
  } catch (error) {
    logger.error(`[API] Ошибка при получении расписания: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении расписания' },
      { status: 500 }
    );
  }
}

// PUT запрос для обновления расписания специалиста
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const specialistId = params.id;
    logger.info(`[API] Запрос на обновление расписания специалиста: ${specialistId}`);
    
    // Получаем текущего пользователя
    const { user } = await getCurrentUser();
    
    // Проверяем, что пользователь авторизован и имеет права на изменение расписания
    if (!user || (user.role !== 'admin' && user.id !== specialistId)) {
      logger.warn(`[API] Неавторизованный запрос на обновление расписания специалиста ${specialistId}`);
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    // Проверяем существование специалиста
    const specialist = specialistsAPI.getById(specialistId);
    if (!specialist) {
      logger.warn(`[API] Специалист с ID ${specialistId} не найден при обновлении расписания`);
      return NextResponse.json(
        { success: false, error: 'Специалист не найден' },
        { status: 404 }
      );
    }
    
    // Получаем данные из запроса
    const workSchedule = await request.json();
    
    // Начинаем транзакцию
    db.prepare('BEGIN').run();
    
    try {
      const scheduleId = `schedule_${specialistId}`;
      
      // Проверяем существует ли расписание
      const existingSchedule = db.prepare(`
        SELECT id FROM specialist_work_schedules WHERE specialistId = ?
      `).get(specialistId);
      
      if (existingSchedule) {
        // Обновляем существующее расписание
        db.prepare(`
          UPDATE specialist_work_schedules
          SET enabled = ?, bookingPeriodMonths = ?, updatedAt = ?
          WHERE specialistId = ?
        `).run(
          workSchedule.enabled ? 1 : 0,
          workSchedule.bookingPeriodMonths || 2,
          new Date().toISOString(),
          specialistId
        );
      } else {
        // Создаем новое расписание
        db.prepare(`
          INSERT INTO specialist_work_schedules (id, specialistId, enabled, bookingPeriodMonths, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          scheduleId,
          specialistId,
          workSchedule.enabled ? 1 : 0,
          workSchedule.bookingPeriodMonths || 2,
          new Date().toISOString(),
          new Date().toISOString()
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
      if (workSchedule.workDays && workSchedule.workDays.length > 0) {
        const workDayStmt = db.prepare(`
          INSERT INTO work_days (id, scheduleId, day, active, startTime, endTime)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const lunchBreakStmt = db.prepare(`
          INSERT INTO lunch_breaks (id, workDayId, enabled, startTime, endTime)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const workDay of workSchedule.workDays) {
          const workDayId = `workday_${specialistId}_${workDay.day}_${Date.now()}`;
          
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
                lunchBreak.id || `lunchbreak_${workDayId}_${Date.now()}`,
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
      if (workSchedule.vacations && workSchedule.vacations.length > 0) {
        const vacationStmt = db.prepare(`
          INSERT INTO vacations (id, scheduleId, enabled, startDate, endDate, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        for (const vacation of workSchedule.vacations) {
          vacationStmt.run(
            vacation.id || `vacation_${specialistId}_${Date.now()}`,
            scheduleId,
            vacation.enabled ? 1 : 0,
            vacation.startDate,
            vacation.endDate,
            vacation.description || null
          );
        }
      }
      
      // Завершаем транзакцию
      db.prepare('COMMIT').run();
      
      logger.info(`[API] Расписание для специалиста ${specialistId} успешно обновлено`);
      
      return NextResponse.json({ success: true, message: 'Расписание успешно обновлено' });
    } catch (error) {
      // В случае ошибки отменяем транзакцию
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    logger.error(`[API] Ошибка при обновлении расписания: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении расписания' },
      { status: 500 }
    );
  }
} 