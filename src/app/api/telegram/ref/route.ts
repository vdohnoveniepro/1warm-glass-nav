import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/models/types';

/**
 * API маршрут для обработки реферальных кодов из Telegram Mini App
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refCode } = body;
    
    console.log('[/api/telegram/ref] Получен реферальный код от Telegram Mini App:', refCode);
    
    if (!refCode) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Отсутствует реферальный код',
      }, { status: 400 });
    }
    
    // Сохраняем реферальный код в куки для последующего использования
    // при регистрации в мини-приложении
    const response = NextResponse.json<ApiResponse<{ refCode: string }>>({
      success: true,
      data: { refCode },
    });
    
    response.cookies.set('telegram_ref_code', refCode, {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      sameSite: 'lax',
    });
    
    return response;
  } catch (error) {
    console.error('[/api/telegram/ref] Ошибка при обработке реферального кода:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при обработке реферального кода',
    }, { status: 500 });
  }
}

// CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    },
  });
} 