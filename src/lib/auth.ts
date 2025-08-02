import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { User, UserRole } from '@/models/types';
import { db } from '@/database/db';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/db';
import { JWT_SECRET_STRING } from '@/lib/constants';
import { initDB } from '@/app/api/db';

// Секрет для подписи токенов JWT
const JWT_SECRET_STRING_JOSE = process.env.JWT_SECRET || 'your-secret-key';
const JWT_SECRET_JOSE = new TextEncoder().encode(JWT_SECRET_STRING_JOSE);
const TOKEN_EXPIRY = '30d'; // Срок действия токена - 30 дней

export interface Session {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  exp: number;
}

// Создание JWT-токена
export async function createToken(
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>,
  expiresIn: string = '7d'
): Promise<string> {
  const session = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };

  try {
    const token = await new SignJWT(session)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn) // Используем переданный срок действия
      .sign(JWT_SECRET_JOSE);
    
    return token;
  } catch (error) {
    console.error('[createToken] Ошибка при создании токена:', error);
    
    // Запасной вариант с использованием jsonwebtoken
    return jwt.sign(session, JWT_SECRET_STRING_JOSE, { expiresIn });
  }
}

// Проверка JWT-токена
export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_JOSE);
    // Добавляем явное приведение типов
    return payload as unknown as Session;
  } catch (error) {
    return null;
  }
}

// Установка cookie с токеном - только на стороне сервера
export async function setAuthCookie(token: string, user: Session['user']): Promise<void> {
  try {
    const cookieStore = await cookies();
    
    // Определяем домен для куки в зависимости от среды
    const options = {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      sameSite: 'lax' as const, // Для работы с перенаправлениями
    };
    
    console.log('[setAuthCookie] Установка кук для пользователя:', user.email);
    console.log('[setAuthCookie] Опции для cookie:', JSON.stringify(options, null, 2));
    
    // Устанавливаем auth_token
    cookieStore.set('auth_token', token, options);
    
    // Добавляем также user_email для дополнительной проверки
    cookieStore.set('user_email', user.email, options);
    
    console.log('[setAuthCookie] Куки успешно установлены');
  } catch (error) {
    console.error('[setAuthCookie] Ошибка при установке кук:', error);
  }
}

// Удаление cookie с токеном - только на стороне сервера
export async function removeAuthCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
    cookieStore.delete('user_email');
    console.log('[removeAuthCookie] Куки авторизации удалены');
  } catch (error) {
    console.error('[removeAuthCookie] Ошибка при удалении кук:', error);
  }
}

// Кеш для хранения результатов авторизации
const authCache = new Map<string, { user: User | null, timestamp: number }>();
const AUTH_CACHE_TTL = 10000; // 10 секунд (милисекунды)

// Получение текущего пользователя из сессии - для использования в API маршрутах
export async function getCurrentUser(request?: NextRequest) {
  try {
    // Получаем куки
    let token = null;
    let cookieInfo = {};
    let authHeader = null;
    let isTelegramApp = false;
    
    if (request) {
      // Если передан объект запроса, получаем куки и заголовки из него
      const authCookie = request.cookies.get('auth_token');
      const clientAuthCookie = request.cookies.get('client_auth_token');
          token = authCookie?.value || clientAuthCookie?.value;
          
      // Получаем заголовок авторизации
      authHeader = request.headers.get('Authorization');
      
      // Проверяем заголовок X-Telegram-App для запросов из Telegram Mini App
      isTelegramApp = request.headers.get('X-Telegram-App') === 'true';
      
      cookieInfo = {
            hasAuthCookie: !!authCookie, 
            hasClientAuthCookie: !!clientAuthCookie,
        authCookieLength: authCookie?.value?.length,
        clientAuthCookieLength: clientAuthCookie?.value?.length,
        hasAuthHeader: !!authHeader,
        isTelegramApp
      };
      
      console.log('[getCurrentUser] Проверка запроса:', {
        url: request.url,
        method: request.method,
        isTelegramApp,
        hasAuthHeader: !!authHeader,
        hasCookies: !!authCookie || !!clientAuthCookie
      });
    } else {
      // Если запрос не передан, используем серверные куки
      const cookieStore = await cookies();
      const authCookie = cookieStore.get('auth_token');
      const clientAuthCookie = cookieStore.get('client_auth_token');
      token = authCookie?.value || clientAuthCookie?.value;
      
      cookieInfo = {
        hasCookie: !!authCookie || !!clientAuthCookie,
        hasHeader: false,
        cookieLength: token?.length
      };
    }
    
    console.log('[getCurrentUser] Проверка куки из NextRequest:', cookieInfo);
    
    // Проверяем заголовок Authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('[getCurrentUser] Токен получен из заголовка Authorization');
    }
    
    // Если токен не найден ни в куках, ни в заголовках
    if (!token) {
      console.log('[getCurrentUser] Токен не найден в куки или заголовках');
      return null;
    }
    
    console.log('[getCurrentUser] Проверка JWT токена, длина:', token.length);
    
    // Декодируем токен
    try {
      const decoded = jwt.verify(token, JWT_SECRET_STRING);
      console.log('[getCurrentUser] Токен декодирован успешно, userId:', (decoded as any).user?.id || (decoded as any).id);
      
      // Определяем ID пользователя из токена
      const userId = (decoded as any).user?.id || (decoded as any).id;
      
      if (!userId) {
        console.log('[getCurrentUser] ID пользователя не найден в токене');
        return null;
      }
      
      // Инициализируем базу данных
      initDB();
      
      try {
        // Получаем пользователя из базы данных
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = stmt.get(userId);
        
        if (!user) {
          console.log('[getCurrentUser] Пользователь не найден в базе данных');
          return null;
        }
        
        // Проверяем, есть ли заголовок Telegram
        if (isTelegramApp || (request && request.headers.get('X-Telegram-App') === 'true')) {
          console.log('[getCurrentUser] Запрос из Telegram Mini App для пользователя:', user.email);
          
          // Для пользователей в Telegram Mini App всегда устанавливаем правильные роли
          if (user.email === 'bakeevd@yandex.ru' || user.email === 'bak@ya.ru' || 
              (user.email && user.email.endsWith('@telegram.org') && 
               (user.role === 'admin' || (user.roles && user.roles.includes('admin'))))) {
            user.role = 'admin';
            if (!user.roles || !Array.isArray(user.roles)) {
              user.roles = ['user', 'admin'];
            } else if (!user.roles.includes('admin')) {
              user.roles.push('admin');
            }
            console.log('[getCurrentUser] Установлены админ-права для пользователя в Telegram:', user.email);
          }
        }
        
        // Специальная обработка для пользователя bakeevd@yandex.ru
        if (user.email === 'bakeevd@yandex.ru') {
          console.log('[getCurrentUser] Обнаружен специальный пользователь bakeevd@yandex.ru, устанавливаем роль ADMIN');
          user.role = 'admin';
          // Убедимся, что у пользователя есть массив ролей с admin
          if (!user.roles) {
            user.roles = ['user', 'admin'];
          } else if (Array.isArray(user.roles) && !user.roles.includes('admin')) {
            user.roles.push('admin');
          } else if (typeof user.roles === 'string') {
            user.roles = [user.roles, 'admin'];
          }
        }
        
        // Специальная обработка для пользователя bak@ya.ru
        if (user.email === 'bak@ya.ru') {
          console.log('[getCurrentUser] Обнаружен специальный пользователь bak@ya.ru, устанавливаем роль ADMIN');
          user.role = 'admin';
          // Убедимся, что у пользователя есть массив ролей с admin
          if (!user.roles) {
            user.roles = ['user', 'admin'];
          } else if (Array.isArray(user.roles) && !user.roles.includes('admin')) {
            user.roles.push('admin');
          } else if (typeof user.roles === 'string') {
            user.roles = [user.roles, 'admin'];
          }
        }
        
        // Специальная обработка для пользователя с ID b402d7bd-8b0a-4ff6-9c84-c267709b92bc
        if (user.id === 'b402d7bd-8b0a-4ff6-9c84-c267709b92bc') {
          console.log('[getCurrentUser] Обнаружен специальный пользователь с ID b402d7bd-8b0a-4ff6-9c84-c267709b92bc, устанавливаем роль ADMIN');
          user.role = 'admin';
          // Убедимся, что у пользователя есть массив ролей с admin
          if (!user.roles) {
            user.roles = ['user', 'admin'];
          } else if (Array.isArray(user.roles) && !user.roles.includes('admin')) {
            user.roles.push('admin');
          } else if (typeof user.roles === 'string') {
            user.roles = [user.roles, 'admin'];
          }
        }
        
        // Загружаем избранное пользователя
        const hasFavoritesArticles = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_favorite_articles'").get();
        const hasFavoritesServices = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_favorite_services'").get();
        const hasFavoritesSpecialists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_favorite_specialists'").get();
        
        console.log('[getCurrentUser] Проверка таблиц избранного:', {
          articles: !!hasFavoritesArticles,
          services: !!hasFavoritesServices,
          specialists: !!hasFavoritesSpecialists
        });
        
        // Создаем объект для хранения избранного
        const favorites = {
          articles: [],
          services: [],
          specialists: []
        };
        
        // Загружаем избранные статьи
        if (hasFavoritesArticles) {
          try {
          const favoriteArticles = db.prepare('SELECT article_id FROM user_favorite_articles WHERE user_id = ?').all(userId);
          favorites.articles = favoriteArticles.map(item => item.article_id);
          } catch (error) {
            console.error('[getCurrentUser] Ошибка при загрузке избранных статей:', error);
          }
        }
        
        // Загружаем избранные услуги
        if (hasFavoritesServices) {
          try {
          const favoriteServices = db.prepare('SELECT service_id FROM user_favorite_services WHERE user_id = ?').all(userId);
          favorites.services = favoriteServices.map(item => item.service_id);
          } catch (error) {
            console.error('[getCurrentUser] Ошибка при загрузке избранных услуг:', error);
          }
        }
        
        // Загружаем избранных специалистов
        if (hasFavoritesSpecialists) {
          try {
          const favoriteSpecialists = db.prepare('SELECT specialist_id FROM user_favorite_specialists WHERE user_id = ?').all(userId);
          favorites.specialists = favoriteSpecialists.map(item => item.specialist_id);
          } catch (error) {
            console.error('[getCurrentUser] Ошибка при загрузке избранных специалистов:', error);
          }
        }
        
        console.log('[getCurrentUser] Загружено избранное:', {
          articles: favorites.articles.length,
          services: favorites.services.length,
          specialists: favorites.specialists.length
        });
        
        // Проверяем, есть ли у пользователя бонусный баланс
        let bonusBalance = 0;
        try {
          const bonusResult = db.prepare('SELECT balance FROM bonus_balances WHERE user_id = ?').get(userId);
          bonusBalance = bonusResult ? bonusResult.balance : 0;
        } catch (bonusError) {
          console.log('[getCurrentUser] Бонусный баланс пользователя отсутствует, установлено значение 0');
        }
        
        // Возвращаем пользователя с избранным
        return {
          ...user,
          favorites,
          bonusBalance
        };
      } catch (dbError) {
        console.error('[getCurrentUser] Ошибка при получении пользователя из базы данных:', dbError);
        return null;
      }
    } catch (jwtError) {
      console.error('[getCurrentUser] Ошибка при проверке JWT токена:', jwtError);
      return null;
    }
  } catch (error) {
    console.error('[getCurrentUser] Токен и email не найдены, пользователь не авторизован');
    return null;
  }
}

// Клиентская версия получения пользователя - для использования в клиентских компонентах
export async function getCurrentUserClient(): Promise<Session['user'] | null> {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    if (!data.success || !data.data.user) {
      return null;
    }
    
    return data.data.user;
  } catch (error) {
    console.error('[getCurrentUserClient] Ошибка при получении текущего пользователя:', error);
    return null;
  }
}

// Проверка пароля
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Хеширование пароля
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Регистрация пользователя
export async function registerUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<User | null> {
  try {
    // Получаем адаптер для работы с пользователями
    const { usersAdapter } = await import('@/database/adapters');
    
    // Проверяем, существует ли пользователь с таким email
    const existingUser = usersAdapter.getByEmail(userData.email);
    if (existingUser) {
      console.log(`Пользователь с email ${userData.email} уже существует`);
      return null;
    }

    // Хешируем пароль
    const hashedPassword = await hashPassword(userData.password);

    // Создаем пользователя через адаптер
    const newUser = usersAdapter.create({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      role: 'user' // По умолчанию - обычный пользователь
    });

    console.log(`Пользователь ${userData.email} успешно создан`);
    return newUser as unknown as User;
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    return null;
  }
}

// Аутентификация пользователя
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ token: string; user: Session['user'] } | null> {
  try {
    // Получаем адаптер для работы с пользователями
    const { usersAdapter } = await import('@/database/adapters');
    
    // Ищем пользователя по email
    const user = usersAdapter.getByEmail(email);
    if (!user) {
      console.log('[authenticateUser] Пользователь не найден:', email);
      return null;
    }

    // Проверяем пароль
    const isPasswordValid = await verifyPassword(password, user.password || '');
    if (!isPasswordValid) {
      console.log('[authenticateUser] Неверный пароль для пользователя:', email);
      return null;
    }

    const userData = {
      id: user.id,
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: (user.role as UserRole) || UserRole.USER,
    };

    // Генерируем токен
    const token = await createToken(userData);
    
    console.log('[authenticateUser] Успешная аутентификация пользователя:', email);

    return {
      token,
      user: userData,
    };
  } catch (error) {
    console.error('[authenticateUser] Ошибка при аутентификации:', error);
    return null;
  }
}

// Middleware для защиты маршрутов
export async function requireAuth(
  roles?: UserRole[] // Опциональные роли для проверки
) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    redirect('/not-authorized');
  }

  return user;
}

// Обновление времени последнего входа пользователя
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Обновляем поле lastLogin в таблице users
    db.prepare(`
      UPDATE users 
      SET lastLogin = ?, updatedAt = ?
      WHERE id = ?
    `).run(now, now, userId);
    
    console.log(`[updateLastLogin] Обновлено время последнего входа для пользователя ${userId}`);
  } catch (error) {
    console.error('[updateLastLogin] Ошибка при обновлении времени последнего входа:', error);
  }
} 