import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/models/types';
import { usersAdapter } from '@/database/adapters';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/lib/auth';
import { normalizeUserRoles } from '@/database/api/users';

// Функция для проверки прав администратора
function isUserAdmin(user: any): boolean {
  if (!user) return false;
  
  // Проверяем email для специального пользователя
  if (user.email === 'bakeevd@yandex.ru') return true;
  
  // Проверяем роль в верхнем регистре
  if (typeof user.role === 'string' && user.role.toUpperCase() === 'ADMIN') return true;
  
  // Проверяем роль в нижнем регистре
  if (typeof user.role === 'string' && user.role.toLowerCase() === 'admin') return true;
  
  // Проверяем массив ролей
  if (Array.isArray(user.roles) && user.roles.some((role: string) => role.toLowerCase() === 'admin')) return true;
  
  // Проверяем, если роль - это объект с полем name
  if (user.role && typeof user.role === 'object' && user.role.name && 
      (user.role.name.toUpperCase() === 'ADMIN' || user.role.name.toLowerCase() === 'admin')) return true;
  
  return false;
}

export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации и роли
    const currentUser = await getCurrentUser();
    
    console.log('[API users GET] Текущий пользователь:', 
      currentUser ? { id: currentUser.id, email: currentUser.email, role: currentUser.role } : 'не авторизован');
    
    // Проверяем права администратора
    if (!isUserAdmin(currentUser)) {
      console.log('[API users GET] Доступ запрещен для роли:', currentUser?.role);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Недостаточно прав для просмотра пользователей',
      }, { status: 403 });
    }
    
    // Получаем пользователей из базы данных через адаптер
    const users = usersAdapter.getAll();
    
    if (!users || !Array.isArray(users)) {
      console.error('[API users GET] Ошибка получения списка пользователей - некорректный формат:', users);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Ошибка при получении списка пользователей',
      }, { status: 500 });
    }
    
    console.log(`[API users GET] Получено ${users.length} пользователей из базы данных`);
    
    // Логируем пользователей с Telegram ID для диагностики
    const telegramUsers = users.filter((user: any) => user.telegramId);
    console.log(`[API users GET] Найдено ${telegramUsers.length} пользователей с Telegram ID:`);
    telegramUsers.forEach((user: any) => {
      console.log(`[API users GET] Telegram пользователь: ID=${user.id}, email=${user.email}, telegramId=${user.telegramId}, role=${user.role}, roles=${JSON.stringify(user.roles)}`);
    });
    
    // Удаляем пароли из ответа и обрабатываем роли
    const usersWithoutPasswords = users.map((user: any) => {
      const { password, ...userWithoutPassword } = user;
      
      // Обрабатываем роли пользователя используя функцию нормализации
      const roles = normalizeUserRoles(user);
      
      // Возвращаем пользователя с обработанными ролями
      return {
        ...userWithoutPassword,
        roles
      };
    });

    console.log(`[API users GET] Отправка ${usersWithoutPasswords.length} пользователей в ответе`);

    return NextResponse.json<ApiResponse<{ users: Array<any> }>>({
      success: true,
      data: { users: usersWithoutPasswords },
    });
  } catch (error) {
    console.error('[API users GET] Ошибка получения данных пользователей:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при получении данных пользователей',
    }, { status: 500 });
  }
}

// POST /api/admin/users - создать нового пользователя
export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации и роли
    const currentUser = await getCurrentUser();
    
    console.log('[API users POST] Текущий пользователь:', 
      currentUser ? { id: currentUser.id, email: currentUser.email, role: currentUser.role } : 'не авторизован');
    
    // Проверяем права администратора
    if (!isUserAdmin(currentUser)) {
      console.log('[API users POST] Доступ запрещен для роли:', currentUser?.role);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Недостаточно прав для создания пользователей',
      }, { status: 403 });
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
    
    // Проверяем, не существует ли уже пользователь с таким email
    const existingUser = usersAdapter.getByEmail(userData.email);
    
    if (existingUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пользователь с таким email уже существует',
      }, { status: 400 });
    }
    
    // Хешируем пароль, если он указан
    let hashedPassword = null;
    if (userData.password && userData.password.trim()) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(userData.password, salt);
    }
    
    // Определяем роль пользователя
    const role = userData.role?.toLowerCase() || 'user';
    
    // Создаем данные для нового пользователя
    const newUserData = {
      id: userData.id || uuidv4(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone || '',
      role: role,
      password: hashedPassword
    };
    
    // Создаем пользователя через адаптер
    const newUser = usersAdapter.create(newUserData);
    
    // Проверяем, что пользователь создан успешно
    if (!newUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Ошибка при создании пользователя',
      }, { status: 500 });
    }
    
    console.log(`[API users POST] Создан новый пользователь ${newUser.firstName} ${newUser.lastName} (${newUser.email}) с ролью ${newUser.role}`);
    
    // Создаем копию пользователя без пароля для ответа
    const { password, ...userWithoutPassword } = newUser;
    
    // Добавляем массив ролей для совместимости с UI
    const userResponse = {
      ...userWithoutPassword,
      roles: [newUser.role.toLowerCase()]
    };
    
    return NextResponse.json<ApiResponse<{ user: any }>>({
      success: true,
      data: { user: userResponse },
    }, { status: 201 });
  } catch (error) {
    console.error('[API users POST] Ошибка при создании пользователя:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при создании пользователя',
    }, { status: 500 });
  }
} 