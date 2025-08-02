import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { logger } from '@/lib/logger';

// Типы для объектов из базы данных
interface SpecialistSchedule {
  id: string;
  specialistId: string;
  enabled: number;
}

interface WorkDay {
  id: string;
  scheduleId: string;
  day: number;
  active: number;
  startTime: string;
  endTime: string;
}

// Получение доступности специалиста
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info(`[API] Запрос на получение доступности специалиста: ${params.id}`);
    
    // Получаем параметры запроса
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { error: 'Необходимо указать дату' },
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
    
    const schedule = scheduleStmt.get(params.id) as SpecialistSchedule;
    
    if (!schedule) {
      logger.warn(`[API] Расписание не найдено для специалиста: ${params.id}`);
      return NextResponse.json(
        { error: 'Расписание не найдено' },
        { status: 404 }
      );
    }
    
    // Получаем день недели для указанной даты (0 - воскресенье, 1 - понедельник, и т.д.)
    const dateObj = new Date(date);
    // Преобразуем в формат 1 (понедельник) - 7 (воскресенье)
    let dayOfWeek = dateObj.getDay() || 7;
    // Преобразуем в формат 0 (понедельник) - 6 (воскресенье)
    dayOfWeek = dayOfWeek === 7 ? 0 : dayOfWeek;
    
    // Получаем рабочий день из расписания
    const workDayStmt = db.prepare(`
      SELECT * FROM work_days 
      WHERE scheduleId = ? AND day = ? AND active = 1
    `);
    
    const workDay = workDayStmt.get(schedule.id, dayOfWeek) as WorkDay;
    
    if (!workDay) {
      logger.info(`[API] Рабочий день не найден для специалиста ${params.id} на день недели ${dayOfWeek}`);
      return NextResponse.json({ 
        success: true, 
        data: { 
          available: false,
          reason: 'not_working_day'
        } 
      });
    }
    
    // Получаем перерывы на обед
    const lunchBreaksStmt = db.prepare(`
      SELECT * FROM lunch_breaks 
      WHERE workDayId = ? AND enabled = 1
    `);
    
    const lunchBreaks = lunchBreaksStmt.all(workDay.id);
    
    // Получаем отпуска
    const vacationsStmt = db.prepare(`
      SELECT * FROM vacations 
      WHERE scheduleId = ? AND enabled = 1 
      AND ? BETWEEN startDate AND endDate
    `);
    
    const vacations = vacationsStmt.all(schedule.id, date);
    
    // Если специалист в отпуске в этот день
    if (vacations.length > 0) {
      logger.info(`[API] Специалист ${params.id} в отпуске на дату ${date}`);
      return NextResponse.json({ 
        success: true, 
        data: { 
          available: false,
          reason: 'vacation'
        } 
      });
    }
    
    // Получаем записи на этот день
    const appointmentsStmt = db.prepare(`
      SELECT * FROM appointments 
      WHERE specialistId = ? AND date = ? 
      AND status NOT IN ('cancelled', 'archived')
    `);
    
    const appointments = appointmentsStmt.all(params.id, date);
    
    // Формируем ответ
    const response = {
      success: true,
      data: {
        available: true,
        workDay: {
          startTime: workDay.startTime,
          endTime: workDay.endTime
        },
        lunchBreaks: lunchBreaks.map((break_: any) => ({
          startTime: break_.startTime,
          endTime: break_.endTime
        })),
        appointments: appointments.map((appointment: any) => ({
          id: appointment.id,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status
        }))
      }
    };
    
    logger.info(`[API] Успешно получена доступность специалиста ${params.id} на дату ${date}`);
    return NextResponse.json(response);
  } catch (error) {
    logger.error(`[API] Ошибка при получении доступности специалиста: ${error}`);
    return NextResponse.json(
      { error: 'Ошибка при получении доступности специалиста' },
      { status: 500 }
    );
  }
} 