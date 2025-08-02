import { NextRequest, NextResponse } from 'next/server';
import { ScheduleAPI } from '@/lib/schedule';
import { getCurrentUser } from '@/lib/auth';
import { WorkSchedule } from '@/types/schedule';
import { logger } from '@/lib/logger';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
};

/**
 * GET запрос для получения списка всех расписаний специалистов
 */
export async function GET(req: NextRequest) {
  try {
    // Проверяем авторизацию
    const authResult = await getCurrentUser();
    
    logger.info('GET /api/admin/schedules - результат авторизации:', authResult);
    
    // Проверяем, что пользователь авторизован и имеет роль администратора
    if (!authResult.user || authResult.user.role !== 'admin') {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 403 });
    }
    
    // Получаем query параметр specialistId
    const url = new URL(req.url);
    const specialistId = url.searchParams.get('specialistId');
    
    if (specialistId) {
      // Если указан конкретный специалист, получаем только его расписание
      try {
        const schedule = await ScheduleAPI.getSpecialistSchedule(specialistId);
        
        return NextResponse.json<ApiResponse<WorkSchedule>>({
          success: true,
          data: schedule
        });
      } catch (error) {
        if ((error as Error).message.includes('не найдено')) {
          return NextResponse.json<ApiResponse>({
            success: false,
            message: `Расписание для специалиста ${specialistId} не найдено`
          }, { status: 404 });
        }
        throw error;
      }
    }
    
    // Если specialistId не указан, возвращаем ошибку - не реализовано получение всех расписаний
    return NextResponse.json<ApiResponse>({
      success: false,
      message: 'Необходимо указать ID специалиста'
    }, { status: 400 });
    
  } catch (error) {
    logger.error('Ошибка при получении расписаний:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      message: `Ошибка при получении расписаний: ${(error as Error).message}`
    }, { status: 500 });
  }
}

/**
 * POST запрос для создания/обновления расписания специалиста
 */
export async function POST(req: NextRequest) {
  try {
    // Проверяем авторизацию
    const authResult = await getCurrentUser();
    
    logger.info('POST /api/admin/schedules - результат авторизации:', authResult);
    
    // Проверяем, что пользователь авторизован и имеет роль администратора
    if (!authResult.user || authResult.user.role !== 'admin') {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 403 });
    }
    
    // Получаем данные из запроса
    const data = await req.json();
    
    if (!data.specialistId || !data.schedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: 'Отсутствуют обязательные параметры: specialistId и schedule'
      }, { status: 400 });
    }
    
    const { specialistId, schedule } = data;
    
    // Проверяем, что schedule соответствует интерфейсу WorkSchedule
    if (!isValidWorkSchedule(schedule)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: 'Некорректный формат расписания'
      }, { status: 400 });
    }
    
    // Обновляем расписание
    await ScheduleAPI.updateSpecialistSchedule(specialistId, schedule);
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Расписание успешно обновлено'
    });
    
  } catch (error) {
    logger.error('Ошибка при обновлении расписания:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      message: `Ошибка при обновлении расписания: ${(error as Error).message}`
    }, { status: 500 });
  }
}

/**
 * Проверка, что объект соответствует интерфейсу WorkSchedule
 */
function isValidWorkSchedule(schedule: any): schedule is WorkSchedule {
  if (!schedule || typeof schedule !== 'object') return false;
  
  // Проверяем обязательные поля
  if (typeof schedule.enabled !== 'boolean') return false;
  if (!Array.isArray(schedule.workDays)) return false;
  
  // Проверяем структуру workDays
  for (const day of schedule.workDays) {
    if (typeof day !== 'object') return false;
    if (typeof day.day !== 'number' || day.day < 0 || day.day > 6) return false;
    if (typeof day.enabled !== 'boolean') return false;
    if (typeof day.startTime !== 'string') return false;
    if (typeof day.endTime !== 'string') return false;
    
    // Проверяем breaks если они есть
    if (day.breaks !== undefined) {
      if (!Array.isArray(day.breaks)) return false;
      
      for (const breakTime of day.breaks) {
        if (typeof breakTime !== 'object') return false;
        if (typeof breakTime.startTime !== 'string') return false;
        if (typeof breakTime.endTime !== 'string') return false;
      }
    }
  }
  
  // Проверяем lunchBreak
  if (!schedule.lunchBreak || typeof schedule.lunchBreak !== 'object') return false;
  if (typeof schedule.lunchBreak.enabled !== 'boolean') return false;
  if (typeof schedule.lunchBreak.startTime !== 'string') return false;
  if (typeof schedule.lunchBreak.endTime !== 'string') return false;
  
  // Проверяем vacation
  if (!schedule.vacation || typeof schedule.vacation !== 'object') return false;
  if (typeof schedule.vacation.enabled !== 'boolean') return false;
  if (typeof schedule.vacation.startDate !== 'string') return false;
  if (typeof schedule.vacation.endDate !== 'string') return false;
  
  return true;
} 