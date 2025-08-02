import { usersAPI, User } from '../api/users';
import bcrypt from 'bcryptjs';

/**
 * Адаптер для совместимости старого API пользователей с SQLite
 */
export const usersAdapter = {
  /**
   * Получить всех пользователей
   */
  getAll: (): User[] => {
    return usersAPI.getAll();
  },
  
  /**
   * Получить пользователя по ID
   */
  getById: (id: string): User | null => {
    return usersAPI.getById(id);
  },
  
  /**
   * Получить пользователя по email
   */
  getByEmail: (email: string): User | null => {
    return usersAPI.getByEmail(email);
  },
  
  /**
   * Создать нового пользователя
   */
  create: (data: Partial<User>): User => {
    return usersAPI.create(data);
  },
  
  /**
   * Обновить пользователя
   */
  update: (id: string, data: Partial<User>): User | null => {
    return usersAPI.update(id, data);
  },
  
  /**
   * Удалить пользователя
   */
  delete: (id: string): boolean => {
    return usersAPI.delete(id);
  },
  
  /**
   * Поиск пользователей
   */
  search: (query: string): User[] => {
    return usersAPI.search(query);
  },
  
  /**
   * Проверка учетных данных пользователя
   * Реализация прямо в адаптере, так как она отсутствует в API
   */
  validateCredentials: (email: string, password: string): User | null => {
    const user = usersAPI.getByEmail(email);
    
    if (!user || !user.password) {
      return null;
    }
    
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    
    return isPasswordValid ? user : null;
  },
  
  /**
   * Изменить роль пользователя
   * Реализация через обновление пользователя
   */
  updateRole: (id: string, role: string): User | null => {
    return usersAPI.update(id, { role });
  }
}; 