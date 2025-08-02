'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '@/models/types';

// Обработчик POST запросов для отслеживания посещений
export async function POST(request: NextRequest) {
  try {
    // Получаем данные запроса
    const data = await request.json();
    const { page, sessionId, referrer } = data;
    
    if (!page || !sessionId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Отсутствуют обязательные параметры'
      }, { status: 400 });
    }
    
    // Получаем текущего пользователя (если авторизован)
    const user = await getCurrentUser();
    const userId = user?.id || null;
    
    // Получаем IP-адрес и User-Agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Записываем посещение в базу данных
    const visitId = uuidv4();
    const timestamp = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO site_visits (id, page, userId, sessionId, userAgent, ipAddress, referrer, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(visitId, page, userId, sessionId, userAgent, ipAddress, referrer || null, timestamp);
    
    // Обновляем агрегированную статистику
    const date = timestamp.split('T')[0]; // Получаем только дату (YYYY-MM-DD)
    
    // Проверяем, есть ли запись для этой даты и страницы
    const existingStat = db.prepare(`
      SELECT * FROM visit_statistics 
      WHERE date = ? AND page = ?
    `).get(date, page);
    
    if (existingStat) {
      // Обновляем существующую запись
      db.prepare(`
        UPDATE visit_statistics
        SET visits = visits + 1,
            registered_users = registered_users + ?
        WHERE date = ? AND page = ?
      `).run(userId ? 1 : 0, date, page);
    } else {
      // Создаем новую запись
      const statId = uuidv4();
      db.prepare(`
        INSERT INTO visit_statistics (id, date, page, visits, registered_users)
        VALUES (?, ?, ?, 1, ?)
      `).run(statId, date, page, userId ? 1 : 0);
    }
    
    // Обновляем количество уникальных посетителей
    // Для этого считаем количество уникальных sessionId за день
    const uniqueVisitors = db.prepare(`
      SELECT COUNT(DISTINCT sessionId) as count
      FROM site_visits
      WHERE page = ? AND timestamp LIKE ?
    `).get(page, `${date}%`);
    
    if (uniqueVisitors) {
      db.prepare(`
        UPDATE visit_statistics
        SET unique_visitors = ?
        WHERE date = ? AND page = ?
      `).run(uniqueVisitors.count, date, page);
    }
    
    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null
    });
    
  } catch (error) {
    console.error('Ошибка при отслеживании посещения:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при отслеживании посещения'
    }, { status: 500 });
  }
} 