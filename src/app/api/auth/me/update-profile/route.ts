import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { usersAPI } from '@/database/api/users';

export async function PUT(request: NextRequest) {
  try {
    console.log('[/api/auth/me/update-profile] Начало обработки запроса на обновление профиля');
    
    // Проверяем авторизацию
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      console.log('[/api/auth/me/update-profile] Пользователь не авторизован');
      return NextResponse.json({
        success: false,
        message: 'Вы не авторизованы'
      }, { status: 401 });
    }
    
    console.log(`[/api/auth/me/update-profile] Пользователь: ${currentUser.id}, email: ${currentUser.email || 'не указан'}`);
    
    // Получаем данные из запроса
    const body = await request.json();
    const { firstName, lastName, phone } = body;
    
    // Подготавливаем данные для обновления
    const updateData: any = {};
    
    // Добавляем только те поля, которые были переданы
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    
    console.log('[/api/auth/me/update-profile] Данные для обновления:', updateData);
    
    // Если нет данных для обновления
    if (Object.keys(updateData).length === 0) {
      console.log('[/api/auth/me/update-profile] Нет данных для обновления');
      return NextResponse.json({
        success: false,
        message: 'Нет данных для обновления'
      }, { status: 400 });
    }
    
    // Обновляем данные пользователя
    const updatedUser = usersAPI.update(currentUser.id, updateData);
    
    if (!updatedUser) {
      console.error('[/api/auth/me/update-profile] Ошибка при обновлении данных пользователя');
      return NextResponse.json({
        success: false,
        message: 'Не удалось обновить данные пользователя'
      }, { status: 500 });
    }
    
    console.log(`[/api/auth/me/update-profile] Данные пользователя ${currentUser.id} успешно обновлены`);
    
    // Создаем объект пользователя без пароля для ответа
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    return NextResponse.json({
      success: true,
      message: 'Профиль успешно обновлен',
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('[/api/auth/me/update-profile] Ошибка:', error);
    return NextResponse.json({
      success: false,
      message: 'Произошла ошибка при обновлении профиля'
    }, { status: 500 });
  }
} 