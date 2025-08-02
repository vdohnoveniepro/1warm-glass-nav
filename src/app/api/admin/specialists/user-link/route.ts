import { NextRequest, NextResponse } from 'next/server';
import { specialistsAPI } from '@/database/api/specialists';
import { usersAdapter } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/models/types';
import { ApiResponse } from '@/models/types';

/**
 * POST /api/admin/specialists/user-link - управление связями между пользователями и специалистами
 * Позволяет:
 * - удалить привязку пользователя к специалисту
 * - удалить специалиста, если он дублируется
 */
export async function POST(request: NextRequest) {
  try {
    // Проверяем, что текущий пользователь - админ
    const user = await getCurrentUser();
    
    if (!user || user.role.toUpperCase() !== 'ADMIN') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    // Получаем данные из запроса
    const body = await request.json();
    const { action, userId, specialistId, targetSpecialistId } = body;
    
    if (!userId || !action) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Не указаны обязательные параметры: userId и action' },
        { status: 400 }
      );
    }

    // Получаем пользователя
    const targetUser = await usersAdapter.getById(userId);
    
    if (!targetUser) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Выполняем действие в зависимости от указанного action
    switch (action) {
      // Отвязка специалиста от пользователя
      case 'unlinkSpecialist': {
        if (!specialistId) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Не указан ID специалиста для отвязки' },
            { status: 400 }
          );
        }

        // Проверяем, что специалист существует
        const specialist = await specialistsAPI.getById(specialistId);
        if (!specialist) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Специалист не найден' },
            { status: 404 }
          );
        }

        // Проверяем, что специалист привязан к указанному пользователю
        if (specialist.userId !== userId) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Специалист не привязан к указанному пользователю' },
            { status: 400 }
          );
        }

        // Отвязываем специалиста от пользователя
        await specialistsAPI.update(specialistId, { userId: null });
        
        // Если у пользователя в поле specialistId указан этот специалист, обнуляем его
        if (targetUser.specialistId === specialistId) {
          await usersAdapter.update(userId, { 
            specialistId: null,
            // Если нет других привязанных специалистов, меняем роль на USER
            role: UserRole.USER 
          });
        }

        return NextResponse.json<ApiResponse<{ success: true }>>(
          { success: true, data: { success: true } }
        );
      }
      
      // Удаление специалиста (при дублировании)
      case 'deleteSpecialist': {
        if (!specialistId) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Не указан ID специалиста для удаления' },
            { status: 400 }
          );
        }

        // Проверяем, что специалист существует
        const specialist = await specialistsAPI.getById(specialistId);
        if (!specialist) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Специалист не найден' },
            { status: 404 }
          );
        }

        // Удаляем специалиста
        const deleted = await specialistsAPI.delete(specialistId);
        
        if (!deleted) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Не удалось удалить специалиста' },
            { status: 500 }
          );
        }

        // Если у пользователя в поле specialistId указан этот специалист, обнуляем его
        if (targetUser.specialistId === specialistId) {
          await usersAdapter.update(userId, { 
            specialistId: null,
            // Если нет других привязанных специалистов, меняем роль на USER
            role: UserRole.USER 
          });
        }

        return NextResponse.json<ApiResponse<{ success: true }>>(
          { success: true, data: { success: true } }
        );
      }
      
      // Перенос привязки с одного специалиста на другого
      case 'transferSpecialist': {
        if (!specialistId || !targetSpecialistId) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Не указаны ID специалистов для переноса' },
            { status: 400 }
          );
        }

        // Проверяем, что оба специалиста существуют
        const specialist = await specialistsAPI.getById(specialistId);
        const targetSpecialist = await specialistsAPI.getById(targetSpecialistId);
        
        if (!specialist || !targetSpecialist) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Один из специалистов не найден' },
            { status: 404 }
          );
        }

        // Проверяем, что исходный специалист привязан к указанному пользователю
        if (specialist.userId !== userId) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Исходный специалист не привязан к указанному пользователю' },
            { status: 400 }
          );
        }

        // Обновляем привязку пользователя к новому специалисту
        await usersAdapter.update(userId, { 
          specialistId: targetSpecialistId,
          role: UserRole.SPECIALIST 
        });

        // Отвязываем старого специалиста от пользователя
        await specialistsAPI.update(specialistId, { userId: null });

        // Привязываем пользователя к новому специалисту
        await specialistsAPI.update(targetSpecialistId, { userId });

        return NextResponse.json<ApiResponse<{ success: true }>>(
          { success: true, data: { success: true } }
        );
      }

      default:
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Неизвестное действие' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Ошибка при управлении связями специалистов:', error);
    
    return NextResponse.json<ApiResponse<null>>(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Произошла ошибка при управлении связями специалистов' 
      },
      { status: 500 }
    );
  }
} 