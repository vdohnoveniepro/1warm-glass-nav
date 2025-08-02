import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { usersAPI } from '@/database/api/users';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Запрос на диагностику Telegram-авторизации');
    
    // Проверяем авторизацию
    const { user, error } = await getCurrentUser(request);
    
    // Анализируем headers и cookies
    const headers = Object.fromEntries(request.headers.entries());
    const cookies = request.cookies.getAll();
    const url = new URL(request.url);
    
    // Получаем информацию из localStorage (если доступно через заголовки)
    const telegramId = request.headers.get('x-telegram-id') || null;
    
    // Если передан telegramId, проверяем его в базе
    let dbUser = null;
    if (telegramId) {
      dbUser = usersAPI.findByTelegramId(telegramId);
    }
    
    // Собираем данные для отчета
    const diagnosticData = {
      isAuthenticated: !!user,
      user: user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        telegramId: user.telegramId,
        role: user.role,
        roles: user.roles,
        referralCode: user.referralCode,
        referredById: user.referredById,
        createdAt: user.createdAt
      } : null,
      authError: error,
      environment: {
        isTelegramApp: request.headers.get('x-telegram-app') === 'true',
        userAgent: headers['user-agent'] || null
      },
      request: {
        url: url.toString(),
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        method: request.method
      },
      headers: {
        authorization: headers.authorization ? 'present' : 'absent',
        contentType: headers['content-type'] || null,
        telegramApp: headers['x-telegram-app'] || null
      },
      cookies: cookies.map(c => ({
        name: c.name,
        value: c.name.includes('auth') ? `${c.value.substring(0, 10)}...` : 'hidden',
        present: !!c.value
      })),
      dbCheck: telegramId ? {
        telegramIdProvided: telegramId,
        userFound: !!dbUser,
        userData: dbUser ? {
          id: dbUser.id,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          telegramId: dbUser.telegramId,
          role: dbUser.role,
          referralCode: dbUser.referralCode,
          referredById: dbUser.referredById
        } : null
      } : null
    };
    
    console.log('[DEBUG] Результаты диагностики Telegram:', {
      isAuthenticated: diagnosticData.isAuthenticated,
      userIdInAuth: user?.id || null,
      telegramIdInAuth: user?.telegramId || null,
      userIdInDb: dbUser?.id || null,
      telegramIdInDb: dbUser?.telegramId || null
    });
    
    return NextResponse.json({
      success: true,
      data: diagnosticData
    });
  } catch (error) {
    console.error('[DEBUG] Ошибка при диагностике Telegram-авторизации:', error);
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Telegram-App, X-Telegram-ID"
    },
  });
} 