import { NextRequest, NextResponse } from 'next/server';
import { registerUser, createToken, setAuthCookie, hashPassword } from '@/lib/auth';
import { ApiResponse, UserRole } from '@/models/types';
import { bonusAdapter, usersAdapter } from '@/database/adapters';
import { initDB } from '@/app/api/db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Инициализируем базу данных
    initDB();
    
    const body = await request.json();
    const { email, password, firstName, lastName, phone, passwordConfirm, referralCode } = body;
    
    // Базовая валидация
    if (!email || !password || !firstName || !lastName || !phone) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Все поля обязательны для заполнения',
      }, { status: 400 });
    }
    
    if (password !== passwordConfirm) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пароли не совпадают',
      }, { status: 400 });
    }
    
    if (password.length < 4) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пароль должен содержать минимум 4 символа',
      }, { status: 400 });
    }
    
    // Проверяем, существует ли пользователь с таким email
    const existingUser = usersAdapter.getByEmail(email);
    if (existingUser) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пользователь с таким email уже существует',
      }, { status: 400 });
    }
    
    // Генерируем реферальный код для нового пользователя
    const userReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Проверяем реферальный код, если он указан
    let referrerId = null;
    if (referralCode) {
      // Ищем пользователя с указанным реферальным кодом
      const users = usersAdapter.getAll();
      // @ts-ignore - в адаптере referralCode может быть добавлено дополнительно
      const referrer = users.find(u => u.referralCode === referralCode);
      
      if (referrer) {
        referrerId = referrer.id;
        console.log(`Найден пригласивший пользователь с ID ${referrerId} по коду ${referralCode}`);
      } else {
        console.log(`Пользователь с реферальным кодом ${referralCode} не найден`);
      }
    }
    
    // Хешируем пароль
    const hashedPassword = await hashPassword(password);
    
    console.log(`Регистрация нового пользователя: ${email}, реферальный код: ${referralCode || 'отсутствует'}`);
    console.log(`Данные для создания: email=${email}, firstName=${firstName}, lastName=${lastName}, referrerId=${referrerId}`);
    
    try {
      // Создаем пользователя через адаптер
      const newUser = usersAdapter.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: UserRole.USER,
        // @ts-ignore - дополнительные поля, которые могут быть в базе данных
        referralCode: userReferralCode,
        referredById: referrerId
      });
      
      // @ts-ignore - referralCode может быть добавлено в базе данных
      console.log(`Создан новый пользователь: ID=${newUser.id}, имя=${newUser.firstName} ${newUser.lastName}, реферальный код: ${newUser.referralCode || 'не задан'}`);
    
      // Если был указан реферальный код и найден пригласивший пользователь,
      // начисляем бонусы обоим пользователям
      if (referrerId) {
        try {
          console.log(`Начисляем реферальные бонусы пользователям ${referrerId} и ${newUser.id}`);
          const bonusResult = bonusAdapter.addReferralBonus(referrerId, newUser.id);
          console.log('Реферальные бонусы успешно начислены:', JSON.stringify(bonusResult, null, 2));
        } catch (bonusError) {
          console.error('Ошибка при начислении реферальных бонусов:', bonusError);
        }
      }
      
      // Создаем JWT-токен
      const token = await createToken({
        id: newUser.id,
        email: newUser.email || '',
        firstName: newUser.firstName || '',
        lastName: newUser.lastName || '',
        role: newUser.role as UserRole,
      });
      
      // Создаем ответ
      const response = NextResponse.json<ApiResponse<{ user: any, token: string }>>({
        success: true,
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phone: newUser.phone,
            role: newUser.role,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
            // @ts-ignore - referralCode может быть добавлено в базе данных
            referralCode: newUser.referralCode,
            ...(newUser.favorites && { favorites: newUser.favorites }),
          },
          token: token, // Важно: возвращаем токен в ответе для использования на клиенте
        },
      });
      
      // Устанавливаем cookie с токеном
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
        sameSite: 'lax',
      });
      
      // Также сохраняем email пользователя в cookie для дополнительной проверки
      response.cookies.set('user_email', newUser.email || '', {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
        sameSite: 'lax',
      });
      
      console.log('Регистрация завершена успешно, токен создан и установлен в cookie');
      
      return response;
    } catch (createError) {
      console.error('Ошибка при создании пользователя:', createError);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Ошибка при создании пользователя: ' + (createError instanceof Error ? createError.message : 'Неизвестная ошибка'),
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false, 
      error: 'Ошибка сервера при регистрации',
    }, { status: 500 });
  }
} 