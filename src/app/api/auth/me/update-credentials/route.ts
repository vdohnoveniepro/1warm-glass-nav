import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { usersAPI } from '@/database/api/users';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    console.log('[/api/auth/me/update-credentials] Начало обработки запроса на обновление учетных данных');
    
    // Проверяем авторизацию
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      console.log('[/api/auth/me/update-credentials] Пользователь не авторизован');
      return NextResponse.json({
        success: false,
        message: 'Вы не авторизованы'
      }, { status: 401 });
    }
    
    console.log(`[/api/auth/me/update-credentials] Пользователь: ${currentUser.id}, email: ${currentUser.email || 'не указан'}, telegramId: ${currentUser.telegramId || 'отсутствует'}`);
    
    // Получаем данные из запроса
    const body = await request.json();
    const { email, password } = body;
    
    console.log(`[/api/auth/me/update-credentials] Получены данные: email=${email}, password=${password ? 'указан' : 'не указан'}`);
    
    // Проверяем, указан ли email
    if (!email) {
      console.log('[/api/auth/me/update-credentials] Email не указан');
      return NextResponse.json({
        success: false,
        message: 'Email обязателен'
      }, { status: 400 });
    }
    
    // Проверяем формат email
    if (!/\S+@\S+\.\S+/.test(email)) {
      console.log('[/api/auth/me/update-credentials] Некорректный формат email');
      return NextResponse.json({
        success: false,
        message: 'Некорректный формат email'
      }, { status: 400 });
    }
    
    // Проверяем, не занят ли email другим пользователем
    if (email !== currentUser.email) {
      const existingUser = usersAPI.getByEmail(email);
      if (existingUser && existingUser.id !== currentUser.id) {
        console.log(`[/api/auth/me/update-credentials] Email ${email} уже занят другим пользователем`);
        return NextResponse.json({
          success: false,
          message: 'Этот email уже используется другим пользователем'
        }, { status: 400 });
      }
    }
    
    // Подготавливаем данные для обновления
    const updateData: any = {
      email
    };
    
    // Если указан пароль, хешируем его
    if (password) {
      if (password.length < 4) {
        console.log('[/api/auth/me/update-credentials] Пароль слишком короткий');
        return NextResponse.json({
          success: false,
          message: 'Пароль должен содержать не менее 4 символов'
        }, { status: 400 });
      }
      
      try {
        // Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        updateData.password = hashedPassword;
        
        console.log('[/api/auth/me/update-credentials] Пароль успешно хеширован, длина хеша:', hashedPassword.length);
      } catch (hashError) {
        console.error('[/api/auth/me/update-credentials] Ошибка при хешировании пароля:', hashError);
        return NextResponse.json({
          success: false,
          message: 'Ошибка при обработке пароля'
        }, { status: 500 });
      }
    }
    
    console.log('[/api/auth/me/update-credentials] Данные для обновления:', { 
      email: updateData.email,
      password: updateData.password ? `${updateData.password.substring(0, 10)}...` : 'не изменяется' 
    });
    
    // Проверяем, что пользователь существует в базе
    const userCheck = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUser.id);
    if (!userCheck) {
      console.error(`[/api/auth/me/update-credentials] Пользователь с ID ${currentUser.id} не найден в базе`);
      return NextResponse.json({
        success: false,
        message: 'Пользователь не найден'
      }, { status: 404 });
    }
    
    // Напрямую обновляем пользователя в базе данных
    try {
      if (password) {
        // Если указан пароль, обновляем его вместе с email
        const stmt = db.prepare('UPDATE users SET email = ?, password = ? WHERE id = ?');
        stmt.run(email, updateData.password, currentUser.id);
        console.log(`[/api/auth/me/update-credentials] Обновлены email и пароль для пользователя ${currentUser.id}`);
      } else {
        // Иначе обновляем только email
        const stmt = db.prepare('UPDATE users SET email = ? WHERE id = ?');
        stmt.run(email, currentUser.id);
        console.log(`[/api/auth/me/update-credentials] Обновлен только email для пользователя ${currentUser.id}`);
      }
    } catch (dbError) {
      console.error('[/api/auth/me/update-credentials] Ошибка при обновлении в базе данных:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Ошибка при обновлении данных в базе'
      }, { status: 500 });
    }
    
    // Получаем обновленного пользователя
    const updatedUser = usersAPI.getById(currentUser.id);
    
    if (!updatedUser) {
      console.error('[/api/auth/me/update-credentials] Не удалось получить обновленного пользователя');
      return NextResponse.json({
        success: false,
        message: 'Не удалось получить обновленного пользователя'
      }, { status: 500 });
    }
    
    console.log(`[/api/auth/me/update-credentials] Данные пользователя ${currentUser.id} успешно обновлены:`, {
      email: updatedUser.email,
      hasPassword: updatedUser.password ? 'да' : 'нет'
    });
    
    // Создаем объект пользователя без пароля для ответа
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    return NextResponse.json({
      success: true,
      message: 'Данные для входа успешно обновлены',
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('[/api/auth/me/update-credentials] Ошибка:', error);
    return NextResponse.json({
      success: false,
      message: 'Произошла ошибка при обновлении данных'
    }, { status: 500 });
  }
} 