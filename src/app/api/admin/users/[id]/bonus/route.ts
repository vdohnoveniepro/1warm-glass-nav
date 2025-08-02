import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/database/db';
import { bonusAdapter } from '@/database/adapters';
import { logger } from '@/lib/logger';
import { initDB } from '@/app/api/db';

interface Params {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/users/[id]/bonus
 * Получение информации о бонусах пользователя и истории транзакций
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверяем авторизацию и права доступа
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      );
    }

    // Получаем ID пользователя из параметров маршрута
    const userId = params.id;

    // Получаем информацию о пользователе из базы данных
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Получаем баланс бонусов пользователя
    const bonusBalance = user.bonusBalance || 0;

    // Получаем историю транзакций пользователя
    const transactions = bonusAdapter.getUserTransactions(userId);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          bonusBalance
        },
        transactions
      }
    });
  } catch (error) {
    console.error('Ошибка при получении информации о бонусах пользователя:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при получении данных' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users/[id]/bonus
 * Начисление или списание бонусов пользователю
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверяем авторизацию и права доступа
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      );
    }

    // Получаем ID пользователя из параметров маршрута
    const userId = params.id;

    // Получаем данные из тела запроса
    const { amount, description, operation = 'add' } = await request.json();

    // Проверяем обязательные поля
    if (amount === undefined || isNaN(Number(amount))) {
      return NextResponse.json(
        { success: false, message: 'Необходимо указать корректную сумму бонусов' },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь существует
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Преобразуем сумму в число
    const bonusAmount = Math.abs(Number(amount));

    // Определяем тип операции (начисление или списание)
    const type = operation === 'subtract' ? 'spent' : 'manual';
    const finalAmount = operation === 'subtract' ? -bonusAmount : bonusAmount;

    // Проверяем, достаточно ли бонусов для списания
    const currentBalance = user.bonusBalance || 0;
    if (operation === 'subtract' && currentBalance < bonusAmount) {
      return NextResponse.json(
        { success: false, message: 'Недостаточно бонусов для списания' },
        { status: 400 }
      );
    }

    // Создаем транзакцию бонусов
    const transactionResult = bonusAdapter.createTransaction({
      userId,
      amount: finalAmount,
      type,
      status: 'completed',
      description: description || `${operation === 'subtract' ? 'Списание' : 'Начисление'} бонусов администратором`
    });

    if (!transactionResult) {
      return NextResponse.json(
        { success: false, message: 'Ошибка при создании транзакции бонусов' },
        { status: 500 }
      );
    }

    // Обновляем баланс пользователя
    const newBalance = currentBalance + finalAmount;
    db.prepare('UPDATE users SET bonusBalance = ? WHERE id = ?').run(newBalance, userId);

    logger.info(`Администратор ${currentUser.id} ${operation === 'subtract' ? 'списал' : 'начислил'} ${bonusAmount} бонусов пользователю ${userId}. Новый баланс: ${newBalance}`);

    return NextResponse.json({
      success: true,
      data: {
        transaction: transactionResult,
        newBalance
      },
      message: `Бонусы успешно ${operation === 'subtract' ? 'списаны' : 'начислены'}`
    });
  } catch (error) {
    console.error('Ошибка при работе с бонусами пользователя:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при обработке запроса' },
      { status: 500 }
    );
  }
} 