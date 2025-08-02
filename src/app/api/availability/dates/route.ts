import { NextRequest, NextResponse } from 'next/server';
import { getSpecialistById } from '@/models/specialistsAPI';
import { ApiResponse } from '@/models/types';
import { format, addDays } from 'date-fns';

export async function GET(request: NextRequest) {
  console.log('[GET /api/availability/dates] Начало обработки запроса');
  
  try {
    // Получаем параметры запроса
    const searchParams = request.nextUrl.searchParams;
    const specialistId = searchParams.get('specialistId');
    const serviceId = searchParams.get('serviceId');
    
    console.log('[GET /api/availability/dates] Параметры запроса:', { specialistId, serviceId });
    
    if (!specialistId) {
      console.log('[GET /api/availability/dates] Отсутствует обязательный параметр specialistId');
      return NextResponse.json<ApiResponse<{ dates: string[] }>>({
        success: false,
        error: 'Необходимо указать ID специалиста'
      }, { status: 400 });
    }

    // Перенаправляем запрос на новый API-эндпоинт
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);
    
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');
    
    // Формируем URL для перенаправления
    const redirectUrl = `/api/specialists/${specialistId}/available-dates?startDate=${formattedStartDate}&endDate=${formattedEndDate}${serviceId ? `&serviceId=${serviceId}` : ''}`;
    
    console.log(`[GET /api/availability/dates] Перенаправляем запрос на: ${redirectUrl}`);
    
    // Перенаправляем запрос
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error('[GET /api/availability/dates] Ошибка:', error);
    return NextResponse.json<ApiResponse<{ dates: string[] }>>({
      success: false,
      error: 'Произошла ошибка при получении доступных дат'
    }, { status: 500 });
  }
} 