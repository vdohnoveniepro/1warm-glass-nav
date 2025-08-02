import { NextRequest, NextResponse } from 'next/server';

// Определяем интерфейс ApiResponse локально
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[/api/auth/logout] Начало процесса выхода');
    
    // Создаем ответ
    const response = NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
    });

    // Удаляем все связанные с авторизацией cookie
    response.cookies.delete('auth_token');
    response.cookies.delete('client_auth_token');
    response.cookies.delete('user_email');
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    
    console.log('[/api/auth/logout] Все куки авторизации удалены');

    return response;
  } catch (error) {
    console.error('[/api/auth/logout] Ошибка выхода:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при выходе',
    }, { status: 500 });
  }
} 