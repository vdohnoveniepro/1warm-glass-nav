import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  appointmentsAPI 
} from '@/database/api/appointments';
import { specialistsAPI } from '@/database/api/specialists';
import { AppointmentStatus } from '@/models/types';
import { getSpecialistAvailability, getSpecialistAvailableSlots } from '@/models/specialistsAPI';
import { db } from '@/database/db';
import { ApiResponse } from '@/models/types';

// Простой логгер
const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    console.debug(`[DEBUG] ${message}`, meta || '');
  }
};

// Проверка, требуется ли подтверждение администратором (копия из appointments/route.ts)
const checkRequireConfirmation = (): boolean => {
  try {
    logger.info('[checkRequireConfirmation] Проверка настройки требования подтверждения');
    
    // Получаем настройку из базы данных SQLite
    const settingsStmt = db.prepare('SELECT value FROM settings WHERE name = ?');
    const appointmentSettings = settingsStmt.get('appointments');
    
    logger.debug('[checkRequireConfirmation] Данные настроек из базы данных:', appointmentSettings);
    
    if (!appointmentSettings || !appointmentSettings.value) {
      logger.warn('[checkRequireConfirmation] Настройки для записей не найдены в базе данных - использую значение по умолчанию: true');
      return true;
    }
    
    try {
      // Парсим JSON из значения настройки
      const settings = JSON.parse(appointmentSettings.value);
      logger.debug('[checkRequireConfirmation] Настройки после парсинга JSON:', settings);
      
      // Проверяем, существует ли свойство requireConfirmation
      if (settings === null || typeof settings !== 'object' || !('requireConfirmation' in settings)) {
        logger.warn('[checkRequireConfirmation] В настройках отсутствует свойство requireConfirmation - использую значение по умолчанию: true');
        return true;
      }
      
      logger.debug('[checkRequireConfirmation] Тип значения requireConfirmation:', typeof settings.requireConfirmation);
      
      // Конвертируем в булево значение
      let result = true;
      
      if (typeof settings.requireConfirmation === 'boolean') {
        result = settings.requireConfirmation;
      } else if (typeof settings.requireConfirmation === 'string') {
        result = settings.requireConfirmation.toLowerCase() === 'true';
      } else if (typeof settings.requireConfirmation === 'number') {
        result = settings.requireConfirmation !== 0;
      }
      
      logger.info('[checkRequireConfirmation] Значение настройки requireConfirmation после конвертации:', result);
      return result;
    } catch (error) {
      logger.error('[checkRequireConfirmation] Ошибка при парсинге настроек:', error);
      return true;
    }
  } catch (error) {
    logger.error('[checkRequireConfirmation] Непредвиденная ошибка при проверке настроек:', error);
    return true;
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  const appointmentId = params.id;
  logger.info(`Attempting to reschedule appointment ${appointmentId}`);

  // Проверка авторизации
  const currentUser = await getCurrentUser();
  const authCheckResult = {
    isAuthorized: !!currentUser,
    userId: currentUser?.id || null,
    userRole: currentUser?.role || null,
  };

  logger.debug('Auth check result:', authCheckResult);

  if (!currentUser) {
    logger.warn(`Unauthorized attempt to reschedule appointment ${appointmentId}`);
    return NextResponse.json({
      success: false,
      message: 'Unauthorized. Please log in',
    }, { status: 401 });
  }

  try {
    // Получение данных запроса
    const requestData = await request.json();
    const { date, startTime, endTime } = requestData;

    if (!date || !startTime || !endTime) {
      logger.warn(`Missing required fields for rescheduling appointment ${appointmentId}`);
      return NextResponse.json({
        success: false,
        message: 'Missing required fields',
      }, { status: 400 });
    }

    // Получение информации о записи
    const appointment = appointmentsAPI.getById(appointmentId);
    
    if (!appointment) {
      logger.warn(`Appointment not found: ${appointmentId}`);
      return NextResponse.json({
        success: false,
        message: 'Appointment not found',
      }, { status: 404 });
    }

    // Проверка прав доступа
    const isAdmin = currentUser.role === 'admin';
    if (!isAdmin && appointment.userId !== currentUser.id) {
      logger.warn(`User ${currentUser.id} attempted to reschedule appointment ${appointmentId} belonging to user ${appointment.userId}`);
      return NextResponse.json({
        success: false,
        message: 'You do not have permission to reschedule this appointment',
      }, { status: 403 });
    }

    // Проверка доступности выбранного слота
    const dateFormatted = date; // Предполагается, что дата уже в формате YYYY-MM-DD
    
    // Получаем доступные слоты для данного специалиста на указанную дату
    const availableSlots = specialistsAPI.getAvailableSlots(
      appointment.specialistId,
      dateFormatted,
      appointment.serviceId || undefined
    );
    
    // Проверяем, есть ли выбранный слот среди доступных
    const isSlotAvailable = availableSlots.some(
      slot => slot.startTime === startTime && slot.endTime === endTime
    );

    if (!isSlotAvailable) {
      logger.warn(`Selected time slot is not available for appointment ${appointmentId}`);
      return NextResponse.json({
        success: false,
        message: 'Selected time slot is not available',
      }, { status: 400 });
    }

    // Проверяем, требуется ли подтверждение администратором
    const requireConfirmation = checkRequireConfirmation();
    logger.info(`Require confirmation for rescheduled appointment: ${requireConfirmation}`);
    
    // Определяем статус записи после переноса
    const newStatus = requireConfirmation 
      ? AppointmentStatus.PENDING  // Ожидает подтверждения, если требуется подтверждение
      : AppointmentStatus.CONFIRMED; // Автоматически подтверждаем, если подтверждение не требуется
    
    logger.info(`New status for rescheduled appointment: ${newStatus} (${typeof newStatus})`);

    // Обновление записи
    const updatedAppointment = appointmentsAPI.reschedule(appointmentId, date, startTime, endTime);

    logger.info(`Successfully rescheduled appointment ${appointmentId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: updatedAppointment,
    });
  } catch (error) {
    logger.error(`Error rescheduling appointment ${appointmentId}:`, error);
    return NextResponse.json({
      success: false,
      message: 'Failed to reschedule appointment',
    }, { status: 500 });
  }
} 