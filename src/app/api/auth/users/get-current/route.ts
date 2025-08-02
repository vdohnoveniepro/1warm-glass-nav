import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { usersAdapter } from '@/database/adapters';
import { specialistsAPI } from '@/database/api/specialists';
import { ApiResponse } from '@/models/types';

/**
 * GET /api/auth/users/get-current - получение данных текущего пользователя с дополнительной информацией
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Получение данных текущего пользователя');
    
    // Получаем сессионный токен из cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("next-auth.session-token")?.value || 
                         cookieStore.get("__Secure-next-auth.session-token")?.value;
    
    // Получаем email пользователя из cookies или запроса
    const userEmail = cookieStore.get("user_email")?.value || request.headers.get('x-user-email');
    
    console.log('[API] Данные для авторизации:', { 
      hasSessionToken: !!sessionToken, 
      userEmail: userEmail || 'отсутствует' 
    });

    if (!sessionToken && !userEmail) {
      console.log('[API] Отсутствуют необходимые данные для идентификации пользователя');
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Не авторизован',
      }, { status: 401 });
    }
    
    // Получаем пользователя по email
    let user = userEmail ? await usersAdapter.getByEmail(userEmail) : null;
    
    if (!user) {
      console.log('[API] Пользователь не найден');
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пользователь не найден',
      }, { status: 404 });
    }
    
    console.log(`[API] Пользователь найден: ${user.email} (${user.role}), ID: ${user.id}`);
    
    // Проверяем наличие specialistId у пользователя
    let specialist = null;
    
    if ('specialistId' in user && user.specialistId) {
      console.log(`[API] Пользователь имеет ID специалиста: ${user.specialistId}`);
      // Получаем данные специалиста по ID
      specialist = await specialistsAPI.getById(user.specialistId);
    } else {
      console.log('[API] Проверяем наличие профиля специалиста по userId');
      // Проверяем, есть ли специалист с таким userId
      specialist = await specialistsAPI.getByUserId(user.id);
      
      if (specialist) {
        console.log(`[API] Найден профиль специалиста с userId=${user.id}, ID: ${specialist.id}`);
        
        // Обновляем пользователя, добавляя связь со специалистом, если её нет
        if (!('specialistId' in user) || !user.specialistId) {
          console.log(`[API] Обновляем пользователя, добавляя связь со специалистом ${specialist.id}`);
          
          try {
            const updateData = {
              specialistId: specialist.id
            };
            await usersAdapter.update(user.id, updateData);
            
            // Обновляем локальную копию пользователя
            user = {...user, specialistId: specialist.id};
          } catch (error) {
            console.error('[API] Ошибка при обновлении пользователя:', error);
          }
        }
      } else {
        console.log('[API] У пользователя нет связанного профиля специалиста');
      }
    }
    
    // Формируем ответ, удаляя приватные поля
    const { password, ...userWithoutPassword } = user;
    
    return NextResponse.json<ApiResponse<{ user: typeof userWithoutPassword, specialist: typeof specialist }>>({
      success: true,
      data: {
        user: userWithoutPassword,
        specialist
      },
    });
  } catch (error) {
    console.error('[API] Ошибка при получении данных пользователя:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при получении данных пользователя',
    }, { status: 500 });
  }
} 