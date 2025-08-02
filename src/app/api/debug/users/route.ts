import { NextRequest, NextResponse } from 'next/server';
import { initDB } from '@/app/api/db';
import { db } from '@/database/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Запрос на получение списка пользователей');
    
    // Инициализируем базу данных
    initDB();
    
    // Получаем список пользователей из базы данных
    const users = db.prepare(`
      SELECT id, email, firstName, lastName, role, telegramId, telegramUsername, 
             referralCode, referredById, bonusBalance, createdAt, updatedAt
      FROM users
      ORDER BY createdAt DESC
      LIMIT 50
    `).all();
    
    // Подсчитываем общее количество пользователей
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    // Подсчитываем количество пользователей с Telegram ID
    const telegramCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE telegramId IS NOT NULL').get();
    
    // Получаем последних 10 пользователей с Telegram ID
    const telegramUsers = db.prepare(`
      SELECT id, email, firstName, lastName, role, telegramId, telegramUsername, 
             referralCode, referredById, bonusBalance, createdAt, updatedAt
      FROM users
      WHERE telegramId IS NOT NULL
      ORDER BY createdAt DESC
      LIMIT 10
    `).all();
    
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalUsers: totalCount.count,
          telegramUsers: telegramCount.count
        },
        users: users,
        telegramUsers: telegramUsers
      }
    });
  } catch (error) {
    console.error('[DEBUG] Ошибка при получении списка пользователей:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}

// CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    },
  });
} 