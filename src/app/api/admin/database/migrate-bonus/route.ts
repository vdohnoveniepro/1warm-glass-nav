import { NextRequest, NextResponse } from 'next/server';
import { migrateBonusSystem } from '@/database/migrations/add-bonus-system';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/models/types';

/**
 * POST /api/admin/database/migrate-bonus
 * Запускает миграцию бонусной системы
 * Доступно только администраторам
 */
export async function POST(req: NextRequest) {
  try {
    // Проверяем, что пользователь является администратором
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'Необходима авторизация' }, { status: 401 });
    }
    
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, message: 'Необходимы права администратора' }, { status: 403 });
    }
    
    console.log('Запуск миграции бонусной системы...');
    const result = await migrateBonusSystem();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при миграции бонусной системы:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка при миграции: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 