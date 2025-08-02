import { NextRequest, NextResponse } from 'next/server';
import { appointmentsAdapter, bonusAdapter } from '@/database/adapters';
import { initDB } from '@/app/api/db';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { db } from '@/database/db';
import { logger } from '@/lib/logger';

// Инициализируем базу данных
initDB();

// Проверка, требуется ли подтверждение администратором
function requiresApproval(serviceId: string): boolean {
  // В будущем можно добавить проверку по настройкам сервиса
  return false;
}

/**
 * Формат запроса:
 * {
 *   serviceId: string,
 *   specialistId: string,
 *   userId?: string, // ID авторизованного пользователя (если есть)
 *   date: string, // YYYY-MM-DD
 *   timeStart: string, // HH:MM
 *   timeEnd: string, // HH:MM
 *   userName: string, // Имя клиента
 *   userEmail: string, // Email клиента
 *   userPhone: string, // Телефон клиента
 *   password?: string, // Пароль (для создания аккаунта, если пользователь не авторизован)
 *   price: number, // Цена услуги
 *   usedBonus?: number // Количество использованных бонусов
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      serviceId, 
      specialistId, 
      date, 
      timeStart, 
      timeEnd, 
      userName, 
      userEmail, 
      userPhone, 
      password, 
      price,
      userId: clientUserId, // Получаем userId от клиента, если он был передан
      usedBonus,
      bonusAmount // Добавляем поддержку поля bonusAmount для совместимости
    } = data;
    
    // Валидация
    if (!serviceId || !specialistId || !date || !timeStart || !timeEnd || !userName || !userEmail) {
      return NextResponse.json({
        success: false,
        error: 'Не все обязательные поля заполнены'
      }, { status: 400 });
    }
    
    // Начало транзакции в базе данных
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Если передан идентификатор пользователя, используем его, иначе null
      const userId = clientUserId || null;
      
      // Создаем запись о бронировании
      const bookingData = {
        serviceId,
        specialistId,
        userId,
        date,
        timeStart,
        timeEnd,
        clientName: userName,
        clientEmail: userEmail,
        clientPhone: userPhone,
        status: requiresApproval(serviceId) ? 'pending' : 'confirmed',
        price: price || 0,
        originalPrice: data.originalPrice || price || 0,
        discountAmount: data.discountAmount || 0,
        bonusAmount: bonusAmount || 0,
        paymentStatus: 'unpaid',
        notes: data.notes || '',
        source: 'website',
        promoCode: data.promoCode || null
      };
      
      // Создаем запись в базе данных
      const appointment = appointmentsAdapter.create(bookingData);
      
      // Получаем информацию о специалисте и услуге для письма
      const specialistName = data.specialistName || "Специалист"; // Должно быть передано с клиента
      const serviceName = data.serviceName || "Услуга"; // Должно быть передано с клиента
      
      // Определяем сумму бонусов для списания (проверяем оба поля для совместимости)
      const bonusToSpend = bonusAmount || usedBonus || 0;
      
      // Если указан userId и количество бонусов для списания, обрабатываем бонусы
      if (userId && bonusToSpend > 0) {
        try {
          logger.info(`Списание ${bonusToSpend} бонусов для пользователя ${userId} при бронировании ${appointment.id}`);
          
          // Проверяем баланс бонусов пользователя
          const userBalance = bonusAdapter.getUserBalance(userId);
          logger.info(`Текущий баланс пользователя: ${userBalance} бонусов`);
          
          if (userBalance >= bonusToSpend) {
            // Списываем бонусы со статусом "completed" (немедленное списание)
            const transaction = bonusAdapter.spendBonus(userId, bonusToSpend, appointment.id);
            logger.info(`Бонусы успешно списаны: ${bonusToSpend} ₽, ID транзакции: ${transaction.id}`);
            
            // Проверяем, что транзакция создана успешно
            const checkTransaction = bonusAdapter.getTransactionById(transaction.id);
            if (checkTransaction) {
              logger.info(`Транзакция подтверждена: ${JSON.stringify(checkTransaction)}`);
            } else {
              logger.error(`Ошибка: транзакция не найдена после создания`);
            }
            
            // Проверяем обновленный баланс
            const updatedBalance = bonusAdapter.getUserBalance(userId);
            logger.info(`Обновленный баланс после списания: ${updatedBalance} бонусов`);
          } else {
            logger.error(`Недостаточно бонусов для списания. Запрошено: ${bonusToSpend}, доступно: ${userBalance}`);
          }
        } catch (bonusError) {
          logger.error('Ошибка при списании бонусов:', bonusError);
          // Не прерываем основной процесс бронирования при ошибке с бонусами
        }
      }
      
      // Запись в базу данных создана успешно
      db.exec('COMMIT');
      
      // Отправляем электронное письмо с подтверждением
      try {
        await sendBookingConfirmationEmail({
          appointmentId: appointment.id,
          email: userEmail,
          name: userName,
          service: serviceName,
          specialist: specialistName,
          date: date,
          time: timeStart,
          status: appointment.status
        });
      } catch (error) {
        console.error('Ошибка при отправке email:', error);
      }
      
      return NextResponse.json({
        success: true,
        data: appointment,
        message: 'Бронирование успешно создано'
      });
    } catch (error) {
      // В случае ошибки откатываем транзакцию
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при бронировании:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Произошла ошибка при бронировании'
    }, { status: 500 });
  }
} 