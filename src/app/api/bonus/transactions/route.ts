import { NextRequest, NextResponse } from 'next/server';
import { bonusAdapter } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/models/types';
import { initDB } from '@/app/api/db';

/**
 * GET /api/bonus/transactions
 * Получение списка транзакций
 * Для пользователей - только свои транзакции
 * Для администраторов - все транзакции или фильтр по пользователю (userId в query)
 */
export async function GET(req: NextRequest) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверяем авторизацию
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'Необходима авторизация' }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    // Для администраторов
    if (user.role === UserRole.ADMIN) {
      // Если указан userId, получаем транзакции конкретного пользователя
      if (userId) {
        const transactions = bonusAdapter.getUserTransactions(userId);
        return NextResponse.json({ success: true, transactions });
      }
      
      // Иначе получаем все транзакции
      const transactions = bonusAdapter.getAllTransactions();
      return NextResponse.json({ success: true, transactions });
    }
    
    // Для обычных пользователей - только свои транзакции
    const transactions = bonusAdapter.getUserTransactions(user.id);
    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('Ошибка при получении транзакций бонусов:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка сервера: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}

/**
 * POST /api/bonus/transactions
 * Создание новой транзакции (ручное начисление/списание бонусов)
 * Доступно только администраторам
 */
export async function POST(req: NextRequest) {
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
    if (!data.userId || typeof data.amount !== 'number') {
      return NextResponse.json({ 
        success: false, 
        message: 'Необходимо указать userId и amount' 
      }, { status: 400 });
    }
    
    // Создаем транзакцию
    const transaction = bonusAdapter.manualAdjustment(
      data.userId,
      data.amount,
      data.description || 'Ручная корректировка баланса администратором'
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Транзакция успешно создана',
      transaction
    });
  } catch (error) {
    console.error('Ошибка при создании транзакции бонусов:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка сервера: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 