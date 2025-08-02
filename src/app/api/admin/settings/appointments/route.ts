import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { UserRole, ApiResponse } from '@/models/types';
import fs from 'fs';
import path from 'path';

/**
 * Интерфейс настроек записей
 */
interface AppointmentSettings {
  requireConfirmation: boolean;
}

/**
 * Путь к файлу настроек
 */
const settingsFilePath = path.join(process.cwd(), 'public', 'data', 'settings', 'appointments.json');

/**
 * Получение настроек из файла
 */
const getSettings = (): AppointmentSettings => {
  try {
    console.log('[API Settings] Получение настроек записей');
    console.log('[API Settings] Путь к файлу настроек:', settingsFilePath);
    
    // Проверяем существование директории для файла настроек
    const dirPath = path.dirname(settingsFilePath);
    
    if (!fs.existsSync(dirPath)) {
      try {
        console.log('[API Settings] Создание директории:', dirPath);
        fs.mkdirSync(dirPath, { recursive: true });
        console.log('[API Settings] Директория успешно создана');
      } catch (dirError) {
        console.error('[API Settings] Ошибка при создании директории:', dirError);
        // В случае ошибки возвращаем настройки по умолчанию
        return { requireConfirmation: true };
      }
    }
    
    if (!fs.existsSync(settingsFilePath)) {
      // Если файл не существует, создаем его с настройками по умолчанию
      const defaultSettings: AppointmentSettings = {
        requireConfirmation: true,
      };
      
      try {
        console.log('[API Settings] Файл настроек не существует, создаем с настройками по умолчанию');
        fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
        console.log('[API Settings] Файл настроек успешно создан');
        return defaultSettings;
      } catch (fileError) {
        console.error('[API Settings] Ошибка при создании файла настроек:', fileError);
        return defaultSettings;
      }
    }
    
    try {
      const data = fs.readFileSync(settingsFilePath, 'utf8');
      console.log('[API Settings] Файл настроек успешно прочитан');
      const settings = JSON.parse(data);
      console.log('[API Settings] Настройки:', settings);
      return settings;
    } catch (readError) {
      console.error('[API Settings] Ошибка при чтении файла настроек:', readError);
      // Возвращаем настройки по умолчанию в случае ошибки
      return { requireConfirmation: true };
    }
  } catch (error) {
    console.error('[API Settings] Неожиданная ошибка при получении настроек:', error);
    // Возвращаем настройки по умолчанию в случае ошибки
    return { requireConfirmation: true };
  }
};

/**
 * Сохранение настроек в файл
 */
const saveSettings = (settings: AppointmentSettings): void => {
  try {
    console.log('[API Settings] Сохранение настроек:', settings);
    
    // Проверяем существование директории для файла настроек
    const dirPath = path.dirname(settingsFilePath);
    
    if (!fs.existsSync(dirPath)) {
      console.log('[API Settings] Создание директории:', dirPath);
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    console.log('[API Settings] Запись в файл настроек:', settingsFilePath);
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
    console.log('[API Settings] Настройки успешно сохранены');
  } catch (error) {
    console.error('[API Settings] Ошибка при сохранении настроек:', error);
    throw error;
  }
};

/**
 * Получение настроек записей (только для администратора)
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации
    const currentUser = await getCurrentUser();
    console.log('[API Settings] GET: Результат проверки авторизации:', { 
      isAuthorized: !!currentUser,
      role: currentUser?.role,
      roleString: currentUser ? String(currentUser.role) : null
    });
    
    // Если пользователь не авторизован или не является администратором
    if (!currentUser || String(currentUser.role).toLowerCase() !== 'admin') {
      console.log('[API Settings] GET: Доступ запрещен - недостаточно прав');
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Недостаточно прав для доступа' 
      }, { status: 403 });
    }
    
    // Получаем настройки
    const settings = getSettings();
    
    // Возвращаем результат
    return NextResponse.json<ApiResponse<{ settings: AppointmentSettings }>>({ 
      success: true, 
      data: { settings } 
    });
    
  } catch (error) {
    console.error('Ошибка при получении настроек записей:', error);
    return NextResponse.json<ApiResponse<null>>({ 
      success: false, 
      error: 'Произошла ошибка при получении настроек записей' 
    }, { status: 500 });
  }
}

/**
 * Обновление настроек записей (только для администратора)
 */
export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации
    const currentUser = await getCurrentUser();
    console.log('[API Settings] POST: Результат проверки авторизации:', { 
      isAuthorized: !!currentUser,
      role: currentUser?.role,
      roleString: currentUser ? String(currentUser.role) : null
    });
    
    // Если пользователь не авторизован или не является администратором
    if (!currentUser || String(currentUser.role).toLowerCase() !== 'admin') {
      console.log('[API Settings] POST: Доступ запрещен - недостаточно прав');
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Недостаточно прав для доступа' 
      }, { status: 403 });
    }
    
    // Получаем данные из тела запроса
    const body = await request.json();
    const { requireConfirmation } = body;
    
    // Проверяем, что все необходимые поля предоставлены
    if (typeof requireConfirmation !== 'boolean') {
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Не указано, требуется ли подтверждение' 
      }, { status: 400 });
    }
    
    // Создаем новый объект настроек
    const settings: AppointmentSettings = {
      requireConfirmation,
    };
    
    // Сохраняем настройки
    saveSettings(settings);
    
    // Возвращаем результат
    return NextResponse.json<ApiResponse<{ settings: AppointmentSettings }>>({ 
      success: true, 
      data: { settings } 
    });
    
  } catch (error) {
    console.error('Ошибка при обновлении настроек записей:', error);
    return NextResponse.json<ApiResponse<null>>({ 
      success: false, 
      error: 'Произошла ошибка при обновлении настроек записей' 
    }, { status: 500 });
  }
} 