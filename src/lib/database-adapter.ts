/**
 * Адаптер для перенаправления запросов из старого JSON API к новому SQLite API
 * 
 * Этот модуль заменяет прямые вызовы к файлам JSON на вызовы к соответствующим 
 * адаптерам базы данных SQLite. Он сохраняет тот же интерфейс, что и старые
 * функции, но вместо чтения/записи JSON файлов использует базу данных SQLite.
 */

import {
  usersAdapter,
  servicesAdapter,
  specialistsAdapter,
  articlesAdapter,
  appointmentsAdapter
} from '@/database/adapters';

import bcrypt from 'bcryptjs';

/**
 * Пользователи
 * 
 * Замена функций из src/models/usersAPI.ts
 */
export const usersAPI = {
  getAllUsers: () => {
    return usersAdapter.getAll();
  },
  
  getUserById: (id: string) => {
    return usersAdapter.getById(id);
  },
  
  getUserByEmail: (email: string) => {
    return usersAdapter.getByEmail(email);
  },
  
  createUser: async (data: any) => {
    // Хешируем пароль
    const passwordHash = await bcrypt.hash(data.password, 10);
    
    return usersAdapter.create({
      email: data.email,
      password: passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role || 'client'
    });
  },
  
  updateUser: async (id: string, data: any) => {
    const updates: any = { ...data };
    
    // Если есть пароль, хешируем его
    if (data.password) {
      updates.password = await bcrypt.hash(data.password, 10);
    }
    
    return usersAdapter.update(id, updates);
  },
  
  deleteUser: (id: string) => {
    return usersAdapter.delete(id);
  },
  
  verifyPassword: async (user: any, password: string) => {
    if (!user || !user.password) return false;
    return await bcrypt.compare(password, user.password);
  }
};

/**
 * Сервисы
 * 
 * Замена функций из src/models/servicesAPI.ts
 */
export const servicesAPI = {
  getAllServices: () => {
    return servicesAdapter.getAll();
  },
  
  getServiceById: (id: string) => {
    return servicesAdapter.getById(id);
  },
  
  createService: (data: any) => {
    return servicesAdapter.create(data);
  },
  
  updateService: (id: string, data: any) => {
    return servicesAdapter.update(id, data);
  },
  
  deleteService: (id: string) => {
    return servicesAdapter.delete(id);
  }
};

/**
 * Специалисты
 * 
 * Замена функций из src/models/specialistsAPI.ts
 */
export const specialistsAPI = {
  getAllSpecialists: () => {
    return specialistsAdapter.getAll();
  },
  
  getSpecialistById: (id: string) => {
    return specialistsAdapter.getById(id);
  },
  
  createSpecialist: (data: any) => {
    return specialistsAdapter.create(data);
  },
  
  updateSpecialist: (id: string, data: any) => {
    return specialistsAdapter.update(id, data);
  },
  
  deleteSpecialist: (id: string) => {
    return specialistsAdapter.delete(id);
  }
};

/**
 * Записи на прием
 * 
 * Замена функций из src/models/appointmentsAPI.ts
 */
export const appointmentsAPI = {
  getAllAppointments: () => {
    return appointmentsAdapter.getAll();
  },
  
  getAppointmentById: (id: string) => {
    return appointmentsAdapter.getById(id);
  },
  
  getAppointmentsByUserId: (userId: string) => {
    return appointmentsAdapter.getByUserId(userId);
  },
  
  getAppointmentsBySpecialistId: (specialistId: string) => {
    return appointmentsAdapter.getBySpecialistId(specialistId);
  },
  
  createAppointment: (data: any) => {
    return appointmentsAdapter.create(data);
  },
  
  updateAppointment: (id: string, data: any) => {
    return appointmentsAdapter.update(id, data);
  },
  
  deleteAppointment: (id: string) => {
    return appointmentsAdapter.delete(id);
  },
  
  updateAppointmentStatus: (id: string, status: string) => {
    return appointmentsAdapter.updateStatus(id, status);
  },
  
  rescheduleAppointment: (id: string, date: string, startTime: string, endTime: string) => {
    return appointmentsAdapter.reschedule(id, date, startTime, endTime);
  }
};

/**
 * Статьи
 * 
 * Замена функций из src/models/articlesAPI.ts
 */
export const articlesAPI = {
  getAllArticles: () => {
    return articlesAdapter.getAll();
  },
  
  getArticleById: (id: string) => {
    return articlesAdapter.getById(id);
  },
  
  createArticle: (data: any) => {
    return articlesAdapter.create(data);
  },
  
  updateArticle: (id: string, data: any) => {
    return articlesAdapter.update(id, data);
  },
  
  deleteArticle: (id: string) => {
    return articlesAdapter.delete(id);
  }
}; 