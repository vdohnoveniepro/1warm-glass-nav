import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { logger } from '@/lib/logger';
import { addDays, format, parseISO } from 'date-fns';

// Типы для объектов из базы данных
interface SpecialistSchedule {
  id: number;
  specialistId: string;
  enabled: number;
}

interface WorkDay {
  id: number;
  scheduleId: number;
  day: number;
  active: number;
}

interface Vacation {
  id: number;
  scheduleId: string;
  enabled: number;
  startDate: string;
  endDate: string;
}

/**
 * GET /api/specialists/[id]/available-dates
 * 
 * Получение доступных дат для записи к специалисту
 * 
 * Параметры запроса:
 * - startDate: начальная дата в формате YYYY-MM-DD
 * - endDate: конечная дата в формате YYYY-MM-DD
 * - serviceId: ID услуги (опционально)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем параметры запроса
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const serviceId = url.searchParams.get('serviceId');
    
    logger.info(`[API] Запрос на получение доступных дат для специалиста ${params.id} с ${startDate} по ${endDate}`);
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Необходимо указать начальную и конечную даты' },
        { status: 400 }
      );
    }
    
    // Проверяем, существует ли специалист
    const specialistStmt = db.prepare('SELECT id FROM specialists WHERE id = ?');
    const specialist = specialistStmt.get(params.id);
    
    if (!specialist) {
      logger.warn(`[API] Специалист не найден: ${params.id}`);
      return NextResponse.json(
        { error: 'Специалист не найден' },
        { status: 404 }
      );
    }
    
    // Получаем расписание специалиста
    const scheduleStmt = db.prepare(`
      SELECT * FROM specialist_work_schedules 
      WHERE specialistId = ? AND enabled = 1
    `);
    
    const schedule = scheduleStmt.get(params.id) as SpecialistSchedule | undefined;
    
    if (!schedule) {
      logger.warn(`[API] Расписание не найдено для специалиста: ${params.id}`);
      return NextResponse.json(
        { success: true, data: [] }
      );
    }
    
    // Получаем рабочие дни специалиста
    const workDaysStmt = db.prepare(`
      SELECT * FROM work_days
      WHERE scheduleId = ?
    `);
    
    const workDays = workDaysStmt.all(schedule.id) as WorkDay[];
    
    if (!workDays || workDays.length === 0) {
      logger.warn(`[API] Рабочие дни не настроены для расписания ${schedule.id}`);
      return NextResponse.json(
        { success: true, data: [] }
      );
    }
    
    // Получаем отпуска специалиста
    const vacationsStmt = db.prepare(`
      SELECT * FROM vacations
      WHERE scheduleId = ? 
      AND ((startDate BETWEEN ? AND ?) OR (endDate BETWEEN ? AND ?))
    `);
    
    const vacations = vacationsStmt.all(
      schedule.id, 
      startDate, 
      endDate,
      startDate,
      endDate
    ) as Vacation[];
    
    // Генерируем список дат от startDate до endDate
    const start = new Date(startDate);
    const end = new Date(endDate);
    const availableDates: string[] = [];
    
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Получаем день недели (0-воскресенье, 1-понедельник, ..., 6-суббота)
      let dayOfWeek = currentDate.getDay();
      // Преобразуем в формат 1-понедельник, ..., 7-воскресенье
      dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      
      // Проверяем, является ли день рабочим
      const workDay = workDays.find(day => day.day === dayOfWeek && day.active);
      
      if (workDay) {
        // Проверяем, не находится ли день в отпуске
        const isVacation = vacations.some(vacation => {
          // Проверяем, что отпуск активен
          if (!vacation.enabled) return false;
          
          const vacationStart = new Date(vacation.startDate);
          const vacationEnd = new Date(vacation.endDate);
          return currentDate >= vacationStart && currentDate <= vacationEnd;
        });
        
        if (!isVacation) {
          availableDates.push(dateStr);
        }
      }
      
      // Переходим к следующему дню
      currentDate = addDays(currentDate, 1);
    }
    
    logger.info(`[API] Найдено ${availableDates.length} доступных дат для специалиста ${params.id}`);
    
    return NextResponse.json({
      success: true,
      data: availableDates
    });
  } catch (error) {
    logger.error(`[API] Ошибка при получении доступных дат: ${error}`);
    return NextResponse.json(
      { error: 'Ошибка при получении доступных дат' },
      { status: 500 }
    );
  }
} 