import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/models/types';
import { usersAdapter } from '@/database/adapters';
import bcrypt from 'bcryptjs';
import { normalizeUserRoles, getPrimaryRole } from '@/database/api/users';

// GET /api/admin/users/[id] - получить пользователя по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем ID пользователя из параметров
    const { id } = params;
    if (!id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'ID пользователя не указан',
      }, { status: 400 });
    }
    
    // Получаем пользователя из базы данных через адаптер
    const user = usersAdapter.getById(id);
    
    if (!user) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пользователь не найден',
      }, { status: 404 });
    }
    
    // Удаляем пароль из ответа
    const { password, ...userWithoutPassword } = user;
    
    // Обрабатываем роли пользователя используя функцию нормализации
    const roles = normalizeUserRoles(user);
    
    // Собираем данные пользователя для ответа
    const userData = {
      ...userWithoutPassword,
      roles // Добавляем массив ролей для совместимости с формой редактирования
    };
    
    console.log(`[API] Получен пользователь ${userData.email} с ролями: ${roles.join(', ')}`);
    
    return NextResponse.json<ApiResponse<{ user: any }>>({
      success: true,
      data: { user: userData },
    });
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Внутренняя ошибка сервера',
    }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - обновить данные пользователя
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем ID пользователя из параметров
    const { id } = params;
    if (!id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'ID пользователя не указан',
      }, { status: 400 });
    }
    
    // Получаем данные из запроса
    const userData = await request.json();
    
    // Проверяем обязательные поля
    if (!userData.firstName || !userData.lastName || !userData.email) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Необходимо указать имя, фамилию и email пользователя',
      }, { status: 400 });
    }
    
    // Получаем текущего пользователя
    const currentUser = usersAdapter.getById(id);
    
    if (!currentUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пользователь не найден',
      }, { status: 404 });
    }
    
    // Проверяем, не занят ли email другим пользователем
    const existingUserWithEmail = usersAdapter.getByEmail(userData.email);
    
    if (existingUserWithEmail && existingUserWithEmail.id !== id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пользователь с таким email уже существует',
      }, { status: 400 });
    }
    
    // Обработка ролей пользователя
    let roles: string[] = [];
    
    // Нормализуем роли из запроса или используем текущие
    if (userData.roles) {
      if (Array.isArray(userData.roles)) {
        roles = userData.roles.map((role: string) => role.toLowerCase());
      } else if (typeof userData.roles === 'string') {
        try {
          roles = JSON.parse(userData.roles).map((role: string) => role.toLowerCase());
        } catch (e) {
          roles = normalizeUserRoles(currentUser);
        }
      }
    } else {
      roles = normalizeUserRoles(currentUser);
    }
    
    // Проверяем корректность ролей
    const validRoles = ['user', 'specialist', 'admin'];
    roles = roles.filter((role: string) => validRoles.includes(role.toLowerCase()));
    
    // Гарантируем, что у пользователя есть хотя бы одна роль
    if (roles.length === 0) {
      roles = ['user'];
    }
    
    // Определяем основную роль по приоритету
    const primaryRole = getPrimaryRole(roles);
    
    console.log(`[API] Обновляем роли пользователя: ${roles.join(', ')}, основная роль: ${primaryRole}`);
    
    // Данные для обновления
    const updateData: any = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone || currentUser.phone || '',
      role: primaryRole,
      roles: roles
    };
    
    // Обновляем пароль только если он указан
    if (userData.password && userData.password.trim()) {
      // Хешируем пароль
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      updateData.password = hashedPassword;
    }
    
    // Обновляем пользователя через адаптер
    const updatedUser = usersAdapter.update(id, updateData);
    
    if (!updatedUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Ошибка при обновлении пользователя',
      }, { status: 500 });
    }
    
    // Логируем обновление
    console.log(`[API] Пользователь ${updatedUser.email} обновлен, роли: ${roles.join(', ')}`);
    
    // Удаляем пароль из ответа
    const { password, ...userWithoutPassword } = updatedUser;
    
    return NextResponse.json<ApiResponse<{ user: any }>>({
      success: true,
      message: 'Данные пользователя успешно обновлены',
      data: { 
        user: {
          ...userWithoutPassword,
          roles // Гарантируем, что роли возвращаются как массив
        }
      },
    });
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Внутренняя ошибка сервера',
    }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - удалить пользователя
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем ID пользователя из параметров
    const { id } = params;
    if (!id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'ID пользователя не указан',
      }, { status: 400 });
    }
    
    // Получаем пользователя перед удалением
    const userToDelete = usersAdapter.getById(id);
    
    if (!userToDelete) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пользователь не найден',
      }, { status: 404 });
    }
    
    // Удаляем пользователя
    const success = usersAdapter.delete(id);
    
    if (!success) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Ошибка при удалении пользователя',
      }, { status: 500 });
    }
    
    // Логируем удаление
    console.log(`[API] Пользователь ${userToDelete.firstName} ${userToDelete.lastName} (${userToDelete.email}) успешно удален`);
    
    // Удаляем пароль из ответа
    const { password, ...userWithoutPassword } = userToDelete;
    
    return NextResponse.json<ApiResponse<{ user: any }>>({
      success: true,
      message: 'Пользователь успешно удален',
      data: { user: userWithoutPassword },
    });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Внутренняя ошибка сервера',
    }, { status: 500 });
  }
} 