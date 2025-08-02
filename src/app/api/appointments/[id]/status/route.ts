import { NextRequest, NextResponse } from 'next/server';
import { appointmentsAdapter, bonusAdapter } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/database/db';
import { logger } from '@/lib/logger';

interface Params {
  params: {
    id: string;
  };
}

interface BonusTransaction {
  id: string;
}

/**
 * PATCH /api/appointments/[id]/status
 * Обновляет статус записи и связанных бонусных транзакций
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    // Проверяем авторизацию
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' }, 
        { status: 401 }
      );
    }
    
    // Получаем данные из запроса
    const { status } = await request.json();
    
    // Проверяем, что статус указан
    if (!status) {
      return NextResponse.json(
        { success: false, message: 'Не указан новый статус' }, 
        { status: 400 }
      );
    }
    
    // Получаем ID записи из параметров
    const appointmentId = params.id;
    
    // Получаем данные записи
    const appointment = appointmentsAdapter.getById(appointmentId);
    
    if (!appointment) {
      return NextResponse.json(
        { success: false, message: 'Запись не найдена' }, 
        { status: 404 }
      );
    }
    
    // Проверяем права доступа
    // Обновлять статус могут: владелец записи, администратор или специалист услуги
    if (
      currentUser.id !== appointment.userId && 
      currentUser.role !== 'admin' && 
      currentUser.id !== appointment.specialistId
    ) {
      return NextResponse.json(
        { success: false, message: 'Недостаточно прав для обновления статуса записи' }, 
        { status: 403 }
      );
    }
    
    // Обновляем статус записи
    const updatedAppointment = appointmentsAdapter.updateStatus(appointmentId, status);
    
    if (!updatedAppointment) {
      return NextResponse.json(
        { success: false, message: 'Ошибка при обновлении статуса записи' }, 
        { status: 500 }
      );
    }
    
    // Если статус изменен на "completed" (выполнено), обновляем связанные бонусные транзакции
    if (status === 'completed') {
      try {
        // Находим бонусные транзакции, связанные с этой записью
        const bonusTransactions = db.prepare(
          'SELECT id FROM bonus_transactions WHERE appointmentId = ? AND status = "pending" AND type = "booking"'
        ).all(appointmentId) as BonusTransaction[];
        
        if (bonusTransactions && bonusTransactions.length > 0) {
          logger.info(`Найдено ${bonusTransactions.length} ожидающих бонусных транзакций для записи ${appointmentId}`);
          
          // Обновляем статус каждой транзакции
          for (const transaction of bonusTransactions) {
            bonusAdapter.updateTransactionStatus(transaction.id, 'completed');
            logger.info(`Статус бонусной транзакции ${transaction.id} изменен на "completed"`);
          }
        }
      } catch (error) {
        // Ошибка при обновлении бонусных транзакций не должна препятствовать обновлению статуса записи
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Ошибка при обновлении статуса бонусных транзакций для записи ${appointmentId}: ${errorMessage}`);
      }
    }
    
    // Если статус изменен на "cancelled" (отменено), отменяем связанные бонусные транзакции
    if (status === 'cancelled') {
      try {
        // Находим бонусные транзакции, связанные с этой записью
        const bonusTransactions = db.prepare(
          'SELECT id FROM bonus_transactions WHERE appointmentId = ? AND status = "pending"'
        ).all(appointmentId) as BonusTransaction[];
        
        if (bonusTransactions && bonusTransactions.length > 0) {
          logger.info(`Найдено ${bonusTransactions.length} ожидающих бонусных транзакций для отмененной записи ${appointmentId}`);
          
          // Отменяем каждую транзакцию
          for (const transaction of bonusTransactions) {
            bonusAdapter.updateTransactionStatus(transaction.id, 'cancelled');
            logger.info(`Статус бонусной транзакции ${transaction.id} изменен на "cancelled"`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Ошибка при отмене бонусных транзакций для записи ${appointmentId}: ${errorMessage}`);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { appointment: updatedAppointment },
      message: 'Статус записи успешно обновлен'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Ошибка при обновлении статуса записи: ${errorMessage}`);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при обновлении статуса' }, 
      { status: 500 }
    );
  }
} 