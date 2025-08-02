import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export type User = {
  id: string;
  email: string | null;
  password: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  photo: string | null;
  photo_url: string | null;
  role: string; // Основная роль в БД
  roles?: string[]; // Массив всех ролей (для совместимости с JSON)
  favorites?: {
    articles: string[];
    services: string[];
    specialists: string[];
  } | null;
  telegramId?: string | null;
  telegramUsername?: string | null;
  referralCode?: string | null; // Реферальный код пользователя
  referredById?: string | null; // ID пользователя, который пригласил текущего
  createdAt: string;
  updatedAt: string;
};

export const usersAPI = {
  /**
   * Получить всех пользователей
   */
  getAll: (): User[] => {
    const users = db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all() as User[];
    
    // Обрабатываем данные пользователей
    return users.map(user => {
      // Преобразуем строковое представление избранного в объект
      if (user.favorites && typeof user.favorites === 'string') {
        try {
          user.favorites = JSON.parse(user.favorites);
        } catch (e) {
          console.error(`Ошибка при разборе favorites для пользователя ${user.id}:`, e);
          user.favorites = { articles: [], services: [], specialists: [] };
        }
      } else if (!user.favorites) {
        user.favorites = { articles: [], services: [], specialists: [] };
      }
      
      // Обрабатываем роли: если в БД есть строка roles, преобразуем её в массив
      // Если нет, создаем массив из одной основной роли
      if (user.roles && typeof user.roles === 'string') {
        try {
          user.roles = JSON.parse(user.roles);
        } catch (e) {
          console.error(`Ошибка при разборе roles для пользователя ${user.id}:`, e);
          user.roles = [user.role.toLowerCase()];
        }
      } else {
        // Если поля roles нет, используем основную роль
        user.roles = [user.role.toLowerCase()];
      }
      
      return user;
    });
  },

  /**
   * Получить пользователя по ID
   */
  getById: (id: string): User | null => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | null;
    
    if (user) {
      // Преобразуем избранное из JSON в объект
      if (user.favorites && typeof user.favorites === 'string') {
        try {
          user.favorites = JSON.parse(user.favorites);
        } catch (e) {
          console.error(`Ошибка при разборе favorites для пользователя ${user.id}:`, e);
          user.favorites = { articles: [], services: [], specialists: [] };
        }
      } else if (!user.favorites) {
        user.favorites = { articles: [], services: [], specialists: [] };
      }
      
      // Обрабатываем роли
      if (user.roles && typeof user.roles === 'string') {
        try {
          user.roles = JSON.parse(user.roles);
        } catch (e) {
          console.error(`Ошибка при разборе roles для пользователя ${user.id}:`, e);
          user.roles = [user.role.toLowerCase()];
        }
      } else {
        // Если поля roles нет, используем основную роль
        user.roles = [user.role.toLowerCase()];
      }
    }
    
    return user;
  },

  /**
   * Получить пользователя по email
   */
  getByEmail: (email: string): User | null => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | null;
    
    if (user) {
      // Преобразуем избранное из JSON в объект
      if (user.favorites && typeof user.favorites === 'string') {
        try {
          user.favorites = JSON.parse(user.favorites);
        } catch (e) {
          console.error(`Ошибка при разборе favorites для пользователя ${user.id}:`, e);
          user.favorites = { articles: [], services: [], specialists: [] };
        }
      } else if (!user.favorites) {
        user.favorites = { articles: [], services: [], specialists: [] };
      }
    }
    
    return user;
  },

  /**
   * Найти пользователя по Telegram ID
   */
  findByTelegramId: (telegramId: string): User | null => {
    const user = db.prepare('SELECT * FROM users WHERE telegramId = ?').get(telegramId) as User | null;
    
    if (user) {
      // Преобразуем избранное из JSON в объект
      if (user.favorites && typeof user.favorites === 'string') {
        try {
          user.favorites = JSON.parse(user.favorites);
        } catch (e) {
          console.error(`Ошибка при разборе favorites для пользователя ${user.id}:`, e);
          user.favorites = { articles: [], services: [], specialists: [] };
        }
      } else if (!user.favorites) {
        user.favorites = { articles: [], services: [], specialists: [] };
      }
      
      // Обрабатываем роли
      if (user.roles && typeof user.roles === 'string') {
        try {
          user.roles = JSON.parse(user.roles);
        } catch (e) {
          console.error(`Ошибка при разборе roles для пользователя ${user.id}:`, e);
          user.roles = [user.role.toLowerCase()];
        }
      } else {
        // Если поля roles нет, используем основную роль
        user.roles = [user.role.toLowerCase()];
      }
    }
    
    return user;
  },

  /**
   * Создать нового пользователя
   */
  create: (user: Partial<User>): User => {
    const id = user.id || uuidv4();
    const now = new Date().toISOString();
    
    // Обрабатываем избранное
    let favoritesJson = null;
    if (user.favorites) {
      try {
        // Если избранное - объект, преобразуем в JSON строку
        if (typeof user.favorites === 'object') {
          favoritesJson = JSON.stringify(user.favorites);
        } 
        // Если уже строка, используем как есть
        else if (typeof user.favorites === 'string') {
          favoritesJson = user.favorites;
        }
      } catch (e) {
        console.error(`Ошибка при сериализации favorites для нового пользователя:`, e);
        favoritesJson = JSON.stringify({ articles: [], services: [], specialists: [] });
      }
    }
    
    // Обрабатываем роли
    let rolesJson = null;
    let primaryRole = user.role || 'user';
    
    if (user.roles) {
      try {
        // Если роли переданы как массив
        if (Array.isArray(user.roles)) {
          // Определяем основную роль по приоритету
          const normalizedRoles = user.roles.map(r => r.toLowerCase());
          
          if (normalizedRoles.includes('admin')) {
            primaryRole = 'admin';
          } else if (normalizedRoles.includes('specialist')) {
            primaryRole = 'specialist';
          } else if (normalizedRoles.includes('user')) {
            primaryRole = 'user';
          } else if (normalizedRoles.length > 0) {
            primaryRole = normalizedRoles[0];
          }
          
          rolesJson = JSON.stringify(normalizedRoles);
        }
        // Если роли переданы как JSON строка
        else if (typeof user.roles === 'string') {
          rolesJson = user.roles;
          // Пытаемся определить основную роль из JSON
          const parsedRoles = JSON.parse(user.roles);
          if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
            const normalizedRoles = parsedRoles.map((r: string) => r.toLowerCase());
            if (normalizedRoles.includes('admin')) {
              primaryRole = 'admin';
            } else if (normalizedRoles.includes('specialist')) {
              primaryRole = 'specialist';
            } else if (normalizedRoles.includes('user')) {
              primaryRole = 'user';
            } else {
              primaryRole = normalizedRoles[0];
            }
          }
        }
      } catch (e) {
        console.error(`Ошибка при обработке ролей для нового пользователя:`, e);
        rolesJson = JSON.stringify([primaryRole]);
      }
    } else {
      // Если роли не указаны, создаем массив из одной основной роли
      rolesJson = JSON.stringify([primaryRole.toLowerCase()]);
    }
    
    const newUser: User = {
      id,
      email: user.email || null,
      password: user.password || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      phone: user.phone || null,
      avatar: user.avatar || null,
      photo: user.photo || null,
      photo_url: user.photo_url || null,
      role: primaryRole,
      roles: Array.isArray(user.roles) ? user.roles : [primaryRole.toLowerCase()],
      favorites: user.favorites || { articles: [], services: [], specialists: [] },
      telegramId: user.telegramId || null,
      telegramUsername: user.telegramUsername || null,
      referralCode: user.referralCode || null,
      referredById: user.referredById || null,
      createdAt: now,
      updatedAt: now
    };
    
    db.prepare(`
      INSERT INTO users (
        id, email, password, firstName, lastName, 
        phone, avatar, photo, photo_url, role, favorites, roles, telegramId, telegramUsername, createdAt, updatedAt, referralCode, referredById
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newUser.id,
      newUser.email,
      newUser.password,
      newUser.firstName,
      newUser.lastName,
      newUser.phone,
      newUser.avatar,
      newUser.photo,
      newUser.photo_url,
      newUser.role,
      favoritesJson,
      rolesJson,
      newUser.telegramId,
      newUser.telegramUsername,
      newUser.createdAt,
      newUser.updatedAt,
      newUser.referralCode,
      newUser.referredById
    );
    
    return newUser;
  },

  /**
   * Обновить пользователя
   */
  update: (id: string, user: Partial<User>): User | null => {
    const currentUser = usersAPI.getById(id);
    
    if (!currentUser) {
      return null;
    }
    
    // Подготавливаем избранное
    let favoritesJson = null;
    if (user.favorites !== undefined) {
      try {
        // Если избранное передано как объект, сериализуем его
        if (typeof user.favorites === 'object') {
          favoritesJson = JSON.stringify(user.favorites);
        }
        // Если избранное уже в виде JSON строки, используем как есть
        else if (typeof user.favorites === 'string') {
          favoritesJson = user.favorites;
        }
        // В остальных случаях оставляем как было
        else {
          favoritesJson = currentUser.favorites && typeof currentUser.favorites === 'object' 
            ? JSON.stringify(currentUser.favorites) 
            : currentUser.favorites;
        }
      } catch (e) {
        console.error('Ошибка при обработке избранного:', e);
        // Если ошибка, сохраняем текущее значение
        favoritesJson = currentUser.favorites && typeof currentUser.favorites === 'object' 
          ? JSON.stringify(currentUser.favorites) 
          : currentUser.favorites;
      }
    } else {
      // Если избранное не передано, сохраняем текущее значение
      favoritesJson = currentUser.favorites && typeof currentUser.favorites === 'object' 
        ? JSON.stringify(currentUser.favorites) 
        : currentUser.favorites;
    }
    
    // Подготавливаем роли
    let rolesJson = null;
    if (user.roles !== undefined) {
      try {
        // Если роли переданы как массив, сериализуем
        if (Array.isArray(user.roles)) {
          rolesJson = JSON.stringify(user.roles);
        }
        // Если роли уже в виде JSON строки, используем как есть
        else if (typeof user.roles === 'string') {
          rolesJson = user.roles;
        }
        // В остальных случаях оставляем как было
        else {
          rolesJson = currentUser.roles && Array.isArray(currentUser.roles)
            ? JSON.stringify(currentUser.roles)
            : JSON.stringify([currentUser.role.toLowerCase()]);
        }
      } catch (e) {
        console.error('Ошибка при обработке ролей:', e);
        rolesJson = JSON.stringify([currentUser.role.toLowerCase()]);
      }
    } else {
      // Если роли не переданы, сохраняем текущее значение
      rolesJson = currentUser.roles && Array.isArray(currentUser.roles)
        ? JSON.stringify(currentUser.roles)
        : JSON.stringify([currentUser.role.toLowerCase()]);
    }
    
    // Если передана основная роль, используем её
    // Иначе берем первую роль из массива или оставляем текущую
    let primaryRole = user.role;
    if (!primaryRole && user.roles) {
      // Если передан массив ролей, выбираем главную роль по приоритету
      if (Array.isArray(user.roles) && user.roles.length > 0) {
        // Приводим все роли к нижнему регистру
        const normalizedRoles = user.roles.map(r => r.toLowerCase());
        
        // Определяем основную роль по приоритету: admin > specialist > user
        if (normalizedRoles.includes('admin')) {
          primaryRole = 'admin';
        } else if (normalizedRoles.includes('specialist')) {
          primaryRole = 'specialist';
        } else if (normalizedRoles.includes('user')) {
          primaryRole = 'user';
        } else {
          // Если не найдены известные роли, берем первую из массива
          primaryRole = normalizedRoles[0];
        }
      }
    }
    
    const now = new Date().toISOString();
    
    const updatedUser: User = {
      ...currentUser,
      ...user,
      id, // Сохраняем исходный ID
      role: primaryRole || currentUser.role, // Устанавливаем основную роль
      favorites: user.favorites || currentUser.favorites,
      telegramId: user.telegramId || currentUser.telegramId,
      telegramUsername: user.telegramUsername || currentUser.telegramUsername,
      updatedAt: now
    };
    
    // Если роли переданы, обновляем их
    if (user.roles) {
      updatedUser.roles = Array.isArray(user.roles) ? user.roles : JSON.parse(rolesJson);
    }
    
    db.prepare(`
      UPDATE users
      SET email = ?,
          password = ?,
          firstName = ?,
          lastName = ?,
          phone = ?,
          avatar = ?,
          photo = ?,
          photo_url = ?,
          role = ?,
          favorites = ?,
          roles = ?,
          telegramId = ?,
          telegramUsername = ?,
          updatedAt = ?,
          referralCode = ?,
          referredById = ?
      WHERE id = ?
    `).run(
      updatedUser.email,
      updatedUser.password,
      updatedUser.firstName,
      updatedUser.lastName,
      updatedUser.phone,
      updatedUser.avatar,
      updatedUser.photo,
      updatedUser.photo_url,
      updatedUser.role,
      favoritesJson,
      rolesJson,
      updatedUser.telegramId,
      updatedUser.telegramUsername,
      updatedUser.updatedAt,
      updatedUser.referralCode,
      updatedUser.referredById,
      id
    );
    
    return updatedUser;
  },

  /**
   * Удалить пользователя
   */
  delete: (id: string): boolean => {
    try {
      // Получаем данные пользователя перед удалением
      const user = usersAPI.getById(id);
      if (!user) {
        return false;
      }

      // Удаляем аватар пользователя, если он есть
      if (user.avatar) {
        deleteUserAvatar(user.avatar);
      }

      // Удаляем пользователя
      const result = db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Ошибка при удалении пользователя (ID: ${id}):`, error);
      return false;
    }
  },

  /**
   * Поиск пользователей
   */
  search: (query: string): User[] => {
    const users = db.prepare(`
      SELECT * FROM users
      WHERE firstName LIKE ? OR lastName LIKE ? OR email LIKE ?
      ORDER BY createdAt DESC
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as User[];
    
    // Преобразуем строковое представление избранного в объект для всех пользователей
    return users.map(user => {
      if (user.favorites && typeof user.favorites === 'string') {
        try {
          user.favorites = JSON.parse(user.favorites);
        } catch (e) {
          console.error(`Ошибка при разборе favorites для пользователя ${user.id}:`, e);
          user.favorites = { articles: [], services: [], specialists: [] };
        }
      } else if (!user.favorites) {
        user.favorites = { articles: [], services: [], specialists: [] };
      }
      return user;
    });
  },
  
  /**
   * Обновить время последнего входа пользователя
   */
  updateLastLogin: (id: string): boolean => {
    try {
      const now = new Date().toISOString();
      const result = db.prepare(`
        UPDATE users
        SET lastLogin = ?
        WHERE id = ?
      `).run(now, id);
      
      return result.changes > 0;
    } catch (error) {
      console.error(`Ошибка при обновлении времени последнего входа (ID: ${id}):`, error);
      return false;
    }
  }
};

/**
 * Нормализует роли пользователя из различных форматов в массив строк в нижнем регистре
 * Эта функция не зависит от базы данных и может быть использована на клиенте
 */
export function normalizeUserRoles(user: any): string[] {
  // Если роли уже представлены как массив
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.map((role: string) => role.toLowerCase());
  }
  
  // Если роли хранятся как JSON строка
  if (user.roles && typeof user.roles === 'string') {
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
  if (user.role && typeof user.role === 'string') {
    return [user.role.toLowerCase()];
  }
  
  // По умолчанию возвращаем роль 'user'
  return ['user'];
}

// Функция для определения основной роли по приоритету
export function getPrimaryRole(roles: string[]): string {
  // Нормализация ролей
  const normalizedRoles = roles.map((r: string) => r.toLowerCase());
  
  // Определяем по приоритету
  if (normalizedRoles.includes('admin')) {
    return 'admin';
  } else if (normalizedRoles.includes('specialist')) {
    return 'specialist';
  } else if (normalizedRoles.includes('user')) {
    return 'user';
  } else if (normalizedRoles.length > 0) {
    return normalizedRoles[0];
  }
  
  // По умолчанию
  return 'user';
}

// Функция для удаления аватара пользователя
function deleteUserAvatar(avatarPath: string): boolean {
  try {
    if (!avatarPath || avatarPath.startsWith('http') || avatarPath.includes('placeholder')) {
      return false; // Пропускаем внешние изображения и плейсхолдеры
    }
    
    // Преобразуем URL в путь к файлу
    const filePath = path.join(process.cwd(), 'public', avatarPath);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.warn(`Файл для удаления не найден: ${filePath}`);
      return false;
    }
    
    // Удаляем файл
    fs.unlinkSync(filePath);
    console.log(`Аватар пользователя успешно удален: ${filePath}`);
    return true;
  } catch (error) {
    console.error('Ошибка при удалении аватара пользователя:', error);
    return false;
  }
} 