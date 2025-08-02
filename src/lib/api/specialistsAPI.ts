import { db } from '@/app/api/db';
import { parse, format, addMinutes } from 'date-fns';

interface TimeSlot {
  start: string;
  end: string;
}

interface WorkDay {
  id: number;
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

interface Vacation {
  id: number;
  specialistId: string;
  startDate: string;
  endDate: string;
}

export function getAvailableTimeSlots(specialistId: string, date: string, serviceDuration: number): TimeSlot[] {
  try {
    // Проверяем, существует ли специалист
    const specialist = db.prepare('SELECT id FROM specialists WHERE id = ?').get(specialistId);
    if (!specialist) {
      throw new Error(`Специалист с ID ${specialistId} не найден`);
    }

    const [year, month, day] = date.split('-').map(Number);
    const requestDate = new Date(year, month - 1, day);
    
    // Получаем день недели (0-воскресенье, 1-понедельник, ..., 6-суббота)
    let dayOfWeek = requestDate.getDay();
    // Преобразуем в формат 1-понедельник, ..., 7-воскресенье
    dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    console.log('[specialistsAPI] Проверка доступности:', {
      date,
      requestDate: requestDate.toISOString(),
      dayOfWeek,
      specialistId
    });
    
    // Получаем расписание специалиста
    const scheduleStmt = db.prepare(`
      SELECT * FROM specialist_work_schedules 
      WHERE specialistId = ? AND enabled = 1
    `);
    
    const schedule = scheduleStmt.get(specialistId) as { id: number } | undefined;
    
    if (!schedule) {
      console.log(`У специалиста ${specialistId} не настроен рабочий график`);
      return [];
    }
    
    // Получаем рабочий день специалиста
    const workDayStmt = db.prepare(`
      SELECT * FROM work_days
      WHERE scheduleId = ? AND day = ?
    `);
    
    const workDay = workDayStmt.get(schedule.id, dayOfWeek) as WorkDay | undefined;
    
    if (!workDay || !workDay.active) {
      console.log(`День недели ${dayOfWeek} не является рабочим для специалиста ${specialistId}`);
      return [];
    }
    
    // Проверяем, не находится ли специалист в отпуске
    const vacationStmt = db.prepare(`
      SELECT * FROM vacations
      WHERE scheduleId = ? AND ? BETWEEN startDate AND endDate
    `);
    
    const vacation = vacationStmt.get(schedule.id, date);
    
    if (vacation) {
      console.log(`Специалист ${specialistId} находится в отпуске на дату ${date}`);
      return [];
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
    
    const appointments = appointmentsStmt.all(specialistId, date);
    
    // Генерируем временные слоты
    const slots: TimeSlot[] = [];
    
    // Создаем базовую дату для работы со временем
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    // Парсим время начала и конца рабочего дня
    const workStart = parse(workDay.startTime, 'HH:mm', baseDate);
    const workEnd = parse(workDay.endTime, 'HH:mm', baseDate);
    
    // Создаем временные интервалы для существующих записей
    const appointmentIntervals = appointments.map((appointment: any) => {
      const apptStart = parse(appointment.timeStart, 'HH:mm', baseDate);
      const apptEnd = parse(appointment.timeEnd, 'HH:mm', baseDate);
      return { start: apptStart, end: apptEnd };
    });
    
    // Создаем временные интервалы для обеденных перерывов
    const lunchIntervals = lunchBreaks.map(lunch => {
      const lunchStart = parse(lunch.startTime, 'HH:mm', baseDate);
      const lunchEnd = parse(lunch.endTime, 'HH:mm', baseDate);
      return { start: lunchStart, end: lunchEnd };
    });
    
    // Генерируем слоты с заданным интервалом
    let currentTime = new Date(workStart);
    const slotInterval = 30; // минут между слотами
    
    while (addMinutes(currentTime, serviceDuration) <= workEnd) {
      const slotStart = new Date(currentTime);
      const slotEnd = addMinutes(slotStart, serviceDuration);
      
      // Проверяем, не пересекается ли слот с существующими записями
      const isOverlappingAppointment = appointmentIntervals.some(interval => 
        (slotStart < interval.end && slotEnd > interval.start)
      );
      
      // Проверяем, не пересекается ли слот с обеденными перерывами
      const isOverlappingLunch = lunchIntervals.some(interval => 
        (slotStart < interval.end && slotEnd > interval.start)
      );
      
      // Если слот не пересекается с записями и обедами, добавляем его
      if (!isOverlappingAppointment && !isOverlappingLunch) {
        slots.push({
          start: format(slotStart, 'HH:mm'),
          end: format(slotEnd, 'HH:mm')
        });
      }
      
      // Переходим к следующему слоту
      currentTime = addMinutes(currentTime, slotInterval);
    }
    
    return slots;
  } catch (error) {
    console.error(`Ошибка при получении доступных временных слотов:`, error);
    return [];
  }
} 