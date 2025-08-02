import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { servicesAPI, specialistsAPI } from '@/lib/api';
import { appointmentsAdapter } from '@/database/adapters';
import { initDB } from '@/app/api/db';

// Инициализируем базу данных SQLite
initDB();

// Заглушка для имитации данных записи
const generateAppointmentMock = (id: string) => {
  return {
    id,
    specialistId: "spec1",
    serviceId: "serv1",
    date: "2023-12-15",
    startTime: "10:00",
    endTime: "11:00",
    price: 2500,
    status: "confirmed",
    specialist: {
      firstName: "Елена",
      lastName: "Иванова",
      photo: "/images/specialists/specialist1.jpg"
    },
    service: {
      name: "Консультация психолога",
      duration: 60
    }
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем авторизацию пользователя
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Получаем ID записи из URL
    const appointmentId = params.id;
    
    console.log(`[API] Запрос информации о записи ID:${appointmentId} пользователем ID:${user.id}`);
    
    // Получаем данные записи из базы SQLite через адаптер
    const appointment = appointmentsAdapter.getById(appointmentId);
    
    // Проверка, что запись найдена
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Запись не найдена' },
        { status: 404 }
      );
    }
    
    // Проверка, что запись принадлежит пользователю или пользователь администратор
    if (appointment.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'У вас нет доступа к этой записи' },
        { status: 403 }
      );
    }
    
    // Получаем дополнительную информацию о специалисте и услуге из SQLite
    const specialist = appointment.specialistId ? specialistsAPI.getById(appointment.specialistId) : null;
    const service = appointment.serviceId ? servicesAPI.getById(appointment.serviceId) : null;
    
    // Возвращаем данные записи с дополнительной информацией
    return NextResponse.json({
      success: true,
      data: {
        ...appointment,
        specialist: specialist || {
          firstName: "Специалист",
          lastName: "",
          photo: ""
        },
        service: service || {
          name: "Услуга",
          duration: 60
        }
      }
    });
    
  } catch (error) {
    console.error('[API] Ошибка при получении информации о записи:', error);
    
    return NextResponse.json(
      { success: false, error: 'Произошла ошибка при получении информации о записи' },
      { status: 500 }
    );
  }
} 