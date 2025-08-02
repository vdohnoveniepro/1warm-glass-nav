import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/models/types';
import { getSpecialistAvailability } from '@/models/specialistsAPI';

export async function GET(request: NextRequest) {
  console.log('[GET /api/availability/time-slots] Начало обработки запроса');
  
  try {
    // Получаем параметры запроса
    const searchParams = request.nextUrl.searchParams;
    const specialistId = searchParams.get('specialistId');
    const date = searchParams.get('date');
    const serviceId = searchParams.get('serviceId');
    const serviceDuration = searchParams.get('serviceDuration');
    
    console.log('[GET /api/availability/time-slots] Параметры запроса:', { 
      specialistId, date, serviceId, serviceDuration 
    });
    
    if (!specialistId || !date) {
      console.log('[GET /api/availability/time-slots] Отсутствуют обязательные параметры');
      return NextResponse.json<ApiResponse<any>>({
        success: false,
        error: 'Необходимо указать ID специалиста и дату'
      }, { status: 400 });
    }

    // Формируем URL для перенаправления на новый API-эндпоинт
    let redirectUrl = `/api/timeslots?specialistId=${specialistId}&date=${date}`;
    
    if (serviceDuration) {
      redirectUrl += `&serviceDuration=${serviceDuration}`;
    }
    
    if (serviceId) {
      redirectUrl += `&serviceId=${serviceId}`;
    }
    
    console.log(`[GET /api/availability/time-slots] Перенаправляем запрос на: ${redirectUrl}`);
    
    // Перенаправляем запрос
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error('[GET /api/availability/time-slots] Ошибка:', error);
    return NextResponse.json<ApiResponse<any>>({
      success: false,
      error: 'Произошла ошибка при получении доступных временных слотов'
    }, { status: 500 });
  }
} 