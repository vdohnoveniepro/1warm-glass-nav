import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, UserRole } from '@/models/types';
import { cookies } from 'next/headers';
import { usersAPI } from '@/lib/api';
import fs from 'fs';
import path from 'path';

// Интерфейс для настроек уведомлений
interface NotificationSettings {
  enabledTemplates?: {
    registration?: boolean;
    passwordReset?: boolean;
    appointmentCreated?: boolean;
    appointmentConfirmed?: boolean;
    appointmentCancelled?: boolean;
    appointmentReminder?: boolean;
    reviewPublished?: boolean;
    booking?: boolean;
    [key: string]: boolean | undefined;
  };
}

// Функция для получения настроек уведомлений из файла
const getNotificationSettings = (): NotificationSettings => {
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

// Функция для сохранения настроек уведомлений в файл
const saveNotificationSettings = (settings: NotificationSettings): boolean => {
  try {
    const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings', 'notifications.json');
    const settingsDir = path.dirname(settingsPath);
    
    // Создаем директорию, если она не существует
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    
    // Записываем настройки в файл
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении настроек уведомлений:', error);
    return false;
  }
};

/**
 * GET /api/admin/settings/notifications
 * Получает текущие настройки уведомлений
 */
export async function GET() {
  try {
    // Проверяем, что пользователь аутентифицирован и имеет роль администратора
    const cookieStore = await cookies();
    
    // Проверяем все возможные варианты cookies для сессии
    const sessionToken = cookieStore.get("next-auth.session-token")?.value || 
                        cookieStore.get("__Secure-next-auth.session-token")?.value ||
                        cookieStore.get("auth_token")?.value;
                        
    // Проверяем все варианты названия cookie с email
    const userEmail = cookieStore.get("user_email")?.value || 
                     cookieStore.get("user-email")?.value;
    
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

    // Проверяем роль пользователя
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Доступ запрещен'
      }, { status: 403 });
    }
    
    // Получаем настройки уведомлений
    const settings = getNotificationSettings();
    
    // Возвращаем успешный ответ с настройками
    return NextResponse.json<ApiResponse<NotificationSettings>>({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Ошибка при получении настроек уведомлений:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка при получении настроек уведомлений'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/settings/notifications
 * Сохраняет настройки уведомлений
 */
export async function POST(request: NextRequest) {
  try {
    // Проверяем, что пользователь аутентифицирован и имеет роль администратора
    const cookieStore = await cookies();
    
    // Проверяем все возможные варианты cookies для сессии
    const sessionToken = cookieStore.get("next-auth.session-token")?.value || 
                        cookieStore.get("__Secure-next-auth.session-token")?.value ||
                        cookieStore.get("auth_token")?.value;
                        
    // Проверяем все варианты названия cookie с email
    const userEmail = cookieStore.get("user_email")?.value || 
                     cookieStore.get("user-email")?.value;
    
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

    // Проверяем роль пользователя
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Доступ запрещен'
      }, { status: 403 });
    }
    
    // Получаем данные для сохранения
    const data = await request.json();
    
    // Проверяем, что данные корректны
    if (!data || typeof data !== 'object') {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Некорректные данные'
      }, { status: 400 });
    }
    
    // Получаем текущие настройки
    const currentSettings = getNotificationSettings();
    
    // Обновляем настройки
    const updatedSettings: NotificationSettings = {
      ...currentSettings,
      enabledTemplates: {
        ...currentSettings.enabledTemplates,
        ...data.enabledTemplates
      }
    };
    
    // Сохраняем настройки
    const success = saveNotificationSettings(updatedSettings);
    
    if (success) {
      // Возвращаем успешный ответ
      return NextResponse.json<ApiResponse<NotificationSettings>>({
        success: true,
        data: updatedSettings,
        message: 'Настройки уведомлений успешно сохранены'
      });
    } else {
      // Возвращаем ошибку
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Ошибка при сохранении настроек уведомлений'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ошибка при сохранении настроек уведомлений:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка при сохранении настроек уведомлений'
    }, { status: 500 });
  }
} 