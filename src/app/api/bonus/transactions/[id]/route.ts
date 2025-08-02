import { NextRequest, NextResponse } from 'next/server';
import { bonusAdapter } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/models/types';
import { initDB } from '@/app/api/db';

type Params = {
  params: {
    id: string;
  };
};

/**
 * GET /api/bonus/transactions/[id]
 * Получение информации о транзакции
 * Пользователи могут получать информацию только о своих транзакциях
 * Администраторы могут получать информацию о любых транзакциях
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверяем авторизацию
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'Необходима авторизация' }, { status: 401 });
    }
    
    // Получаем транзакцию
    const transaction = bonusAdapter.getTransactionById(params.id);
    
    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Транзакция не найдена' }, { status: 404 });
    }
    
    // Проверяем права доступа
    if (user.role !== UserRole.ADMIN && transaction.userId !== user.id) {
      return NextResponse.json({ success: false, message: 'Доступ запрещен' }, { status: 403 });
    }
    
    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error('Ошибка при получении информации о транзакции:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка сервера: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}

/**
 * PATCH /api/bonus/transactions/[id]
 * Обновление статуса транзакции
 * Доступно только администраторам
 */
export async function PATCH(req: NextRequest, { params }: Params) {
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
    if (!data.status || !['pending', 'completed', 'cancelled'].includes(data.status)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Необходимо указать корректный статус: pending, completed или cancelled' 
      }, { status: 400 });
    }
    
    // Обновляем статус транзакции
    const transaction = bonusAdapter.updateTransactionStatus(params.id, data.status);
    
    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Транзакция не найдена' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Статус транзакции успешно обновлен',
      transaction
    });
  } catch (error) {
    console.error('Ошибка при обновлении статуса транзакции:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка сервера: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 