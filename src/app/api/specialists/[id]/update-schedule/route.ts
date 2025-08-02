import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth';
import { specialistsAPI } from '@/database/api/specialists';

// POST запрос для обновления расписания в основных данных специалиста
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const specialistId = params.id;
    logger.info(`[API] Запрос на синхронизацию расписания специалиста: ${specialistId}`);
    
    // Получаем текущего пользователя
    const { user } = await getCurrentUser();
    
    // Проверяем, что пользователь авторизован и имеет права на изменение расписания
    if (!user || (user.role !== 'admin' && user.id !== specialistId)) {
      logger.warn(`[API] Неавторизованный запрос на синхронизацию расписания специалиста ${specialistId}`);
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    // Проверяем существование специалиста
    const specialist = specialistsAPI.getById(specialistId);
    if (!specialist) {
      logger.warn(`[API] Специалист с ID ${specialistId} не найден при синхронизации расписания`);
      return NextResponse.json(
        { success: false, error: 'Специалист не найден' },
        { status: 404 }
      );
    }
    
    // Получаем данные из запроса
    const { workSchedule } = await request.json();
    
    if (!workSchedule) {
      logger.warn(`[API] Отсутствуют данные расписания при синхронизации для специалиста ${specialistId}`);
      return NextResponse.json(
        { success: false, error: 'Отсутствуют данные расписания' },
        { status: 400 }
      );
    }
    
    // Обновляем специалиста с новым расписанием
    try {
      const updatedSpecialist = {
        ...specialist,
        workSchedule
      };
      
      specialistsAPI.update(specialistId, updatedSpecialist);
      
      logger.info(`[API] Расписание для специалиста ${specialistId} успешно синхронизировано`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Расписание успешно синхронизировано' 
      });
    } catch (error) {
      logger.error(`[API] Ошибка при синхронизации расписания: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  } catch (error) {
    logger.error(`[API] Ошибка при синхронизации расписания: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { success: false, error: 'Ошибка при синхронизации расписания' },
      { status: 500 }
    );
  }
} 