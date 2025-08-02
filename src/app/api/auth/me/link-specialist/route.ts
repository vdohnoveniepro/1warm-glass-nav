import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, UserRole } from '@/models/types';
import { specialistsAPI, usersAPI } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

// POST /api/auth/me/link-specialist - привязать карточку специалиста к текущему пользователю
export async function POST(request: NextRequest) {
  try {
    // Получаем текущего пользователя из сессии
    const sessionUser = await getCurrentUser();
    
    if (!sessionUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Не авторизован',
      }, { status: 401 });
    }
    
    // Получаем полные данные пользователя из БД
    const currentUser = usersAPI.getById(sessionUser.id);
    
    if (!currentUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пользователь не найден',
      }, { status: 404 });
    }
    
    // Получаем ID специалиста из тела запроса
    const { specialistId } = await request.json();
    
    if (!specialistId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'ID специалиста не указан',
      }, { status: 400 });
    }
    
    // Проверяем существование специалиста
    const specialist = specialistsAPI.getById(specialistId);
    
    if (!specialist) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Специалист не найден',
      }, { status: 404 });
    }
    
    // Проверяем, не привязан ли специалист к другому пользователю
    if (specialist.userId && specialist.userId !== currentUser.id) {
      const linkedUser = usersAPI.getById(specialist.userId);
      
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: `Специалист уже привязан к другому пользователю: ${linkedUser?.firstName || ''} ${linkedUser?.lastName || ''}`,
      }, { status: 400 });
    }
    
    // Проверяем, не привязан ли уже другой специалист к этому пользователю
    if (currentUser.specialistId && currentUser.specialistId !== specialistId) {
      const currentSpecialist = specialistsAPI.getById(currentUser.specialistId);
      
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: `Вы уже привязаны к другому специалисту: ${currentSpecialist?.firstName || ''} ${currentSpecialist?.lastName || ''}`,
      }, { status: 400 });
    }
    
    // Привязываем специалиста к пользователю
    const updatedUser = usersAPI.update(currentUser.id, { 
      specialistId: specialistId,
      role: UserRole.SPECIALIST
    });
    
    if (!updatedUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Не удалось обновить пользователя',
      }, { status: 500 });
    }
    
    // Обновляем специалиста, добавляя userId
    const updatedSpecialist = specialistsAPI.update(specialistId, { 
      userId: currentUser.id 
    });
    
    if (!updatedSpecialist) {
      // Откатываем изменения пользователя, если не удалось обновить специалиста
      const previousRole = currentUser.specialistId ? UserRole.SPECIALIST : UserRole.USER;
      usersAPI.update(currentUser.id, { 
        specialistId: currentUser.specialistId,
        role: previousRole
      });
      
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Не удалось обновить специалиста',
      }, { status: 500 });
    }
    
    return NextResponse.json<ApiResponse<{
      user: typeof updatedUser,
      specialist: typeof updatedSpecialist
    }>>({
      success: true,
      data: {
        user: updatedUser,
        specialist: updatedSpecialist
      },
    });
  } catch (error) {
    console.error('Ошибка при привязке специалиста:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при привязке специалиста',
    }, { status: 500 });
  }
}

// DELETE /api/auth/me/link-specialist - отвязать карточку специалиста от текущего пользователя
export async function DELETE(request: NextRequest) {
  try {
    // Получаем текущего пользователя из сессии
    const sessionUser = await getCurrentUser();
    
    if (!sessionUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Не авторизован',
      }, { status: 401 });
    }
    
    // Получаем полные данные пользователя из БД
    const currentUser = usersAPI.getById(sessionUser.id);
    
    if (!currentUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пользователь не найден',
      }, { status: 404 });
    }
    
    // Проверяем, есть ли привязка к специалисту
    if (!currentUser.specialistId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'У пользователя нет привязки к специалисту',
      }, { status: 400 });
    }
    
    // Получаем данные специалиста
    const specialist = specialistsAPI.getById(currentUser.specialistId);
    
    if (!specialist) {
      // Если специалист не найден, просто удаляем привязку у пользователя
      const updatedUser = usersAPI.update(currentUser.id, { 
        specialistId: null,
        role: UserRole.USER
      });
      
      return NextResponse.json<ApiResponse<{ user: typeof updatedUser }>>({
        success: true,
        data: { user: updatedUser },
      });
    }
    
    // Обновляем специалиста, удаляя userId
    const updatedSpecialist = specialistsAPI.update(currentUser.specialistId, { 
      userId: null 
    });
    
    // Обновляем пользователя, удаляя specialistId и меняя роль на USER
    const updatedUser = usersAPI.update(currentUser.id, { 
      specialistId: null,
      role: UserRole.USER
    });
    
    if (!updatedUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Не удалось обновить пользователя',
      }, { status: 500 });
    }
    
    return NextResponse.json<ApiResponse<{
      user: typeof updatedUser,
      specialist: typeof updatedSpecialist
    }>>({
      success: true,
      data: {
        user: updatedUser,
        specialist: updatedSpecialist
      },
    });
  } catch (error) {
    console.error('Ошибка при отвязке специалиста:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при отвязке специалиста',
    }, { status: 500 });
  }
} 