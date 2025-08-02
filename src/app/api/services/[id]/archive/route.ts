import { NextRequest, NextResponse } from "next/server";
import { servicesAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

// PATCH /api/services/[id]/archive - архивировать/разархивировать услугу
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем аутентификацию пользователя
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Проверяем, что пользователь - администратор
    if (user.role.toUpperCase() !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен. Только администраторы могут изменять статус услуг.' },
        { status: 403 }
      );
    }
    
    // Получаем данные запроса
    const data = await request.json();
    const { isArchived } = data;
    
    // Проверяем, указан ли статус архивации
    if (isArchived === undefined) {
      return NextResponse.json(
        { error: 'Не указан статус архивации' },
        { status: 400 }
      );
    }
    
    // Проверяем существование услуги
    const service = servicesAPI.getById(params.id);
    
    if (!service) {
      return NextResponse.json(
        { error: 'Услуга не найдена' },
        { status: 404 }
      );
    }
    
    // Обновляем статус архивации
    const updatedService = servicesAPI.update(params.id, { isArchived });
    
    if (!updatedService) {
      return NextResponse.json(
        { error: 'Ошибка при обновлении статуса архивации услуги' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: isArchived ? 'Услуга успешно архивирована' : 'Услуга успешно восстановлена из архива',
      data: updatedService 
    });
  } catch (error) {
    console.error(`Ошибка при изменении статуса архивации услуги с ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса архивации услуги' },
      { status: 500 }
    );
  }
} 