import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/api/db';
import { logger } from '@/lib/logger';
import { parse, format, addMinutes, isWithinInterval } from 'date-fns';

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
  startTime: string;
  endTime: string;
}

interface LunchBreak {
  id: number;
  workDayId: number;
  startTime: string;
  endTime: string;
}

// Интерфейс для записи на прием, учитывающий разные возможные имена полей
interface Appointment {
  id: number | string;
  specialistId: string;
  date: string;
  // Поддержка разных возможных имен полей для времени
  timeStart?: string;
  timeEnd?: string;
  startTime?: string;
  endTime?: string;
  start?: string; // Еще один возможный вариант
  end?: string;   // Еще один возможный вариант
  status: string;
}

interface TimeSlot {
  start: string;
  end: string;
  isAvailable?: boolean; // Добавляем флаг доступности
}

/**
 * GET /api/timeslots
 * 
 * Получение доступных временных слотов для специалиста на указанную дату
 * 
 * Параметры запроса:
 * - specialistId: ID специалиста
 * - date: Дата в формате YYYY-MM-DD
 * - serviceDuration: Длительность услуги в минутах (по умолчанию 60)
 */
export async function GET(request: NextRequest) {
  try {
    // Получаем параметры запроса
    const url = new URL(request.url);
    const specialistId = url.searchParams.get('specialistId');
    const date = url.searchParams.get('date');
    const serviceDurationParam = url.searchParams.get('serviceDuration');
    
    // Длительность услуги в минутах, по умолчанию 60 минут
    const serviceDuration = serviceDurationParam ? parseInt(serviceDurationParam, 10) : 60;
    
    logger.info(`[API] Запрос на получение временных слотов для специалиста ${specialistId} на дату ${date}`);
    
    if (!specialistId || !date) {
      return NextResponse.json(
        { error: 'Необходимо указать ID специалиста и дату' },
        { status: 400 }
      );
    }
    
    // Проверяем, существует ли специалист
    const specialistStmt = db.prepare('SELECT id FROM specialists WHERE id = ?');
    const specialist = specialistStmt.get(specialistId);
    
    if (!specialist) {
      logger.warn(`[API] Специалист не найден: ${specialistId}`);
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
    
    const schedule = scheduleStmt.get(specialistId) as SpecialistSchedule | undefined;
    
    if (!schedule) {
      logger.warn(`[API] Расписание не найдено для специалиста: ${specialistId}`);
      return NextResponse.json({
        success: true,
        data: {
          status: 'unavailable',
          reason: 'no_schedule',
          message: 'У специалиста не настроено расписание',
          timeSlots: []
        }
      });
    }
    
    // Получаем день недели для указанной даты (0-воскресенье, 1-понедельник, ..., 6-суббота)
    const dateObj = new Date(date);
    // Преобразуем в формат 1-понедельник, ..., 7-воскресенье
    let dayOfWeek = dateObj.getDay() || 7;
    
    // Получаем рабочий день специалиста
    const workDayStmt = db.prepare(`
      SELECT * FROM work_days
      WHERE scheduleId = ? AND day = ?
    `);
    
    const workDay = workDayStmt.get(schedule.id, dayOfWeek) as WorkDay | undefined;
    
    if (!workDay || !workDay.active) {
      logger.warn(`[API] День недели ${dayOfWeek} не является рабочим для специалиста ${specialistId}`);
      return NextResponse.json({
        success: true,
        data: {
          status: 'unavailable',
          reason: 'not_working_day',
          message: 'Этот день недели не является рабочим для специалиста',
          timeSlots: []
        }
      });
    }
    
    // Проверяем, не находится ли специалист в отпуске
    const vacationStmt = db.prepare(`
      SELECT * FROM vacations
      WHERE scheduleId = ? AND ? BETWEEN startDate AND endDate
    `);
    
    const vacation = vacationStmt.get(schedule.id, date);
    
    if (vacation) {
      logger.info(`[API] Специалист ${specialistId} в отпуске на дату ${date}`);
      return NextResponse.json({
        success: true,
        data: {
          status: 'unavailable',
          reason: 'vacation',
          message: 'Специалист находится в отпуске в этот день',
          timeSlots: []
        }
      });
    }
    
    // Получаем обеденные перерывы для этого рабочего дня
    const lunchBreaksStmt = db.prepare(`
      SELECT * FROM lunch_breaks
      WHERE workDayId = ?
    `);
    
    const lunchBreaks = lunchBreaksStmt.all(workDay.id) as LunchBreak[];
    
    // Получаем существующие записи на этот день
    const appointmentsStmt = db.prepare(`
      SELECT * FROM appointments 
      WHERE specialistId = ? AND date = ? 
      AND status NOT IN ('cancelled', 'archived')
    `);
    
    const appointments = appointmentsStmt.all(specialistId, date) as Appointment[];
    
    // Выводим отладочную информацию о найденных записях
    logger.info(`[API] Найдено ${appointments.length} записей на ${date} для специалиста ${specialistId}`);
    if (appointments.length > 0) {
      for (const appt of appointments) {
        logger.info(`[API] Запись: ${appt.id}, время: ${appt.startTime || appt.timeStart}-${appt.endTime || appt.timeEnd}, статус: ${appt.status}`);
      }
    }
    
    // Генерируем временные слоты
    const timeSlots = generateTimeSlots(
      workDay.startTime,
      workDay.endTime,
      30, // интервал между слотами в минутах
      serviceDuration,
      appointments,
      lunchBreaks
    );
    
    logger.info(`[API] Сгенерировано ${timeSlots.length} доступных слотов для специалиста ${specialistId} на дату ${date}`);
    
    return NextResponse.json({
      success: true,
      data: {
        status: 'available',
        timeSlots
      }
    });
  } catch (error) {
    logger.error(`[API] Ошибка при получении временных слотов: ${error}`);
    return NextResponse.json(
      { error: 'Ошибка при получении временных слотов' },
      { status: 500 }
    );
  }
}

/**
 * Генерирует временные слоты с учетом рабочего времени, обеденных перерывов и существующих записей
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotInterval: number,
  serviceDuration: number,
  appointments: Appointment[],
  lunchBreaks: LunchBreak[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  // Создаем базовую дату для работы со временем
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  
  // Парсим время начала и конца рабочего дня
  const workStart = parse(startTime, 'HH:mm', baseDate);
  const workEnd = parse(endTime, 'HH:mm', baseDate);
  
  // Создаем временные интервалы для существующих записей
  const appointmentIntervals = appointments.map(appointment => {
    // Определяем реальные значения времени начала и конца, учитывая разные возможные имена полей
    const startTimeValue = appointment.startTime || appointment.timeStart || appointment.start;
    const endTimeValue = appointment.endTime || appointment.timeEnd || appointment.end;
    
    if (!startTimeValue || !endTimeValue) {
      console.error(`[API] Некорректные данные записи: ${JSON.stringify(appointment)}`);
      return null; // Пропускаем некорректные записи
    }
    
    try {
      const apptStart = parse(startTimeValue, 'HH:mm', baseDate);
      const apptEnd = parse(endTimeValue, 'HH:mm', baseDate);
      return { start: apptStart, end: apptEnd };
    } catch (err) {
      console.error(`[API] Ошибка при обработке времени записи: ${err}`);
      return null;
    }
  }).filter(interval => interval !== null); // Удаляем null-значения
  
  // Создаем временные интервалы для обеденных перерывов
  const lunchIntervals = lunchBreaks.map(lunch => {
    const lunchStart = parse(lunch.startTime, 'HH:mm', baseDate);
    const lunchEnd = parse(lunch.endTime, 'HH:mm', baseDate);
    return { start: lunchStart, end: lunchEnd };
  });
  
  // Генерируем слоты с заданным интервалом
  let currentTime = new Date(workStart);
  
  while (addMinutes(currentTime, serviceDuration) <= workEnd) {
    const slotStart = new Date(currentTime);
    const slotEnd = addMinutes(slotStart, serviceDuration);
    
    // Проверяем, не пересекается ли слот с существующими записями
    const isOverlappingAppointment = appointmentIntervals.some(interval => 
      interval && (slotStart < interval.end && slotEnd > interval.start)
    );
    
    // Проверяем, не пересекается ли слот с обеденными перерывами
    const isOverlappingLunch = lunchIntervals.some(interval => 
      (slotStart < interval.end && slotEnd > interval.start)
    );
    
    // Если слот не пересекается с записями и обедами, добавляем его
    if (!isOverlappingAppointment && !isOverlappingLunch) {
      slots.push({
        start: format(slotStart, 'HH:mm'),
        end: format(slotEnd, 'HH:mm'),
        isAvailable: true
      });
    }
    
    // Переходим к следующему слоту
    currentTime = addMinutes(currentTime, slotInterval);
  }
  
  return slots;
}