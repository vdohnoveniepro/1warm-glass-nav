import { NextRequest, NextResponse } from 'next/server';
import { initDB } from '@/app/api/db';
import { db } from '@/database/db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] Запрос на проверку/создание пользователя Telegram');
    
    // Получаем данные из запроса
    const body = await request.json();
    const { telegramId, firstName, lastName, username, photoUrl } = body;
    
    // Проверяем обязательные поля
    if (!telegramId) {
      return NextResponse.json({
        success: false,
        error: 'Не указан telegramId'
      }, { status: 400 });
    }
    
    // Инициализируем базу данных
    initDB();
    
    // Проверяем, существует ли пользователь с таким telegramId
    const existingUser = db.prepare('SELECT * FROM users WHERE telegramId = ?').get(telegramId);
    
    if (existingUser) {
      console.log(`[DEBUG] Найден существующий пользователь Telegram: ${existingUser.id}`);
      
      // Возвращаем информацию о существующем пользователе
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: existingUser.id,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            telegramId: existingUser.telegramId,
            telegramUsername: existingUser.telegramUsername,
            referralCode: existingUser.referralCode,
            bonusBalance: existingUser.bonusBalance,
            createdAt: existingUser.createdAt
          },
          action: 'found'
        }
      });
    }
    
    // Если пользователь не найден, создаем нового
    const now = new Date().toISOString();
    const userId = uuidv4();
    const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Создаем нового пользователя
    db.prepare(`
      INSERT INTO users (
        id, firstName, lastName, role, telegramId, telegramUsername, photo, photo_url, 
        avatar, referralCode, bonusBalance, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      firstName || 'Пользователь',
      lastName || 'Telegram',
      'user',
      telegramId,
      username || null,
      photoUrl || null,
      photoUrl || null,
      photoUrl || null,
      referralCode,
      0,
      now,
      now
    );
    
    console.log(`[DEBUG] Создан новый пользователь Telegram: ${userId}`);
    
    // Получаем созданного пользователя
    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          telegramId: newUser.telegramId,
          telegramUsername: newUser.telegramUsername,
          referralCode: newUser.referralCode,
          bonusBalance: newUser.bonusBalance,
          createdAt: newUser.createdAt
        },
        action: 'created'
      }
    });
  } catch (error) {
    console.error('[DEBUG] Ошибка при проверке/создании пользователя Telegram:', error);
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    },
  });
} 