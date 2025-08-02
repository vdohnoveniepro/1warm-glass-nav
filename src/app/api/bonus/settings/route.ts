import { NextRequest, NextResponse } from 'next/server';
import { bonusAdapter } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/models/types';
import { initDB } from '@/app/api/db';

/**
 * GET /api/bonus/settings
 * Получение настроек бонусной системы
 */
export async function GET() {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Получаем настройки бонусной системы
    const settings = bonusAdapter.getSettings();
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Ошибка при получении настроек бонусной системы:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка сервера: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}

/**
 * PUT /api/bonus/settings
 * Обновление настроек бонусной системы
 * Доступно только администраторам
 */
export async function PUT(req: NextRequest) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверяем, что пользователь является администратором
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'Необходима авторизация' }, { status: 401 });
    }
    
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, message: 'Необходимы права администратора' }, { status: 403 });
    }
    
    // Получаем данные из запроса
    const data = await req.json();
    
    // Проверяем наличие необходимых полей
    if (typeof data.bookingBonusAmount !== 'number' || 
        typeof data.referrerBonusAmount !== 'number' || 
        typeof data.referralBonusAmount !== 'number') {
      return NextResponse.json({ 
        success: false, 
        message: 'Необходимо указать все параметры настроек бонусной системы' 
      }, { status: 400 });
    }
    
    // Обновляем настройки
    const updatedSettings = bonusAdapter.updateSettings({
      bookingBonusAmount: data.bookingBonusAmount,
      referrerBonusAmount: data.referrerBonusAmount,
      referralBonusAmount: data.referralBonusAmount
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Настройки бонусной системы успешно обновлены',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Ошибка при обновлении настроек бонусной системы:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка сервера: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 