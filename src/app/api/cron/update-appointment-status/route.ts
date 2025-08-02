import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { logger } from '@/lib/logger';
import { initDB } from '@/app/api/db';
import { bonusAdapter } from '@/database/adapters';

// Интерфейсы для типизации данных
interface Appointment {
  id: string;
  userId: string;
  timeEnd: string;
  date: string;
}

interface BonusTransaction {
  id: string;
}

/**
 * GET /api/cron/update-appointment-status
 * Автоматически обновляет статус записей и связанных бонусных транзакций
 * Этот эндпоинт должен вызываться по расписанию (например, каждый час)
 */
export async function GET(request: NextRequest) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверяем, что запрос авторизован с помощью API ключа
    // В реальном приложении вы должны использовать надежный механизм аутентификации для cron-задач
    const authHeader = request.headers.get('Authorization');
    const apiKey = process.env.CRON_API_KEY;
    
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      logger.warn('Попытка неавторизованного доступа к API обновления статусов записей');
      return NextResponse.json(
        { success: false, message: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }
    
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // Формат HH:MM
    
    logger.info(`Запуск автоматического обновления статусов записей: ${currentDate} ${currentTime}`);
    
    // Находим завершенные записи, которые еще не имеют статус "completed"
    // Запись считается завершенной, если дата и время окончания прошли
    const completedAppointments = db.prepare(`
      SELECT id, userId, timeEnd, date
      FROM appointments 
      WHERE status = 'confirmed' 
      AND ((date < ?) OR (date = ? AND timeEnd <= ?))
    `).all(currentDate, currentDate, currentTime) as Appointment[];
    
    logger.info(`Найдено ${completedAppointments.length} завершенных записей`);
    
    // Счетчики для отчета
    let updatedAppointments = 0;
    let updatedBonusTransactions = 0;
    
    // Обновляем статус каждой записи и связанных бонусных транзакций
    for (const appointment of completedAppointments) {
      try {
        // Обновляем статус записи на "completed"
        db.prepare(`
          UPDATE appointments 
          SET status = 'completed', updatedAt = ? 
          WHERE id = ?
        `).run(now.toISOString(), appointment.id);
        
        updatedAppointments++;
        
        // Находим и обновляем связанные бонусные транзакции
        const pendingBonusTransactions = db.prepare(`
          SELECT id 
          FROM bonus_transactions 
          WHERE appointmentId = ? AND status = 'pending' AND type = 'booking'
        `).all(appointment.id) as BonusTransaction[];
        
        for (const transaction of pendingBonusTransactions) {
          bonusAdapter.updateTransactionStatus(transaction.id, 'completed');
          updatedBonusTransactions++;
        }
        
        logger.info(`Обновлен статус записи ${appointment.id} и ${pendingBonusTransactions.length} бонусных транзакций`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Ошибка при обновлении статуса записи ${appointment.id}: ${errorMessage}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Автоматическое обновление статусов выполнено',
      data: {
        updatedAppointments,
        updatedBonusTransactions
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Ошибка при автоматическом обновлении статусов: ${errorMessage}`);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при обновлении статусов' },
      { status: 500 }
    );
  }
} 