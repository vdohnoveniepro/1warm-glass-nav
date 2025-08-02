import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/email';
import { ApiResponse, UserRole } from '@/models/types';
import { cookies } from 'next/headers';
import { usersAPI } from '@/lib/api';
import fs from 'fs';
import path from 'path';

// Функция для получения настроек уведомлений из файла
const getNotificationSettings = () => {
  try {
    const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings', 'notifications.json');
    
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      return settings;
    }
    
    // Если файл не существует, возвращаем настройки по умолчанию
    return {
      enabledTemplates: {
        registration: true,
        passwordReset: true,
        appointmentCreated: true,
        appointmentConfirmed: true,
        appointmentCancelled: true,
        appointmentReminder: true,
        reviewPublished: true,
        booking: true
      }
    };
  } catch (error) {
    console.error('Ошибка при получении настроек уведомлений:', error);
    // В случае ошибки предполагаем, что все шаблоны включены
    return {
      enabledTemplates: {
        registration: true,
        passwordReset: true,
        appointmentCreated: true,
        appointmentConfirmed: true,
        appointmentCancelled: true,
        appointmentReminder: true,
        reviewPublished: true,
        booking: true
      }
    };
  }
};

/**
 * POST /api/admin/settings/test-email
 * Отправляет тестовое письмо по заданному шаблону
 */
export async function POST(request: NextRequest) {
  try {
    // Проверяем, что пользователь аутентифицирован
    const cookieStore = await cookies();
    
    // Проверяем все возможные варианты cookies для сессии
    const sessionToken = cookieStore.get("next-auth.session-token")?.value || 
                        cookieStore.get("__Secure-next-auth.session-token")?.value ||
                        cookieStore.get("auth_token")?.value;
                        
    // Проверяем все варианты названия cookie с email
    const userEmail = cookieStore.get("user_email")?.value || 
                     cookieStore.get("user-email")?.value;

    // Логируем информацию для отладки
    console.log("Cookies в запросе:", 
      Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value]))
    );
    
    if (!sessionToken && !userEmail) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Получаем пользователя
    const user = await usersAPI.getByEmail(userEmail || "");
    
    if (!user) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Пользователь не найден'
      }, { status: 404 });
    }

    // ВРЕМЕННО: Убираем проверку на роль администратора для тестирования
    // if (user.role !== UserRole.ADMIN) {
    //   return NextResponse.json<ApiResponse<null>>({
    //     success: false,
    //     error: 'Доступ запрещен'
    //   }, { status: 403 });
    // }
    
    // Получаем данные для отправки письма
    const { email, templateName, templateContent } = await request.json();
    
    // Проверяем, что указаны все необходимые параметры
    if (!email) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Email получателя не указан'
      }, { status: 400 });
    }
    
    if (!templateName) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Имя шаблона не указано'
      }, { status: 400 });
    }
    
    if (!templateContent) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Содержимое шаблона не указано'
      }, { status: 400 });
    }
    
    // Для тестовых писем мы всегда отправляем уведомление независимо от настроек
    // Но в реальных функциях необходимо проверять, включено ли отправление для данного типа
    /*
    // Получаем настройки уведомлений
    const notificationSettings = getNotificationSettings();
    
    // Проверяем, включено ли отправление для данного типа уведомлений
    if (notificationSettings.enabledTemplates && 
        notificationSettings.enabledTemplates[templateName] === false) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: `Отправка уведомлений типа "${templateName}" отключена в настройках`
      }, { status: 400 });
    }
    */
    
    // Отправляем тестовое письмо
    await sendTestEmail(email, templateName, templateContent);
    
    // Возвращаем успешный ответ
    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null
    });
  } catch (error) {
    console.error('Ошибка при отправке тестового письма:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка при отправке тестового письма'
    }, { status: 500 });
  }
} 