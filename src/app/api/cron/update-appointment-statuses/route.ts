import { NextRequest, NextResponse } from 'next/server';
import { appointmentsAPI } from '@/database/api/appointments';
import { ApiResponse } from '@/types/api';
import { logger } from '@/lib/logger';

/**
 * API-роут для автоматического обновления статусов записей
 * Запускается по расписанию через cron
 * GET /api/cron/update-appointment-statuses
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации по ключу API (для безопасности)
    const apiKey = request.headers.get('x-api-key');
    const configApiKey = process.env.CRON_API_KEY;
    
    // Если ключ API не совпадает с настроенным, возвращаем ошибку
    if (configApiKey && apiKey !== configApiKey) {
      logger.warn('[CRON] Попытка доступа с неверным API-ключом');
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Неверный API-ключ'
      }, { status: 401 });
    }
    
    logger.info('[CRON] Запуск автоматического обновления статусов записей');
    
    // Вызываем функцию обновления статусов и получаем ID обновленных записей
    const updatedIds = appointmentsAPI.updateCompletedAppointmentsStatuses();
    const updatedCount = updatedIds.length;
    
    // Логируем результаты
    if (updatedCount > 0) {
      logger.info(`[CRON] Обновлены статусы записей: ${updatedIds.join(', ')}`);
    }
    
    logger.info(`[CRON] Обновление статусов записей завершено. Обновлено записей: ${updatedCount}`);
    
    // Возвращаем результат
    return NextResponse.json<ApiResponse<{ updatedCount: number; updatedIds: string[] }>>({
      success: true,
      data: { updatedCount, updatedIds },
      message: `Статусы записей успешно обновлены. Обновлено записей: ${updatedCount}`
    });
  } catch (error) {
    logger.error('[CRON] Ошибка при автоматическом обновлении статусов записей:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка при обновлении статусов записей'
    }, { status: 500 });
  }
} 