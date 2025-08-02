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

interface Service {
  id: string;
  duration: number;
}

/**
 * GET /api/specialists/[id]/available-slots
 * 
 * Получение доступных временных слотов специалиста на указанную дату
 * 
 * Параметры запроса:
 * - date: Дата в формате YYYY-MM-DD
 * - serviceId: ID услуги (опционально)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем параметры запроса
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const serviceId = url.searchParams.get('serviceId');
    
    logger.info(`[API] Запрос на получение доступных слотов для специалиста ${params.id} на дату ${date}`);
    
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
          reason: 'not_working_day',
          slots: []
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
          reason: 'vacation',
          slots: []
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
    
    // Получаем продолжительность услуги (если указана)
    let serviceDuration = 60; // По умолчанию 60 минут
    
    if (serviceId) {
      const serviceStmt = db.prepare('SELECT duration FROM services WHERE id = ?');
      const service = serviceStmt.get(serviceId) as Service;
      
      if (service && service.duration) {
        serviceDuration = service.duration;
      }
    }
    
    // Генерируем временные слоты с интервалом в 30 минут
    const slots = generateTimeSlots(
      workDay.startTime,
      workDay.endTime,
      30, // Интервал в минутах
      serviceDuration,
      appointments,
      lunchBreaks
    );
    
    logger.info(`[API] Сгенерировано ${slots.length} доступных слотов для специалиста ${params.id} на дату ${date}`);
    
    return NextResponse.json({
      success: true,
      data: {
        available: true,
        slots
      }
    });
  } catch (error) {
    logger.error(`[API] Ошибка при получении доступных слотов: ${error}`);
    return NextResponse.json(
      { error: 'Ошибка при получении доступных слотов' },
      { status: 500 }
    );
  }
}

/**
 * Генерация временных слотов с учетом рабочего времени, перерывов и существующих записей
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  interval: number,
  serviceDuration: number,
  appointments: any[],
  lunchBreaks: any[]
): { time: string; available: boolean }[] {
  const slots: { time: string; available: boolean }[] = [];
  
  // Преобразуем время начала и конца в минуты
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // Генерируем все возможные слоты
  for (let time = startMinutes; time < endMinutes - serviceDuration; time += interval) {
    const slotTime = minutesToTime(time);
    const slotEndTime = minutesToTime(time + serviceDuration);
    
    // Проверяем, не пересекается ли слот с существующими записями
    const isOverlappingAppointment = appointments.some(appointment => {
      const appointmentStart = timeToMinutes(appointment.startTime);
      const appointmentEnd = timeToMinutes(appointment.endTime);
      
      return (
        (time >= appointmentStart && time < appointmentEnd) ||
        (time + serviceDuration > appointmentStart && time + serviceDuration <= appointmentEnd) ||
        (time <= appointmentStart && time + serviceDuration >= appointmentEnd)
      );
    });
    
    // Проверяем, не пересекается ли слот с перерывами на обед
    const isOverlappingLunchBreak = lunchBreaks.some(break_ => {
      const breakStart = timeToMinutes(break_.startTime);
      const breakEnd = timeToMinutes(break_.endTime);
      
      return (
        (time >= breakStart && time < breakEnd) ||
        (time + serviceDuration > breakStart && time + serviceDuration <= breakEnd) ||
        (time <= breakStart && time + serviceDuration >= breakEnd)
      );
    });
    
    // Добавляем слот в список
    slots.push({
      time: slotTime,
      available: !isOverlappingAppointment && !isOverlappingLunchBreak
    });
  }
  
  return slots;
}

/**
 * Преобразование времени в формате "HH:MM" в минуты
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Преобразование минут в формат времени "HH:MM"
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
} 