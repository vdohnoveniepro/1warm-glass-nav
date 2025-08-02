import { User, UserRole } from '../models/types';

/**
 * Нормализует роли пользователя из различных форматов в массив строк в нижнем регистре
 * Эта функция не зависит от базы данных и может быть использована на клиенте
 */
export function normalizeUserRoles(user: any): string[] {
  // Если роли уже представлены как массив
  if (user?.roles && Array.isArray(user.roles)) {
    return user.roles.map((role: string) => role.toLowerCase());
  }
  
  // Если роли хранятся как JSON строка
  if (user?.roles && typeof user.roles === 'string') {
    try {
      const parsedRoles = JSON.parse(user.roles);
      if (Array.isArray(parsedRoles)) {
        return parsedRoles.map((role: string) => role.toLowerCase());
      }
    } catch (e) {
      // Если не удалось распарсить JSON, будем использовать одиночную роль
      console.error('Ошибка при парсинге ролей из JSON:', e);
    }
  }
  
  // Если есть только одиночная роль
  if (user?.role && typeof user.role === 'string') {
    return [user.role.toLowerCase()];
  }
  
  // По умолчанию возвращаем роль 'user'
  return ['user'];
}

/**
 * Проверяет, является ли пользователь администратором
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  
  const roles = normalizeUserRoles(user);
  return roles.includes('admin');
}

/**
 * Проверяет, является ли пользователь специалистом
 */
export function isSpecialist(user: User | null): boolean {
  if (!user) return false;
  
  const roles = normalizeUserRoles(user);
  return roles.includes('specialist');
}

/**
 * Возвращает отображаемое название роли пользователя
 */
export function getUserRoleDisplayName(role: string | UserRole): string {
  if (!role) return 'Пользователь';
  
  const roleStr = role.toLowerCase();
  
  switch (roleStr) {
    case 'admin':
      return 'Администратор';
    case 'specialist':
      return 'Специалист';
    case 'user':
    default:
      return 'Пользователь';
  }
}
