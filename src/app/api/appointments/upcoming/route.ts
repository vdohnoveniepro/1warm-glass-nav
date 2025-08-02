import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { AppointmentStatus } from '@/models/types';
import { ApiResponse } from '@/types/api';
import { specialistsAPI, servicesAPI } from '@/lib/api';
import { appointmentsAdapter } from '@/database/adapters';
import { initDB } from '@/app/api/db';

// Инициализируем базу данных SQLite
initDB();

export async function GET(request: NextRequest) {
  try {
    // Получаем текущего пользователя
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Необходима авторизация'
      }, { status: 401 });
    }
    
    console.log(`[API] appointments/upcoming: Запрос предстоящих записей для пользователя ID:${currentUser.id}`);
    
    // Получаем все записи пользователя из SQLite через адаптер
    const userAppointments = appointmentsAdapter.getByUserId(currentUser.id);
    console.log(`[API] appointments/upcoming: Найдено ${userAppointments.length} записей пользователя`);
    
    // Фильтруем только предстоящие записи
    const now = new Date();
    console.log(`[API] appointments/upcoming: Текущая дата и время: ${now.toISOString()}`);
    
    const upcomingAppointments = userAppointments.filter(appointment => {
      // Проверяем статус (подтвержденные или ожидающие подтверждения)
      const statusOk = appointment.status === AppointmentStatus.CONFIRMED || 
                       appointment.status === AppointmentStatus.PENDING;
      
      // Проверяем, что дата и время окончания в будущем
      let isUpcoming = false;
      try {
        // Используем время окончания для проверки, не закончилась ли запись
        const endTime = appointment.endTime || '23:59';
        const appointmentEndDate = new Date(`${appointment.date}T${endTime}`);
        isUpcoming = appointmentEndDate > now;
        console.log(`[API] appointments/upcoming: Запись ${appointment.id}, дата ${appointment.date}, время ${appointment.startTime}-${endTime}, прошла? ${!isUpcoming}`);
      } catch (error) {
        console.error(`[API] appointments/upcoming: Ошибка при проверке даты записи ${appointment.id}:`, error);
      }
      
      return statusOk && isUpcoming;
    });
    
    console.log(`[API] appointments/upcoming: Отфильтровано ${upcomingAppointments.length} предстоящих записей`);
    
    // Сортировка по дате (самые ближайшие сверху)
    upcomingAppointments.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Добавляем дополнительную информацию о специалисте и услуге
    const enhancedAppointments = upcomingAppointments.map(appointment => {
      const specialist = appointment.specialistId ? specialistsAPI.getById(appointment.specialistId) : null;
      const service = appointment.serviceId ? servicesAPI.getById(appointment.serviceId) : null;
      
      return {
        ...appointment,
        specialist: {
          firstName: specialist?.firstName || '',
          lastName: specialist?.lastName || '',
          photo: specialist?.photo || ''
        },
        service: {
          name: service?.name || '',
          duration: service?.duration || 60
        }
      };
    });
    
    return NextResponse.json<ApiResponse<typeof enhancedAppointments>>({
      success: true,
      data: enhancedAppointments
    });
    
  } catch (error) {
    console.error('[API] Ошибка при получении предстоящих записей:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Произошла ошибка при получении предстоящих записей'
    }, { status: 500 });
  }
} 