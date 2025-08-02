import { NextRequest, NextResponse } from "next/server";
import { usersAPI } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

// POST /api/auth/reset-password - запрос на сброс пароля
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email не указан" },
        { status: 400 }
      );
    }
    
    // Создаем токен для сброса пароля
    const result = usersAPI.createResetToken(email);
    
    if (!result) {
      // Не сообщаем клиенту, что пользователь не найден
      // для защиты от перебора email
      return NextResponse.json({
        success: true,
        message: "Если ваш email зарегистрирован в системе, на него отправлена инструкция по сбросу пароля"
      });
    }
    
    // Отправляем email со ссылкой для сброса пароля
    const { user, token } = result;
    const resetUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/reset-password/${token}`;
    
    await sendPasswordResetEmail(user.email, resetUrl);
    
    return NextResponse.json({
      success: true,
      message: "Инструкция по сбросу пароля отправлена на указанный email"
    });
  } catch (error) {
    console.error("Ошибка при запросе сброса пароля:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при запросе сброса пароля" },
      { status: 500 }
    );
  }
}

// PUT /api/auth/reset-password - сброс пароля по токену
export async function PUT(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    
    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: "Отсутствует токен или новый пароль" },
        { status: 400 }
      );
    }
    
    // Проверяем токен
    const user = usersAPI.findByResetToken(token);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Недействительный или истекший токен сброса пароля" },
        { status: 400 }
      );
    }
    
    // Хешируем новый пароль
    const hashedPassword = await hashPassword(password);
    
    // Обновляем пользователя
    const updatedUser = usersAPI.update(user.id, {
      password: hashedPassword,
      passwordResetToken: undefined, // Очищаем токен
      passwordResetExpires: undefined // Очищаем срок действия
    });
    
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Не удалось обновить пароль" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Пароль успешно обновлен"
    });
  } catch (error) {
    console.error("Ошибка при сбросе пароля:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при сбросе пароля" },
      { status: 500 }
    );
  }
} 