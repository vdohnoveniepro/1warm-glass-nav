import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, UserRole } from '@/models/types';
import { verifyToken, createToken } from '@/lib/auth';
import { usersAdapter } from '@/database/adapters';
import { initDB } from '@/app/api/db';
import { processImageFromBase64, saveOriginalImage } from '@/lib/imageProcessing';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/lib/auth';
import { db, getDb } from '@/lib/db';
import { User } from '@/models/types';
import jwt from 'jsonwebtoken';

// Секрет для подписи токенов JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Кеш для хранения результатов авторизации
const authCache = new Map<string, { response: any, timestamp: number }>();
const AUTH_CACHE_TTL = 10000; // 10 секунд (миллисекунды)

// Инициализируем базу данных
initDB();

export async function GET(req: NextRequest) {
  try {
    console.log('[/api/auth/me] Начало обработки запроса');
    
    // Создаем ключ кеша на основе URL и куки авторизации
    const authCookie = req.cookies.get('auth_token')?.value || '';
    const clientAuthCookie = req.cookies.get('client_auth_token')?.value || '';
    const cacheKey = `${authCookie || clientAuthCookie}`;
    
    // Проверяем, есть ли закешированный результат
    const now = Date.now();
    const cachedResult = authCache.get(cacheKey);
    
    if (cachedResult && (now - cachedResult.timestamp < AUTH_CACHE_TTL)) {
      console.log('[/api/auth/me] Возвращаем кешированный результат');
      return cachedResult.response;
    }
    
    // Очищаем устаревшие записи в кеше
    for (const [key, value] of authCache.entries()) {
      if (now - value.timestamp > AUTH_CACHE_TTL) {
        authCache.delete(key);
      }
    }
    
    // Проверяем наличие токена в куках или заголовке
    const authHeader = req.headers.get('Authorization');
    
    const hasCookie = !!(authCookie || clientAuthCookie);
    const hasHeader = !!(authHeader && authHeader.startsWith('Bearer '));
    
    let token = null;
    if (hasHeader) {
      token = authHeader?.substring(7);
    } else if (hasCookie) {
      token = authCookie || clientAuthCookie;
    }
    
    console.log('[/api/auth/me] Проверка авторизации:', { 
      hasCookie, 
      hasHeader, 
      cookieLength: token?.length 
    });
    
    // Если токен найден, пытаемся его проверить
    if (token) {
      try {
        // Проверяем JWT токен
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string } | { user: { id: string; email: string } };
        
        // Определяем ID пользователя из токена (поддерживаем оба формата токенов)
        const userId = 'user' in decoded ? decoded.user.id : decoded.id;
        
        if (userId) {
          // Получаем пользователя по ID из токена
          try {
            const database = await getDb();
            
            // Пропускаем проверку структуры таблицы users
            console.log('[/api/auth/me] Получаем пользователя по ID:', userId);
            
            // Используем prepare и get вместо прямого вызова get
            const stmt = database.prepare('SELECT * FROM users WHERE id = ?');
            const user = stmt.get(userId);
            
            if (user) {
              console.log('[/api/auth/me] Пользователь найден через токен:', {
                id: user.id,
                email: user.email,
                role: user.role,
                photo: user.photo ? 'есть' : 'нет'
              });
              
              // Проверяем, есть ли у пользователя специалист
              let specialistId = user.specialistId;
              
              if (!specialistId && user.id) {
                try {
                  // Пытаемся найти специалиста, связанного с пользователем
                  const specialistStmt = database.prepare('SELECT id FROM specialists WHERE userId = ?');
                  const specialist = specialistStmt.get(user.id);
                  
                  if (specialist) {
                    console.log('[/api/auth/me] Найден связанный специалист:', specialist.id);
                    specialistId = specialist.id;
                    
                    // Обновляем пользователя с ID специалиста
                    const updateStmt = database.prepare('UPDATE users SET specialistId = ? WHERE id = ?');
                    updateStmt.run(specialistId, user.id);
                    
                    // Обновляем объект пользователя
                    user.specialistId = specialistId;
                  }
                } catch (dbError) {
                  console.error('[/api/auth/me] Ошибка при поиске специалиста:', dbError);
                }
              }
              
              // Получаем избранное пользователя
              let favorites = {
                articles: [] as string[],
                services: [] as string[],
                specialists: [] as string[]
              };
              
              try {
                // Проверяем существование таблиц избранного
                const tablesExistStmt = database.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`);
                const tablesExist = {
                  articles: tablesExistStmt.get('user_favorite_articles'),
                  services: tablesExistStmt.get('user_favorite_services'),
                  specialists: tablesExistStmt.get('user_favorite_specialists')
                };
                
                console.log('[/api/auth/me] Проверка таблиц избранного:', {
                  articles: !!tablesExist.articles,
                  services: !!tablesExist.services,
                  specialists: !!tablesExist.specialists
                });
                
                // Получаем избранные статьи, если таблица существует
                if (tablesExist.articles) {
                  try {
                    const articlesStmt = database.prepare('SELECT articleId FROM user_favorite_articles WHERE userId = ?');
                    const favoriteArticles = articlesStmt.all(user.id) || [];
                    
                    favorites.articles = favoriteArticles.map(item => item.articleId);
                  } catch (error) {
                    console.error('[/api/auth/me] Ошибка при загрузке избранных статей:', error);
                  }
                }
                
                // Получаем избранные услуги, если таблица существует
                if (tablesExist.services) {
                  try {
                    const servicesStmt = database.prepare('SELECT serviceId FROM user_favorite_services WHERE userId = ?');
                    const favoriteServices = servicesStmt.all(user.id) || [];
                    
                    favorites.services = favoriteServices.map(item => item.serviceId);
                  } catch (error) {
                    console.error('[/api/auth/me] Ошибка при загрузке избранных услуг:', error);
                  }
                }
                
                // Получаем избранных специалистов, если таблица существует
                if (tablesExist.specialists) {
                  try {
                    const specialistsStmt = database.prepare('SELECT specialistId FROM user_favorite_specialists WHERE userId = ?');
                    const favoriteSpecialists = specialistsStmt.all(user.id) || [];
                    
                    favorites.specialists = favoriteSpecialists.map(item => item.specialistId);
                  } catch (error) {
                    console.error('[/api/auth/me] Ошибка при загрузке избранных специалистов:', error);
                  }
                }
                
                console.log('[/api/auth/me] Загружено избранное:', {
                  articles: favorites.articles.length,
                  services: favorites.services.length,
                  specialists: favorites.specialists.length
                });
              } catch (dbError) {
                console.error('[/api/auth/me] Ошибка при загрузке избранного:', dbError);
                // В случае ошибки используем пустые массивы
                favorites = {
                  articles: [],
                  services: [],
                  specialists: []
                };
              }
              
              // Добавляем избранное к пользователю
              const userWithFavorites = {
                ...user,
                favorites
              };
              
              // Проверяем наличие аватара из Telegram и добавляем его в ответ
              try {
                // Проверяем, есть ли у пользователя telegramId
                if (user.telegramId) {
                  // Если у пользователя нет аватара, но есть photo_url в базе, добавляем его
                  if (user.photo_url) {
                    userWithFavorites.photo_url = user.photo_url;
                    console.log('[/api/auth/me] Добавлен photo_url из Telegram:', user.photo_url);
                  }
                  // Если аватар есть в photo или avatar, но нет в photo_url, копируем его
                  else if (!user.photo_url && (user.avatar || user.photo)) {
                    userWithFavorites.photo_url = user.avatar || user.photo;
                  }
                }
              } catch (avatarError) {
                console.error('[/api/auth/me] Ошибка при обработке аватара Telegram:', avatarError);
              }
              
              // Специальная обработка для пользователя с ID b402d7bd-8b0a-4ff6-9c84-c267709b92bc
              if (user.id === 'b402d7bd-8b0a-4ff6-9c84-c267709b92bc') {
                console.log('[/api/auth/me] Обнаружен специальный пользователь с ID b402d7bd-8b0a-4ff6-9c84-c267709b92bc, устанавливаем роль admin');
                userWithFavorites.role = 'admin';
                
                // Убедимся, что у пользователя есть массив ролей с admin
                if (!userWithFavorites.roles) {
                  userWithFavorites.roles = ['user', 'admin'];
                } else if (Array.isArray(userWithFavorites.roles) && !userWithFavorites.roles.includes('admin')) {
                  userWithFavorites.roles.push('admin');
                } else if (typeof userWithFavorites.roles === 'string') {
                  try {
                    const rolesArray = JSON.parse(userWithFavorites.roles);
                    if (Array.isArray(rolesArray) && !rolesArray.includes('admin')) {
                      rolesArray.push('admin');
                      userWithFavorites.roles = rolesArray;
                    }
                  } catch (e) {
                    userWithFavorites.roles = ['user', 'admin'];
                  }
                }
                
                console.log('[/api/auth/me] Установлены права администратора:', { 
                  role: userWithFavorites.role,
                  roles: userWithFavorites.roles
                });
              }
              
              // Специальная обработка для пользователя bakeevd@yandex.ru
              if (user.email === 'bakeevd@yandex.ru' || user.email === 'bak@ya.ru') {
                console.log('[/api/auth/me] Обнаружен специальный пользователь, устанавливаем роль admin');
                userWithFavorites.role = 'admin';
                
                // Убедимся, что у пользователя есть массив ролей с admin
                if (!userWithFavorites.roles) {
                  userWithFavorites.roles = ['user', 'admin'];
                } else if (Array.isArray(userWithFavorites.roles) && !userWithFavorites.roles.includes('admin')) {
                  userWithFavorites.roles.push('admin');
                } else if (typeof userWithFavorites.roles === 'string') {
                  try {
                    const rolesArray = JSON.parse(userWithFavorites.roles);
                    if (Array.isArray(rolesArray) && !rolesArray.includes('admin')) {
                      rolesArray.push('admin');
                      userWithFavorites.roles = rolesArray;
                    }
                  } catch (e) {
                    userWithFavorites.roles = ['user', 'admin'];
                  }
                }
              }
              
              // Получаем бонусный баланс пользователя
              try {
                // Проверяем существование таблицы bonus_transactions
                const bonusTableStmt = database.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`);
                const tableExists = bonusTableStmt.get('bonus_transactions');
                
                if (tableExists) {
                  try {
                    // Получаем сумму бонусов пользователя
                    const bonusStmt = database.prepare(`SELECT SUM(amount) as total FROM bonus_transactions WHERE userId = ?`);
                    const bonusResult = bonusStmt.get(user.id);
                    
                    if (bonusResult && bonusResult.total !== null) {
                      userWithFavorites.bonusBalance = bonusResult.total;
                      console.log('[/api/auth/me] Бонусный баланс пользователя:', bonusResult.total);
                    } else {
                      // Если бонусы отсутствуют, устанавливаем значение 0
                      userWithFavorites.bonusBalance = 0;
                      console.log('[/api/auth/me] Бонусный баланс пользователя отсутствует, установлено значение 0');
                    }
                  } catch (bonusError) {
                    // Обрабатываем ошибку запроса бонусов
                    console.error('[/api/auth/me] Ошибка при запросе бонусов:', bonusError);
                    userWithFavorites.bonusBalance = 0;
                  }
                } else {
                  // Если таблица не существует, устанавливаем значение 0
                  userWithFavorites.bonusBalance = 0;
                  console.log('[/api/auth/me] Таблица bonus_transactions не существует, бонусный баланс установлен в 0');
                }
              } catch (dbError) {
                console.error('[/api/auth/me] Ошибка при загрузке бонусного баланса:', dbError);
                // В случае ошибки устанавливаем значение 0
                userWithFavorites.bonusBalance = 0;
              }
              
              // Формируем ответ с токеном и пользователем
              const response = NextResponse.json({
                success: true,
                data: {
                  user: userWithFavorites,
                  token: token
                }
              });
              
              // Сохраняем ответ в кеш
              authCache.set(cacheKey, { response, timestamp: Date.now() });
              
              return response;
            } else {
              console.log('[/api/auth/me] Пользователь не найден по ID из токена:', userId);
            }
          } catch (dbError) {
            console.error('[/api/auth/me] Ошибка при доступе к базе данных:', dbError);
          }
        }
      } catch (error) {
        console.error('[/api/auth/me] Ошибка при проверке JWT токена:', error);
        console.log('[/api/auth/me] Невалидный токен, пользователь не авторизован');
      }
    }
    
    // Если токен отсутствует или не валиден, возвращаем ошибку
    const errorResponse = NextResponse.json({
      success: false,
      error: { message: 'Пользователь не авторизован' }
    }, { status: 401 });
    
    // Сохраняем отрицательный результат в кеш
    authCache.set(cacheKey, { response: errorResponse, timestamp: Date.now() });
    
    return errorResponse;
  } catch (error) {
    console.error('[/api/auth/me] Ошибка при получении текущего пользователя:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Ошибка при получении данных пользователя' }
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[API /auth/me] Получен POST запрос на обновление пользователя');
    
    // Проверяем наличие токена в куках или заголовке
    const authCookie = req.cookies.get('auth_token');
    const clientAuthCookie = req.cookies.get('client_auth_token');
    const authHeader = req.headers.get('Authorization');
    
    const hasCookie = !!(authCookie || clientAuthCookie);
    const hasHeader = !!(authHeader && authHeader.startsWith('Bearer '));
    
    let token = null;
    if (hasHeader) {
      token = authHeader?.substring(7);
    } else if (hasCookie) {
      token = authCookie?.value || clientAuthCookie?.value;
    }
    
    console.log('[API /auth/me] Проверка токенов:', { 
      hasCookie, 
      hasHeader, 
      cookieLength: token?.length 
    });
    
    // Если токен не найден, возвращаем ошибку
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Пользователь не авторизован' 
      }, { status: 401 });
    }
    
    // Проверяем JWT токен
    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      userId = decoded.id;
      console.log('[API /auth/me] Токен валиден, ID пользователя:', userId);
    } catch (error) {
      console.error('[API /auth/me] Ошибка при проверке JWT токена:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Невалидный токен авторизации' 
      }, { status: 401 });
    }
    
    // Получаем данные для обновления
    const data = await req.json();
    console.log('[API /auth/me] Данные для обновления:', data);
    
    // Проверяем, что данные содержат только разрешенные поля
    const allowedFields = ['firstName', 'lastName', 'phone', 'photo', 'email'];
    const updateData: Partial<User> = {};
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field as keyof User] = data[field];
      }
    }
    
    // Если нет данных для обновления, возвращаем ошибку
    if (Object.keys(updateData).length === 0) {
      console.log('[API /auth/me] Нет данных для обновления');
      return NextResponse.json({ 
        success: false, 
        error: 'Нет данных для обновления' 
      }, { status: 400 });
    }
    
    // Обновляем пользователя в базе данных
    try {
      const database = await getDb();
      
      // Проверяем, что пользователь существует
      const existingUser = await database.get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!existingUser) {
        return NextResponse.json({ 
          success: false, 
          error: 'Пользователь не найден' 
        }, { status: 404 });
      }
      
      // Проверяем валидность email, если он передан
      if (updateData.email) {
        // Используем более простую проверку email
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(updateData.email)) {
          console.log('[API /auth/me] Неверный формат email:', updateData.email);
          return NextResponse.json({ 
            success: false, 
            error: 'Неверный формат email' 
          }, { status: 400 });
        }
        
        // Проверяем, не занят ли email другим пользователем
        const userWithSameEmail = await database.get('SELECT id FROM users WHERE email = ? AND id != ?', [updateData.email, userId]);
        if (userWithSameEmail) {
          console.log('[API /auth/me] Email уже занят другим пользователем:', updateData.email);
          return NextResponse.json({ 
            success: false, 
            error: 'Этот email уже используется другим пользователем' 
          }, { status: 400 });
        }
      }
      
      console.log('[API /auth/me] Обновляем пользователя:', updateData);
      
      // Формируем запрос на обновление
      const fields = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
      const values = Object.values(updateData);
      
      // Добавляем ID пользователя в конец массива значений
      values.push(userId);
      
      // Выполняем запрос
      await database.run(
        `UPDATE users SET ${fields} WHERE id = ?`,
        values
      );
      
      console.log('[API /auth/me] Пользователь обновлен');
      
      // Получаем обновленного пользователя
      const updatedUser = await database.get(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      // Создаем новый токен
      const newToken = await createToken(updatedUser);
      
      // Формируем ответ
      return NextResponse.json({
        success: true,
        data: {
          user: updatedUser,
          token: newToken
        }
      });
    } catch (dbError) {
      console.error('[API /auth/me] Ошибка при обновлении пользователя:', dbError);
      return NextResponse.json({ 
        success: false, 
        error: 'Ошибка при обновлении пользователя' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[API /auth/me] Ошибка при обработке запроса:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка при обработке запроса' 
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    console.log('[API /auth/me] Получен PUT запрос на обновление пользователя');
    
    // Проверяем наличие токена в куках или заголовке
    const authCookie = req.cookies.get('auth_token');
    const clientAuthCookie = req.cookies.get('client_auth_token');
    const authHeader = req.headers.get('Authorization');
    
    const hasCookie = !!(authCookie || clientAuthCookie);
    const hasHeader = !!(authHeader && authHeader.startsWith('Bearer '));
    
    let token = null;
    if (hasHeader) {
      token = authHeader?.substring(7);
    } else if (hasCookie) {
      token = authCookie?.value || clientAuthCookie?.value;
    }
    
    console.log('[API /auth/me] Проверка токенов:', { 
      hasCookie, 
      hasHeader, 
      cookieLength: token?.length 
    });
    
    // Если токен не найден, возвращаем ошибку
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Пользователь не авторизован' 
      }, { status: 401 });
    }
    
    // Проверяем JWT токен
    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string } | { user: { id: string; email: string } };
      // Определяем ID пользователя из токена (поддерживаем оба формата токенов)
      userId = 'user' in decoded ? decoded.user.id : decoded.id;
      console.log('[API /auth/me] Токен валиден, ID пользователя:', userId);
    } catch (error) {
      console.error('[API /auth/me] Ошибка при проверке JWT токена:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Невалидный токен авторизации' 
      }, { status: 401 });
    }
    
    // Получаем данные для обновления
    const data = await req.json();
    console.log('[API /auth/me] Данные для обновления:', {
      ...data,
      currentPassword: data.currentPassword ? '********' : '',
      newPassword: data.newPassword ? '********' : '',
      photoBase64: data.photoBase64 ? 'имеется' : 'отсутствует'
    });
    
    // Проверяем, что данные содержат только разрешенные поля
    const allowedFields = ['firstName', 'lastName', 'phone', 'photo', 'email', 'avatar'];
    const updateData: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }
    
    // Обрабатываем фото в формате base64, если оно есть
    if (data.photoBase64) {
      try {
        const photoUrl = data.photoBase64;
        updateData.photo = photoUrl;
        updateData.avatar = photoUrl; // Дублируем фото в поле avatar для совместимости
      } catch (error) {
        console.error('[API /auth/me] Ошибка при обработке фото:', error);
      }
    }
    
    // Обрабатываем пароль, если он передан
    if (data.newPassword) {
      try {
        // Проверяем длину пароля
        if (data.newPassword.length < 4) {
          console.log('[API /auth/me] Пароль слишком короткий');
          return NextResponse.json({ 
            success: false, 
            error: 'Пароль должен содержать не менее 4 символов' 
          }, { status: 400 });
        }
        
        // Получаем пользователя из базы данных
        const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = userStmt.get(userId);
        
        // Проверяем, существует ли пользователь
        if (!user) {
          console.log('[API /auth/me] Пользователь не найден');
          return NextResponse.json({ 
            success: false, 
            error: 'Пользователь не найден' 
          }, { status: 404 });
        }
        
        // Хешируем новый пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.newPassword, salt);
        updateData.password = hashedPassword;
        
        console.log('[API /auth/me] Пароль успешно хеширован, длина хеша:', hashedPassword.length);
      } catch (hashError) {
        console.error('[API /auth/me] Ошибка при хешировании пароля:', hashError);
      }
    }
    
    // Если нет данных для обновления, возвращаем ошибку
    if (Object.keys(updateData).length === 0) {
      console.log('[API /auth/me] Нет данных для обновления');
      return NextResponse.json({ 
        success: false, 
        error: 'Нет данных для обновления' 
      }, { status: 400 });
    }
    
    console.log('[API /auth/me] Обновляем пользователя:', {
      ...updateData,
      password: updateData.password ? 'хешированный пароль' : undefined
    });
    
    // Обновляем пользователя в базе данных
    try {
      // Формируем запрос на обновление
      const fields = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
      const values = Object.values(updateData);
      
      // Создаем SQL запрос
      const sql = `UPDATE users SET ${fields} WHERE id = ?`;
      
      // Выполняем запрос с помощью prepared statement
      const updateStmt = db.prepare(sql);
      updateStmt.run(...values, userId);
      
      console.log('[API /auth/me] Пользователь обновлен');
      
      // Получаем обновленного пользователя
      const updatedUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const updatedUser = updatedUserStmt.get(userId);
      
      // Создаем новый токен
      const newToken = await createToken(updatedUser);
      
      // Формируем ответ
      return NextResponse.json({
        success: true,
        data: {
          user: {
            ...updatedUser,
            password: undefined // Не возвращаем пароль в ответе
          },
          token: newToken
        }
      });
    } catch (dbError) {
      console.error('[API /auth/me] Ошибка при обновлении пользователя:', dbError);
      return NextResponse.json({ 
        success: false, 
        error: 'Ошибка при обновлении пользователя' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[API /auth/me] Ошибка при обработке запроса:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Произошла ошибка при обновлении профиля' 
    }, { status: 500 });
  }
}