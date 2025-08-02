import { NextRequest, NextResponse } from 'next/server';
import { bonusAdapter } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/models/types';
import { initDB } from '@/app/api/db';
import { db } from '@/database/db';
import { generateRandomString } from '@/utils/random';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

type Params = {
  params: {
    id: string;
  };
};

// Интерфейс для информации о пользователе
interface UserInfo {
  id: string;
  bonusBalance?: number;
  referralCode?: string;
  [key: string]: any;
}

// Кеш для предотвращения повторных запросов в рамках одного сеанса
// Формат: userId -> { timestamp: number, data: any }
const bonusCache = new Map<string, { timestamp: number, data: any }>();

// Время кеширования в миллисекундах (5 минут)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * GET /api/bonus/user/[id]
 * Получение информации о бонусах пользователя
 * Пользователи могут получать информацию только о своих бонусов
 * Администраторы могут получать информацию о бонусах любого пользователя
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Получаем ID пользователя из параметров
    // В Next.js 14 params уже не Promise, поэтому не нужно использовать await
    const userId = params.id;
    
    if (!userId) {
      console.error('[API] Ошибка: ID пользователя не определен');
      return NextResponse.json({ 
        success: false, 
        message: 'ID пользователя не определен',
        balance: 0 
      }, { status: 400 });
    }
    
    // Проверяем, есть ли кешированные данные для этого пользователя
    if (bonusCache.has(userId)) {
      const cachedData = bonusCache.get(userId)!;
      const now = Date.now();
      
      // Если данные не устарели, возвращаем их из кеша
      if (now - cachedData.timestamp < CACHE_TTL) {
        // Добавляем заголовки для кеширования
        const response = new NextResponse(JSON.stringify(cachedData.data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'Cache-Control': 'max-age=300, must-revalidate', // 5 минут
          },
        });
        
        return response;
      } else {
        // Если данные устарели, удаляем их из кеша
        bonusCache.delete(userId);
      }
    }
    
    // Проверяем, является ли запрос от Telegram Mini App
    const isTelegramRequest = 
      req.headers.get('User-Agent')?.includes('Telegram') || 
      req.headers.get('X-Telegram-App') === 'true' ||
      req.headers.get('Referer')?.includes('telegram') ||
      req.url.includes('requestId=bonus_request_');
    
    console.log('[API] Запрос бонусов для пользователя:', userId, 
      isTelegramRequest ? '(Telegram запрос)' : '');
    
    // Проверяем авторизацию
    let user;
    try {
      user = await getCurrentUser();
      
      if (!user) {
        // Для режима Telegram Mini App разрешаем доступ к бонусам без проверки авторизации
        // Это необходимо для первого входа в приложение через Telegram
        if (isTelegramRequest) {
          console.log('[API] Telegram клиент запрашивает бонусы для пользователя:', userId);
          // Продолжаем выполнение запроса без проверки авторизации
        } else {
          return NextResponse.json({ success: false, message: 'Необходима авторизация' }, { status: 401 });
        }
      } else {
        // Проверяем права доступа для авторизованных пользователей
        // Для Telegram запросов пропускаем проверку прав доступа
        if (!isTelegramRequest && user.role !== UserRole.ADMIN && userId !== user.id) {
          return NextResponse.json({ success: false, message: 'Доступ запрещен' }, { status: 403 });
        }
      }
    } catch (authError) {
      console.error('[API] Ошибка при проверке авторизации:', authError);
      // Для режима Telegram Mini App разрешаем доступ к бонусам даже при ошибке авторизации
      if (!isTelegramRequest) {
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка авторизации' 
        }, { status: 401 });
      }
    }
    
    // Получаем информацию о пользователе, включая баланс бонусов и реферальный код
    let userInfo;
    try {
      userInfo = db.prepare(`
        SELECT id, bonusBalance, referralCode
        FROM users
        WHERE id = ?
      `).get(userId) as UserInfo | undefined;
    } catch (dbError) {
      console.error('[API] Ошибка при запросе информации о пользователе из БД:', dbError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка при доступе к базе данных',
        balance: 0 // Добавляем нулевой баланс для совместимости
      }, { status: 500 });
    }
    
    if (!userInfo) {
      console.log('[API] Пользователь не найден:', userId);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден',
        balance: 0 // Добавляем нулевой баланс для совместимости
      }, { status: 404 });
    }
    
    // Если у пользователя нет реферального кода, генерируем его автоматически
    if (!userInfo.referralCode) {
      try {
        // Получаем существующие коды для проверки уникальности
        const existingCodes = new Set(
          db.prepare("SELECT referralCode FROM users WHERE referralCode IS NOT NULL")
            .all()
            .map((row: any) => row.referralCode)
        );
        
        // Генерируем уникальный код (8 символов)
        let code;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
          // Используем тот же метод, что и при регистрации
          code = crypto.randomBytes(4).toString('hex').toUpperCase();
          attempts++;
          
          if (attempts >= maxAttempts) {
            logger.error(`Не удалось сгенерировать уникальный реферальный код после ${maxAttempts} попыток`);
            break;
          }
        } while (existingCodes.has(code));
        
        if (code && !existingCodes.has(code)) {
          // Обновляем пользователя с новым кодом
          db.prepare("UPDATE users SET referralCode = ? WHERE id = ?").run(code, userId);
          
          // Обновляем информацию о пользователе
          userInfo.referralCode = code;
          
          logger.info(`Сгенерирован реферальный код ${code} для пользователя ${userId}`);
        } else {
          logger.error(`Не удалось сгенерировать уникальный реферальный код для пользователя ${userId}`);
        }
      } catch (error) {
        logger.error(`Ошибка при генерации реферального кода: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Получаем баланс бонусов пользователя
    const balance = userInfo.bonusBalance || 0;
    
    // Получаем реферальный код пользователя
    const referralCode = userInfo.referralCode;
    
    // Получаем транзакции пользователя
    let transactions = [];
    try {
      transactions = bonusAdapter.getUserTransactions(userId);
    } catch (txError) {
      console.error('[API] Ошибка при получении транзакций пользователя:', txError);
      // Продолжаем выполнение, транзакции не критичны
    }
    
    // Получаем список приглашенных пользователей
    let referredUsers = [];
    try {
      referredUsers = bonusAdapter.getReferredUsers(userId);
    } catch (refError) {
      console.error('[API] Ошибка при получении списка приглашенных пользователей:', refError);
      // Продолжаем выполнение, список приглашенных не критичен
    }
    
    // Получаем информацию о пригласившем пользователе
    let referrer = null;
    try {
      referrer = bonusAdapter.getReferrer(userId);
    } catch (refError) {
      console.error('[API] Ошибка при получении информации о пригласившем пользователе:', refError);
      // Продолжаем выполнение, информация о пригласившем не критична
    }
    
    console.log('[API] Успешно получены данные о бонусах для пользователя:', userId, 'баланс:', balance);
    
    // Подготавливаем данные для ответа
    const responseData = { 
      success: true, 
      balance,
      referralCode,
      transactions,
      referredUsers,
      referrer
    };
    
    // Сохраняем данные в кеш
    bonusCache.set(userId, {
      timestamp: Date.now(),
      data: responseData
    });
    
    // Устанавливаем заголовки кэширования для предотвращения повторных запросов
    const response = NextResponse.json(responseData);
    
    // Устанавливаем заголовки для предотвращения кэширования на стороне браузера
    response.headers.set('Cache-Control', 'max-age=300, must-revalidate'); // 5 минут
    response.headers.set('X-Cache', 'MISS');
    
    return response;
  } catch (error) {
    console.error('[API] Ошибка при получении информации о бонусах пользователя:', error);
    
    // В случае ошибки возвращаем нулевой баланс для совместимости с клиентом
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка сервера: ${error instanceof Error ? error.message : String(error)}`,
      balance: 0 // Добавляем нулевой баланс для совместимости
    }, { status: 500 });
  }
} 

/**
 * POST /api/bonus/user/[id]
 * Обновление информации о бонусах пользователя
 * Пользователи могут обновлять только свою информацию
 * Администраторы могут обновлять информацию любого пользователя
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Проверяем авторизацию
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'Необходима авторизация' }, { status: 401 });
    }
    
    // Получаем ID пользователя из параметров
    const userId = params.id;
    
    if (!userId) {
      console.error('[API] POST: ID пользователя не определен');
      return NextResponse.json({ 
        success: false, 
        message: 'ID пользователя не определен'
      }, { status: 400 });
    }
    
    // Проверяем права доступа
    if (user.role !== UserRole.ADMIN && userId !== user.id) {
      return NextResponse.json({ success: false, message: 'Доступ запрещен' }, { status: 403 });
    }
    
    // Получаем данные из запроса
    const data = await req.json();
    
    // Проверяем, нужно ли сгенерировать реферальный код
    if (data.generateCode) {
      // Получаем информацию о пользователе
      const userInfo = db.prepare(`
        SELECT id, referralCode
        FROM users
        WHERE id = ?
      `).get(userId) as { id: string, referralCode?: string } | undefined;
      
      if (!userInfo) {
        return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
      }
      
      // Генерируем новый реферальный код
      try {
        // Получаем существующие коды для проверки уникальности
        const existingCodes = new Set(
          db.prepare("SELECT referralCode FROM users WHERE referralCode IS NOT NULL")
            .all()
            .map((row: any) => row.referralCode)
        );
        
        // Генерируем уникальный код
        let code;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
          // Используем тот же метод, что и при регистрации
          code = crypto.randomBytes(4).toString('hex').toUpperCase();
          attempts++;
          
          if (attempts >= maxAttempts) {
            logger.error(`Не удалось сгенерировать уникальный реферальный код после ${maxAttempts} попыток`);
            return NextResponse.json({ 
              success: false, 
              message: 'Не удалось сгенерировать уникальный реферальный код' 
            }, { status: 500 });
          }
        } while (existingCodes.has(code));
        
        // Обновляем пользователя с новым кодом
        db.prepare("UPDATE users SET referralCode = ? WHERE id = ?").run(code, userId);
        
        logger.info(`Сгенерирован новый реферальный код ${code} для пользователя ${userId}`);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Реферальный код успешно сгенерирован',
          referralCode: code
        });
      } catch (error) {
        logger.error(`Ошибка при генерации реферального кода: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка при генерации реферального кода' 
        }, { status: 500 });
      }
    }
    
    // Если нет специальных действий, возвращаем ошибку
    return NextResponse.json({ 
      success: false, 
      message: 'Неизвестное действие' 
    }, { status: 400 });
  } catch (error) {
    console.error('Ошибка при обновлении информации о бонусах пользователя:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка сервера: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 