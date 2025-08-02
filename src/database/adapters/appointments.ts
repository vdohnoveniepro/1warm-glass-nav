import { appointmentsAPI, Appointment } from '../api/appointments';

/**
 * Адаптер для совместимости старого API записей на прием с SQLite
 */
export const appointmentsAdapter = {
  /**
   * Получить все записи на прием
   */
  getAll: (): Appointment[] => {
    return appointmentsAPI.getAll();
  },
  
  /**
   * Получить запись на прием по ID
   */
  getById: (id: string): Appointment | null => {
    return appointmentsAPI.getById(id);
  },
  
  /**
   * Получить записи на прием по ID пользователя
   */
  getByUserId: (userId: string): Appointment[] => {
    return appointmentsAPI.getByUserId(userId);
  },
  
  /**
   * Получить записи на прием по ID специалиста
   */
  getBySpecialistId: (specialistId: string): Appointment[] => {
    return appointmentsAPI.getBySpecialistId(specialistId);
  },
  
  /**
   * Получить записи на прием по дате
   */
  getByDate: (date: string): Appointment[] => {
    return appointmentsAPI.getByDate(date);
  },
  
  /**
   * Получить записи на прием по диапазону дат
   */
  getByDateRange: (startDate: string, endDate: string): Appointment[] => {
    return appointmentsAPI.getByDateRange(startDate, endDate);
  },
  
  /**
   * Создать новую запись на прием
   */
  create: (data: any): Appointment => {
    const appointment: Partial<Appointment> = {
      userId: data.userId || null,
      specialistId: data.specialistId || null,
      serviceId: data.serviceId || null,
      userName: data.userName || null,
      userPhone: data.userPhone || null,
      date: data.date,
      startTime: data.startTime || data.timeStart,
      endTime: data.endTime || data.timeEnd,
      status: data.status || 'pending',
      comment: data.comment || null,
      price: data.price || 0,
      originalPrice: data.originalPrice || data.price || 0,
      discountAmount: data.discountAmount || 0,
      bonusAmount: data.bonusAmount || 0,
      promoCode: data.promoCode || null
    };
    
    return appointmentsAPI.create(appointment);
  },
  
  /**
   * Обновить запись на прием
   */
  update: (id: string, data: any): Appointment | null => {
    const appointment: Partial<Appointment> = {
      userId: data.userId,
      specialistId: data.specialistId,
      serviceId: data.serviceId,
      userName: data.userName,
      userPhone: data.userPhone,
      date: data.date,
      startTime: data.startTime || data.timeStart,
      endTime: data.endTime || data.timeEnd,
      status: data.status,
      comment: data.comment,
      price: data.price,
      originalPrice: data.originalPrice,
      discountAmount: data.discountAmount,
      bonusAmount: data.bonusAmount,
      promoCode: data.promoCode
    };
    
    return appointmentsAPI.update(id, appointment);
  },
  
  /**
   * Удалить запись на прием
   */
  delete: (id: string): boolean => {
    return appointmentsAPI.delete(id);
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
    return appointmentsAPI.reschedule(id, date, startTime, endTime);
  }
}; 