import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Проверяем, является ли запрос к изображению специалиста
  if (request.nextUrl.pathname.startsWith('/uploads/specialists/')) {
    // Добавляем заголовки для предотвращения кеширования
    const headers = new Headers(request.headers);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    // Продолжаем обработку запроса с новыми заголовками
    return NextResponse.next({
      request: {
        headers,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Применяем middleware только к запросам изображений специалистов
  matcher: '/uploads/specialists/:path*',
}; 