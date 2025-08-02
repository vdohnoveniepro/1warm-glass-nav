import { NextRequest, NextResponse } from 'next/server';
import { appointmentsAPI } from '@/database/api/appointments';
import { bonusAdapter, BonusTransaction } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponse, AppointmentStatus } from '@/models/types';
import { db } from '@/database/db';

/**
 * Завершение записи на прием
 * Только администраторы и специалисты могут завершать записи
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
    
    // Проверяем права доступа - только администраторы и специалисты могут завершать записи
    const isAdmin = currentUser.role === 'admin';
    const isSpecialist = currentUser.role === 'specialist';
    
    if (!isAdmin && !isSpecialist) {
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Недостаточно прав для завершения записи' 
      }, { status: 403 });
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
    
    // Если пользователь - специалист, проверяем, что запись назначена ему
    // Получаем ID специалиста из базы данных
    let specialistId = null;
    if (isSpecialist) {
      const specialist = db.prepare('SELECT id FROM specialists WHERE userId = ?').get(currentUser.id) as { id: string } | undefined;
      if (specialist) {
        specialistId = specialist.id;
      }
    }
    
    if (isSpecialist && !isAdmin && appointment.specialistId !== specialistId) {
      return NextResponse.json<ApiResponse<null>>({ 
        success: false, 
        error: 'Недостаточно прав для завершения этой записи' 
      }, { status: 403 });
    }
    
    // Начинаем транзакцию в БД
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Обновляем статус записи на "завершено"
      const updatedAppointment = appointmentsAPI.updateStatus(id, AppointmentStatus.COMPLETED);
      
      if (!updatedAppointment) {
        // Откатываем транзакцию в случае ошибки
        db.exec('ROLLBACK');
        return NextResponse.json<ApiResponse<null>>({ 
          success: false, 
          error: 'Не удалось завершить запись' 
        }, { status: 500 });
      }
      
      // Если у записи есть userId, подтверждаем начисление бонусов
      if (appointment.userId) {
        try {
          // Получаем транзакции бонусов для этой записи
          const bonusTransactions = db.prepare(`
            SELECT * FROM bonus_transactions 
            WHERE appointmentId = ? AND status = 'pending'
          `).all(appointment.id) as BonusTransaction[];
          
          // Подтверждаем все бонусные транзакции для этой записи
          for (const transaction of bonusTransactions) {
            bonusAdapter.updateTransactionStatus(transaction.id, 'completed');
            console.log(`Подтверждена бонусная транзакция ${transaction.id} для записи ${appointment.id}`);
          }
        } catch (bonusError) {
          console.error('Ошибка при подтверждении бонусов:', bonusError);
          // Не блокируем завершение записи из-за ошибки с бонусами
        }
      }
      
      // Завершаем транзакцию
      db.exec('COMMIT');
      
      // Возвращаем результат
      return NextResponse.json<ApiResponse<{ appointment: typeof updatedAppointment }>>({ 
        success: true, 
        data: { appointment: updatedAppointment },
        message: 'Запись успешно завершена'
      });
    } catch (error) {
      // Откатываем транзакцию в случае ошибки
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при завершении записи:', error);
    return NextResponse.json<ApiResponse<null>>({ 
      success: false, 
      error: 'Произошла ошибка при завершении записи' 
    }, { status: 500 });
  }
} 