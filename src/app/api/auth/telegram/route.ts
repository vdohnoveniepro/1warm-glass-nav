import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, UserRole } from '@/models/types';
import { usersAPI } from '@/database/api/users';
import { createToken } from '@/lib/auth';
import { initDB } from '@/app/api/db';
import crypto from 'crypto';
import { TELEGRAM_BOT_TOKEN } from '@/lib/telegram-config';

// Инициализируем базу данных SQLite
initDB();

// Токен бота для проверки подписи
const BOT_TOKEN = TELEGRAM_BOT_TOKEN;

// Кеш для предотвращения повторной обработки одних и тех же запросов
const processedRequests = new Map<string, { timestamp: number, response: NextResponse }>();

// Время жизни кеша (5 минут)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Функция для проверки валидности данных от Telegram Mini App
 */
function isValidTelegramData(initData: string): boolean {
  try {
    // Разбираем строку initData на параметры
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) return false;
    
    // Удаляем hash из проверяемых данных
    params.delete('hash');
    
    // Сортируем параметры по ключу
    const sortedParams: [string, string][] = Array.from(params.entries()).sort();
    const dataCheckString = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');
    
    // Создаем HMAC-SHA256 с использованием токена бота
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    // Сравниваем вычисленный хеш с полученным
    return calculatedHash === hash;
  } catch (error) {
    console.error('Ошибка при проверке данных Telegram:', error);
    return false;
  }
}

/**
 * Функция для разбора данных пользователя из initData
 */
function parseTelegramUserData(initData: string): { id: string; username?: string; first_name?: string; last_name?: string; photo_url?: string } | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    
    if (!userStr) return null;
    
    return JSON.parse(decodeURIComponent(userStr));
  } catch (error) {
    console.error('Ошибка при разборе данных пользователя Telegram:', error);
    return null;
  }
}

/**
 * Очистка устаревших записей в кеше
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of processedRequests.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      processedRequests.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[/api/auth/telegram] Начало обработки запроса на авторизацию через Telegram');
    
    const body = await request.json();
    const { initData, referralCode } = body;

    console.log(`[/api/auth/telegram] Получены данные: ${initData ? 'данные присутствуют' : 'данные отсутствуют'}, реферальный код: ${referralCode || 'отсутствует'}`);

    // Проверяем наличие данных
    if (!initData) {
      console.log('[/api/auth/telegram] Ошибка: отсутствуют данные initData');
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Отсутствуют данные авторизации Telegram',
      }, { status: 400 });
    }

    // Создаем уникальный ключ для запроса
    const requestKey = crypto.createHash('md5').update(initData).digest('hex');
    
    // Периодически очищаем кеш
    cleanupCache();

    // Проверяем валидность данных
    if (!isValidTelegramData(initData)) {
      console.log('[/api/auth/telegram] Ошибка: недействительные данные Telegram');
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Недействительные данные авторизации Telegram',
      }, { status: 401 });
    }

    // Извлекаем данные пользователя
    const telegramUser = parseTelegramUserData(initData);
    
    if (!telegramUser || !telegramUser.id) {
      console.log('[/api/auth/telegram] Ошибка: не удалось получить данные пользователя Telegram');
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Не удалось получить данные пользователя Telegram',
      }, { status: 400 });
    }

    console.log(`[/api/auth/telegram] Данные пользователя Telegram: id=${telegramUser.id}, username=${telegramUser.username || 'отсутствует'}, photo_url=${telegramUser.photo_url ? 'имеется' : 'отсутствует'}`);

    // Проверяем, есть ли пользователь с таким Telegram ID в базе
    let user = usersAPI.findByTelegramId(telegramUser.id);

    if (!user) {
      console.log(`[/api/auth/telegram] Пользователь с Telegram ID ${telegramUser.id} не найден, создаем нового`);
      
      // Проверяем реферальный код, если он указан
      let referrerId = null;
      if (referralCode) {
        // Ищем пользователя с указанным реферальным кодом
        const users = usersAPI.getAll();
        console.log(`[/api/auth/telegram] Поиск пользователя с реферальным кодом ${referralCode}, найдено пользователей в базе:`, users.length);
        
        // @ts-ignore - в адаптере referralCode может быть добавлено дополнительно
        const referrer = users.find(u => u.referralCode === referralCode);
        
        if (referrer) {
          referrerId = referrer.id;
          console.log(`[/api/auth/telegram] Найден пригласивший пользователь с ID ${referrerId} по коду ${referralCode}`);
        } else {
          console.log(`[/api/auth/telegram] Пользователь с реферальным кодом ${referralCode} не найден в базе данных`);
        }
      }
      
      // Генерируем собственный реферальный код для нового пользователя
      const userReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      try {
      // Создаем нового пользователя
        console.log(`[/api/auth/telegram] Попытка создания пользователя с telegramId ${telegramUser.id}`);
      user = usersAPI.create({
        telegramId: telegramUser.id,
        telegramUsername: telegramUser.username,
        firstName: telegramUser.first_name || 'Пользователь',
        lastName: telegramUser.last_name || 'Telegram',
        role: UserRole.USER, // Устанавливаем роль USER для новых пользователей
        roles: [UserRole.USER.toLowerCase()], // Добавляем массив ролей для совместимости
        email: null, // Email может быть заполнен позже
        password: null, // Пароль не требуется для Telegram-авторизации
        photo: telegramUser.photo_url || null, // Сохраняем аватар пользователя
        avatar: telegramUser.photo_url || null,  // Дублируем в поле avatar для совместимости
          photo_url: telegramUser.photo_url || null,  // Явно сохраняем photo_url
          referralCode: userReferralCode, // Добавляем реферальный код
          referredById: referrerId // Добавляем ID пригласившего пользователя
      });
      
        console.log(`[/api/auth/telegram] Создан новый пользователь:`, JSON.stringify({
          id: user.id,
          role: user.role,
          telegramId: user.telegramId,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo ? 'присутствует' : 'отсутствует',
          referralCode: userReferralCode
        }, null, 2));
      } catch (createError) {
        console.error(`[/api/auth/telegram] Ошибка при создании пользователя:`, createError);
        return NextResponse.json<ApiResponse<null>>({
          success: false, 
          error: 'Ошибка при создании пользователя: ' + (createError instanceof Error ? createError.message : String(createError)),
        }, { status: 500 });
      }
      
      // Если был указан реферальный код и найден пригласивший пользователь,
      // начисляем бонусы обоим пользователям
      if (referrerId) {
        try {
          const bonusAdapter = initDB().bonusAdapter;
          console.log(`[/api/auth/telegram] Начисляем реферальные бонусы пользователям ${referrerId} и ${user.id}`);
          const bonusResult = bonusAdapter.addReferralBonus(referrerId, user.id);
          console.log('[/api/auth/telegram] Реферальные бонусы успешно начислены:', JSON.stringify(bonusResult, null, 2));
        } catch (bonusError) {
          console.error('[/api/auth/telegram] Ошибка при начислении реферальных бонусов:', bonusError);
        }
      }
    } else {
      console.log(`[/api/auth/telegram] Найден существующий пользователь: id=${user.id}, роль=${user.role}, email=${user.email || 'отсутствует'}, photo_url=${user.photo_url || 'отсутствует'}`);
      
      // Проверяем, нужно ли обновить роль пользователя с CLIENT на USER
      const needRoleUpdate = user.role === 'client' || !user.role;
      
      // Обновляем аватар пользователя, если он изменился или отсутствует
      const needPhotoUpdate = telegramUser.photo_url && (!user.photo || !user.photo_url || user.photo !== telegramUser.photo_url || user.photo_url !== telegramUser.photo_url);
      
      if (needPhotoUpdate || needRoleUpdate) {
        console.log(`[/api/auth/telegram] Обновляем данные пользователя: старый photo_url=${user.photo_url || 'отсутствует'}, новый photo_url=${telegramUser.photo_url || 'отсутствует'}, обновление роли=${needRoleUpdate ? 'да' : 'нет'}`);
        
        // Подготавливаем данные для обновления
        const updateData = {
          ...user
        };
        
        // Обновляем фото, если нужно
        if (needPhotoUpdate && telegramUser.photo_url) {
          updateData.photo = telegramUser.photo_url;
          updateData.avatar = telegramUser.photo_url;
          updateData.photo_url = telegramUser.photo_url;
        }
        
        // Обновляем роль, если нужно
        if (needRoleUpdate) {
          updateData.role = UserRole.USER;
          updateData.roles = [UserRole.USER.toLowerCase()];
        }
        
        // Применяем обновления
        user = usersAPI.update(user.id, updateData);
        
        console.log(`[/api/auth/telegram] Обновлены данные пользователя: photo_url=${user.photo_url || 'не установлен'}, роль=${user.role}`);
      }
    }

    // Создаем объект пользователя без пароля для отправки клиенту
    const { password: _, ...userWithoutPassword } = user;

    // Создаем JWT-токен
    const userForToken = {
      id: user.id,
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: (user.role || 'user') as UserRole,
      telegramId: telegramUser.id
    };
    
    const token = await createToken(userForToken, '30d'); // Увеличиваем срок действия токена до 30 дней
    console.log('[/api/auth/telegram] Токен создан успешно, длина:', token.length);

    // Устанавливаем cookie с токеном
    const response = NextResponse.json<ApiResponse<{ user: typeof userWithoutPassword, token: string }>>({
      success: true,
      data: { 
        user: userWithoutPassword,
        token: token
      },
    });

    // Устанавливаем cookie с токеном и email пользователя
    response.cookies.set('auth_token', token, {
      httpOnly: false,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 дней
      sameSite: 'lax',
    });
    
    // Дополнительно устанавливаем куки для клиентского JavaScript
    response.cookies.set('client_auth_token', token, {
      httpOnly: false,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 дней
      sameSite: 'lax',
    });
    
    // Сохраняем Telegram ID пользователя в куки
    response.cookies.set('telegram_id', telegramUser.id, {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      sameSite: 'lax',
    });

    // Сохраняем ответ в кеш
    processedRequests.set(requestKey, {
      timestamp: Date.now(),
      response: response.clone()
    });

    console.log('[/api/auth/telegram] Авторизация через Telegram успешно выполнена');
    
    return response;
  } catch (error) {
    console.error('[/api/auth/telegram] Ошибка авторизации через Telegram:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Ошибка сервера при авторизации через Telegram',
    }, { status: 500 });
  }
} 

// CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    },
  });
} 