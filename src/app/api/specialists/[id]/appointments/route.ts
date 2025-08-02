import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/api/db';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Получение всех записей специалиста
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info(`[API] Запрос на получение записей специалиста: ${params.id}`);
    const sessionUser = await getCurrentUser();
    
    // Проверка авторизации
    if (!sessionUser) {
      logger.warn(`[API] Доступ запрещен: пользователь не авторизован`);
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    // Получаем параметры запроса
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const status = url.searchParams.get('status');
    
    // Базовый запрос
    let query = `
      SELECT a.*, s.name as serviceName, s.price as servicePrice, s.duration as serviceDuration
      FROM appointments a
      LEFT JOIN services s ON a.serviceId = s.id
      WHERE a.specialistId = ?
    `;
    
    // Параметры для запроса
    const queryParams: any[] = [params.id];
    
    // Добавляем фильтры по датам, если они указаны
    if (startDate) {
      query += ` AND a.date >= ?`;
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += ` AND a.date <= ?`;
      queryParams.push(endDate);
    }
    
    // Добавляем фильтр по статусу, если он указан
    if (status) {
      query += ` AND a.status = ?`;
      queryParams.push(status);
    }
    
    // Сортировка по дате и времени
    query += ` ORDER BY a.date DESC, a.startTime ASC`;
    
    // Выполняем запрос
    const stmt = db.prepare(query);
    const appointments = stmt.all(...queryParams);
    
    logger.info(`[API] Получено ${appointments.length} записей для специалиста ${params.id}`);
    
    return NextResponse.json({ success: true, data: appointments });
  } catch (error) {
    logger.error(`[API] Ошибка при получении записей специалиста: ${error}`);
    return NextResponse.json(
      { error: 'Ошибка при получении записей специалиста' },
      { status: 500 }
    );
  }
} 