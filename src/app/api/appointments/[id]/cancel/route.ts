import { NextRequest, NextResponse } from 'next/server';
import { appointmentsAPI } from '@/database/api/appointments';
import { bonusAdapter, BonusTransaction } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponse } from '@/models/types';
import { db } from '@/database/db';
import { logger } from '@/lib/logger';

/**
 * Отмена записи на прием
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка авторизации
    const currentUser = await getCurrentUser();
    
    // Если пользователь не авторизован
    if (!currentUser) {
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Необходима авторизация' 
      }, { status: 401 });
    }
    
    // Получаем ID записи из URL
    const { id } = params;
    
    // Проверяем, существует ли запись
    const appointment = appointmentsAPI.getById(id);
    if (!appointment) {
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Запись не найдена' 
      }, { status: 404 });
    }
    
    // Проверяем права доступа - администраторы всегда имеют доступ
    const isAdmin = currentUser.role === 'admin';
    
    // Если не админ, проверяем, принадлежит ли запись текущему пользователю
    if (!isAdmin && appointment.userId !== currentUser.id) {
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Недостаточно прав для отмены этой записи' 
      }, { status: 403 });
    }
    
    // Начинаем транзакцию в БД
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Обновляем статус записи на "отменено"
      console.log(`[API] Отмена записи ${id}, текущий статус: ${appointment.status}`);
      const updatedAppointment = appointmentsAPI.updateStatus(id, 'cancelled');
      
      if (!updatedAppointment) {
        // Откатываем транзакцию в случае ошибки
        db.exec('ROLLBACK');
        console.error(`[API] Не удалось обновить запись ${id}`);
        return NextResponse.json<ApiResponse<null>>({ 
          success: false, 
          error: 'Не удалось отменить запись' 
        }, { status: 500 });
      }
      
      console.log(`[API] Запись ${id} успешно обновлена, новый статус: ${updatedAppointment.status}`);
      
      // Если статус изменен на "cancelled" (отменено), отменяем связанные бонусные транзакции
      if (updatedAppointment.status === 'cancelled') {
        try {
          // Находим бонусные транзакции, связанные с этой записью
          const bonusTransactions = db.prepare(
            'SELECT id FROM bonus_transactions WHERE appointmentId = ? AND status = "pending" AND type = "booking"'
          ).all(updatedAppointment.id) as BonusTransaction[];
          
          if (bonusTransactions && bonusTransactions.length > 0) {
            logger.info(`Найдено ${bonusTransactions.length} ожидающих бонусных транзакций для отмененной записи ${updatedAppointment.id}`);
            
            // Отменяем каждую транзакцию
            for (const transaction of bonusTransactions) {
              bonusAdapter.updateTransactionStatus(transaction.id, 'cancelled');
              logger.info(`Статус бонусной транзакции ${transaction.id} изменен на "cancelled"`);
            }
          }
          
          // Находим транзакции списания бонусов, чтобы вернуть бонусы пользователю
          const spentTransactions = db.prepare(
            'SELECT * FROM bonus_transactions WHERE appointmentId = ? AND status = "completed" AND type = "spent"'
          ).all(updatedAppointment.id) as BonusTransaction[];
          
          if (spentTransactions && spentTransactions.length > 0) {
            logger.info(`Найдено ${spentTransactions.length} завершенных транзакций списания для отмененной записи ${updatedAppointment.id}`);
            
            // Возвращаем бонусы пользователю
            for (const transaction of spentTransactions) {
              // Создаем новую транзакцию для возврата бонусов
              const refundAmount = Math.abs(transaction.amount);
              bonusAdapter.createTransaction({
                userId: transaction.userId,
                amount: refundAmount,
                type: 'manual',
                status: 'completed',
                description: `Возврат бонусов при отмене брони #${updatedAppointment.id}`,
                appointmentId: updatedAppointment.id
              });
              logger.info(`Возвращены списанные бонусы (${refundAmount}) для пользователя ${transaction.userId}`);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Ошибка при обработке бонусных транзакций для записи ${updatedAppointment.id}: ${errorMessage}`);
        }
      }
      
      // Завершаем транзакцию
      db.exec('COMMIT');
      
      // Возвращаем результат
      return NextResponse.json<ApiResponse<{ appointment: typeof updatedAppointment }>>({ 
        success: true, 
        data: { appointment: updatedAppointment },
        message: 'Запись успешно отменена'
      });
    } catch (error) {
      // Откатываем транзакцию в случае ошибки
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при отмене записи:', error);
    return NextResponse.json<ApiResponse<null>>({ 
      success: false, 
      error: 'Произошла ошибка при отмене записи' 
    }, { status: 500 });
  }
} 