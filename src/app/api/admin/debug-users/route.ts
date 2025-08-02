import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { usersAPI } from '@/database/api/users';

export async function GET(request: NextRequest) {
  try {
    const queryParams = new URL(request.url).searchParams;
    const telegramId = queryParams.get('telegramId');
    
    console.log("[DEBUG-USERS] Запрос на проверку пользователей");
    
    // Получить данные базы
    const dbSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
    console.log("[DEBUG-USERS] Схема таблицы users:", dbSchema);
    
    // Получить информацию о пользователях
    const users = usersAPI.getAll();
    console.log(`[DEBUG-USERS] Всего пользователей в базе: ${users.length}`);
    
    // Проверить наличие пользователя с указанным telegramId
    if (telegramId) {
      console.log(`[DEBUG-USERS] Поиск пользователя с telegramId: ${telegramId}`);
      const user = usersAPI.findByTelegramId(telegramId);
      
      if (user) {
        console.log(`[DEBUG-USERS] Пользователь с telegramId ${telegramId} найден:`, {
          id: user.id,
          telegramId: user.telegramId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        });
        
        return NextResponse.json({
          success: true,
          message: `Пользователь с telegramId ${telegramId} найден в базе данных`,
          user: {
            id: user.id,
            telegramId: user.telegramId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          }
        });
      } else {
        console.log(`[DEBUG-USERS] Пользователь с telegramId ${telegramId} НЕ найден в базе данных`);
        
        // Проверяем все поля в таблице users
        const columns = db.prepare("PRAGMA table_info(users)").all();
        console.log("[DEBUG-USERS] Колонки в таблице users:", columns);
        
        // Проверяем прямым запросом
        const userByTelegramId = db.prepare("SELECT id, firstName, lastName FROM users WHERE telegramId = ?").get(telegramId);
        console.log(`[DEBUG-USERS] Результат прямого запроса по telegramId ${telegramId}:`, userByTelegramId || 'не найден');
        
        return NextResponse.json({
          success: false,
          message: `Пользователь с telegramId ${telegramId} НЕ найден в базе данных`,
          columns,
          directQuery: userByTelegramId || null
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      usersCount: users.length,
      schema: dbSchema
    });
  } catch (error) {
    console.error("[DEBUG-USERS] Ошибка:", error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
} 