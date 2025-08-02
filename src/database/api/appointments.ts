import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export type Appointment = {
  id: string;
  userId: string | null;
  specialistId: string | null;
  serviceId: string | null;
  userName: string | null;
  userPhone: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  comment: string | null;
  price?: number;
  originalPrice?: number;
  discountAmount?: number;
  bonusAmount?: number;
  promoCode?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const appointmentsAPI = {
  /**
   * Получить все записи на прием
   */
  getAll: (): Appointment[] => {
    return db.prepare('SELECT * FROM appointments ORDER BY date, startTime').all() as Appointment[];
  },

  /**
   * Получить запись на прием по ID
   */
  getById: (id: string): Appointment | null => {
    return db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Appointment | null;
  },

  /**
   * Получить записи на прием по ID пользователя
   */
  getByUserId: (userId: string): Appointment[] => {
    return db.prepare('SELECT * FROM appointments WHERE userId = ? ORDER BY date, startTime').all(userId) as Appointment[];
  },

  /**
   * Получить записи на прием по ID специалиста
   */
  getBySpecialistId: (specialistId: string): Appointment[] => {
    return db.prepare('SELECT * FROM appointments WHERE specialistId = ? ORDER BY date, startTime').all(specialistId) as Appointment[];
  },

  /**
   * Получить записи на прием по дате
   */
  getByDate: (date: string): Appointment[] => {
    return db.prepare('SELECT * FROM appointments WHERE date = ? ORDER BY startTime').all(date) as Appointment[];
  },

  /**
   * Получить записи на прием по диапазону дат
   */
  getByDateRange: (startDate: string, endDate: string): Appointment[] => {
    return db.prepare('SELECT * FROM appointments WHERE date >= ? AND date <= ? ORDER BY date, startTime').all(startDate, endDate) as Appointment[];
  },

  /**
   * Создать новую запись на прием
   */
  create: (data: Partial<Appointment>): Appointment | null => {
    try {
      const now = new Date().toISOString();
      const id = uuidv4();
      
      // Собираем все поля для вставки
      const appointment = {
        id,
        userId: data.userId || null,
        specialistId: data.specialistId || null,
        serviceId: data.serviceId || null,
        userName: data.userName || null,
        userPhone: data.userPhone || null,
        date: data.date || '',
        startTime: data.startTime || '',
        endTime: data.endTime || '',
        status: data.status || 'pending',
        comment: data.comment || null,
        price: data.price || 0,
        originalPrice: data.originalPrice || 0,
        discountAmount: data.discountAmount || 0,
        bonusAmount: data.bonusAmount || 0,
        promoCode: data.promoCode || null,
        createdAt: now,
        updatedAt: now
      };
      
      db.prepare(`
        INSERT INTO appointments (
          id, userId, specialistId, serviceId, userName,
          userPhone, date, startTime, endTime, status, 
          comment, price, originalPrice, discountAmount, bonusAmount,
          promoCode, createdAt, updatedAt
        ) VALUES (
          @id, @userId, @specialistId, @serviceId, @userName,
          @userPhone, @date, @startTime, @endTime, @status,
          @comment, @price, @originalPrice, @discountAmount, @bonusAmount,
          @promoCode, @createdAt, @updatedAt
        )
      `).run(appointment);
      
      return appointmentsAPI.getById(id);
    } catch (error) {
      console.error('Ошибка при создании записи:', error);
      throw error;
    }
  },

  /**
   * Обновить запись на прием
   */
  update: (id: string, appointment: Partial<Appointment>): Appointment | null => {
    const currentAppointment = appointmentsAPI.getById(id);
    
    if (!currentAppointment) {
      return null;
    }
    
    const updatedAppointment: Appointment = {
      ...currentAppointment,
      ...appointment,
      id, // Сохраняем исходный ID
      updatedAt: new Date().toISOString()
    };
    
    db.prepare(`
      UPDATE appointments
      SET userId = ?,
          specialistId = ?,
          serviceId = ?,
          userName = ?,
          userPhone = ?,
          date = ?,
          startTime = ?,
          endTime = ?,
          status = ?,
          comment = ?,
          price = ?,
          originalPrice = ?,
          discountAmount = ?,
          bonusAmount = ?,
          promoCode = ?,
          updatedAt = ?
      WHERE id = ?
    `).run(
      updatedAppointment.userId,
      updatedAppointment.specialistId,
      updatedAppointment.serviceId,
      updatedAppointment.userName,
      updatedAppointment.userPhone,
      updatedAppointment.date,
      updatedAppointment.startTime,
      updatedAppointment.endTime,
      updatedAppointment.status,
      updatedAppointment.comment,
      updatedAppointment.price,
      updatedAppointment.originalPrice,
      updatedAppointment.discountAmount,
      updatedAppointment.bonusAmount,
      updatedAppointment.promoCode,
      updatedAppointment.updatedAt,
      id
    );
    
    return updatedAppointment;
  },

  /**
   * Удалить запись на прием
   */
  delete: (id: string): boolean => {
    const result = db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Обновить статус записи на прием
   */
  updateStatus: (id: string, status: string): Appointment | null => {
    return appointmentsAPI.update(id, { status });
  },

  /**
   * Перенести запись на прием на другое время
   */
  reschedule: (id: string, date: string, startTime: string, endTime: string): Appointment | null => {
    return appointmentsAPI.update(id, { date, startTime, endTime });
  },

  /**
   * Автоматическое обновление статусов завершенных записей
   * Обновляет статус с 'confirmed' на 'completed' для записей, дата которых уже прошла
   */
  updateCompletedAppointmentsStatuses: (): string[] => {
    const today = new Date().toISOString().split('T')[0];
    const appointments = db.prepare(`
      SELECT * FROM appointments 
      WHERE status = 'confirmed' AND (date < ? OR (date = ? AND endTime < ?))
    `).all(today, today, new Date().toTimeString().split(' ')[0]) as Appointment[];
    
    const updatedIds: string[] = [];
    
    for (const appointment of appointments) {
      const updated = appointmentsAPI.updateStatus(appointment.id, 'completed');
      if (updated) {
        updatedIds.push(appointment.id);
      }
    }
    
    return updatedIds;
  }
}; 