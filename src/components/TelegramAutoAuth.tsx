'use client';

import { useEffect, useState, useRef } from 'react';
import { getTelegramInitData, isTelegramWebApp, isTelegramInitialized } from '@/lib/telegram-config';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

// Глобальная переменная для отслеживания авторизации на уровне приложения
// Это предотвратит повторные попытки авторизации при повторной загрузке компонента
const globalAuthAttempted = {
  attempted: false,
  completed: false,
  timestamp: 0,
  lastError: null
};

/**
 * Компонент для автоматической авторизации через Telegram Mini App
 * Автоматически отправляет данные на сервер для авторизации при загрузке в Telegram WebApp
 */
export default function TelegramAutoAuth() {
  const router = useRouter();
  const { loginWithTelegram, isAuthenticated, user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const authAttemptedRef = useRef(globalAuthAttempted.attempted);
  const authCompletedRef = useRef(globalAuthAttempted.completed);
  const [authAttempts, setAuthAttempts] = useState(0);
  const maxAuthAttempts = 5; // Увеличиваем количество попыток с 3 до 5
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Функция для очистки интервала повторных попыток и таймаутов
  const clearAllTimers = () => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
    
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
  };

  // При монтировании компонента проверяем глобальное состояние
  useEffect(() => {
    // Проверяем, была ли успешная авторизация в течение последних 5 минут
    const now = Date.now();
    const authExpired = now - globalAuthAttempted.timestamp > 5 * 60 * 1000; // 5 минут

    // Если авторизация уже выполнена и не устарела, используем её
    if (globalAuthAttempted.completed && !authExpired) {
      console.log('[TelegramAutoAuth] Используем предыдущую успешную авторизацию');
      authCompletedRef.current = true;
      setStatus('success');
    } 
    // Если попытка была сделана, но авторизация не завершилась или устарела
    else if (globalAuthAttempted.attempted && authExpired) {
      console.log('[TelegramAutoAuth] Предыдущая авторизация устарела, сбрасываем');
      globalAuthAttempted.attempted = false;
      globalAuthAttempted.completed = false;
      globalAuthAttempted.lastError = null;
    }
    
    // Синхронизируем локальное состояние с глобальным
    authAttemptedRef.current = globalAuthAttempted.attempted;
    authCompletedRef.current = globalAuthAttempted.completed;
    
    // Очистка таймеров при размонтировании компонента
    return () => {
      clearAllTimers();
    };
  }, []);
  
  useEffect(() => {
    // Останавливаем попытки авторизации, если пользователь уже авторизован
    if (user && isAuthenticated) {
      console.log('[TelegramAutoAuth] Пользователь уже авторизован:', user.id);
      authCompletedRef.current = true;
      globalAuthAttempted.completed = true;
      globalAuthAttempted.timestamp = Date.now();
      setStatus('success');
      clearAllTimers();
    }
  }, [user, isAuthenticated]);
  
  // Создаем функцию для авторизации через Telegram
  const authWithTelegram = async () => {
    // Проверяем, что попытка авторизации еще не была произведена
    if (authAttemptedRef.current || authCompletedRef.current || globalAuthAttempted.completed) {
      console.log('[TelegramAutoAuth] Пропускаем попытку авторизации, т.к. она уже выполняется или завершена');
      return;
    }
    
    // Проверяем количество попыток
    if (authAttempts >= maxAuthAttempts) {
      console.log(`[TelegramAutoAuth] Пропускаем попытку авторизации - достигнут лимит (${maxAuthAttempts})`);
      return;
    }
    
    authAttemptedRef.current = true;
    globalAuthAttempted.attempted = true;
    setStatus('loading');
    
    // Проверяем, есть ли кеш авторизации в localStorage
    if (typeof window !== 'undefined') {
      const cachedAuth = localStorage.getItem('telegram_auth_cache');
      const cachedTimestamp = localStorage.getItem('telegram_auth_timestamp');
      const cachedUserId = localStorage.getItem('telegram_auth_user_id');
      
      if (cachedAuth && cachedTimestamp && cachedUserId) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        
        // Если кеш не старше 30 минут, используем его
        if (now - timestamp < 30 * 60 * 1000) { // 30 минут
          console.log('[TelegramAutoAuth] Используем кешированную авторизацию для пользователя:', cachedUserId);
          authCompletedRef.current = true;
          globalAuthAttempted.completed = true;
          globalAuthAttempted.timestamp = now;
          setStatus('success');
          return;
        } else {
          console.log('[TelegramAutoAuth] Кешированная авторизация устарела, выполняем новую авторизацию');
          // Удаляем устаревший кеш
          localStorage.removeItem('telegram_auth_cache');
          localStorage.removeItem('telegram_auth_timestamp');
          localStorage.removeItem('telegram_auth_user_id');
        }
      }
    }
    
    try {
      // Проверяем, запущено ли приложение внутри Telegram WebApp
      if (!isTelegramWebApp()) {
        console.log('[TelegramAutoAuth] Приложение не запущено в Telegram WebApp');
        // Если не в Telegram, просто выходим без ошибки
        authCompletedRef.current = true;
        globalAuthAttempted.completed = true;
        setStatus('idle');
        return;
      }
      
      // Проверяем, что Telegram WebApp инициализирован
      if (!isTelegramInitialized()) {
        console.log('[TelegramAutoAuth] Telegram WebApp не инициализирован, ждем инициализацию...');
        setError('Ожидание инициализации Telegram WebApp');
        
        // Увеличиваем счетчик попыток
        setAuthAttempts(prev => prev + 1);
        // Сбрасываем флаг попытки для возможности повторной попытки
        setTimeout(() => {
          authAttemptedRef.current = false;
          globalAuthAttempted.attempted = false;
        }, 2000); // Увеличиваем паузу между попытками до 2 секунд
        
        return;
      }
      
      // Получаем данные инициализации Telegram
      const initData = getTelegramInitData();
      
      if (!initData) {
        console.error('[TelegramAutoAuth] Ошибка: отсутствуют данные инициализации Telegram');
        setStatus('error');
        setError('Отсутствуют данные инициализации Telegram');
        globalAuthAttempted.lastError = 'Отсутствуют данные инициализации Telegram';
        
        // Увеличиваем счетчик попыток
        setAuthAttempts(prev => prev + 1);
        // Сбрасываем флаг попытки для возможности повторной попытки
        setTimeout(() => {
          authAttemptedRef.current = false;
          globalAuthAttempted.attempted = false;
        }, 3000); // Увеличиваем паузу между попытками до 3 секунд
        
        return;
      }
      
      // Авторизуемся с использованием полученных данных
      console.log('[TelegramAutoAuth] Выполняем авторизацию с данными Telegram, длина данных:', initData.length);
      const result = await loginWithTelegram(initData);
      
      if (result.success) {
        console.log('[TelegramAutoAuth] Успешная авторизация через Telegram:', result.user?.id);
        setStatus('success');
        authCompletedRef.current = true;
        globalAuthAttempted.completed = true;
        globalAuthAttempted.timestamp = Date.now();
        clearAllTimers(); // Останавливаем повторные попытки
        
        // Сохраняем успешную авторизацию в localStorage
        if (typeof window !== 'undefined' && result.user) {
          localStorage.setItem('telegram_auth_cache', 'true');
          localStorage.setItem('telegram_auth_timestamp', Date.now().toString());
          localStorage.setItem('telegram_auth_user_id', result.user.id);
        }
      } else {
        console.error('[TelegramAutoAuth] Ошибка авторизации:', result.error);
        setStatus('error');
        setError(result.error || 'Ошибка при авторизации через Telegram');
        globalAuthAttempted.lastError = result.error || 'Ошибка при авторизации через Telegram';
        
        // Увеличиваем счетчик попыток
        setAuthAttempts(prev => prev + 1);
        // Сбрасываем флаг попытки для возможности повторной попытки
        setTimeout(() => {
          authAttemptedRef.current = false;
          globalAuthAttempted.attempted = false;
        }, 3000); // Увеличиваем паузу между попытками до 3 секунд
      }
    } catch (err: any) {
      console.error('[TelegramAutoAuth] Ошибка при авторизации:', err);
      setStatus('error');
      const errorMessage = err?.message || 'Неизвестная ошибка при авторизации через Telegram';
      setError(errorMessage);
      globalAuthAttempted.lastError = errorMessage;
      
      // Увеличиваем счетчик попыток
      setAuthAttempts(prev => prev + 1);
      // Сбрасываем флаг попытки для возможности повторной попытки
      setTimeout(() => {
        authAttemptedRef.current = false;
        globalAuthAttempted.attempted = false;
      }, 3000); // Увеличиваем паузу между попытками до 3 секунд
    }
  };
  
  useEffect(() => {
    // Автоматически выполняем авторизацию, если она еще не завершена
    if (isTelegramWebApp() && !isAuthenticated && 
        !authCompletedRef.current && !globalAuthAttempted.completed && 
        authAttempts < maxAuthAttempts) {
      
      // Добавляем задержку для инициализации Telegram WebApp
      authTimeoutRef.current = setTimeout(() => {
        // Если авторизация уже была завершена глобально, не делаем ничего
        if (globalAuthAttempted.completed) {
          console.log('[TelegramAutoAuth] Авторизация уже завершена глобально, пропускаем');
          authCompletedRef.current = true;
          setStatus('success');
          return;
        }
        
        console.log('[TelegramAutoAuth] Запуск первой попытки авторизации');
        authWithTelegram();
        
        // Создаем интервал для повторных попыток только если еще нет интервала
        // и авторизация не завершена и не превышен лимит попыток
        if (!retryIntervalRef.current && !authCompletedRef.current && 
            !globalAuthAttempted.completed && authAttempts < maxAuthAttempts) {
            
          console.log('[TelegramAutoAuth] Настройка интервала для повторных попыток');
          retryIntervalRef.current = setInterval(() => {
            if (!authCompletedRef.current && !globalAuthAttempted.completed && 
                authAttempts < maxAuthAttempts && !authAttemptedRef.current) {
                
              console.log('[TelegramAutoAuth] Повторная попытка авторизации #', authAttempts + 1);
              authWithTelegram();
            } else if (authCompletedRef.current || globalAuthAttempted.completed || 
                      authAttempts >= maxAuthAttempts) {
              
              console.log('[TelegramAutoAuth] Останавливаем повторные попытки');
              clearAllTimers();
            }
          }, 10000); // Увеличиваем интервал до 10 секунд
        }
      }, 2000); // Увеличиваем начальную задержку до 2 секунд
      
      return () => {
        clearAllTimers();
      };
    }
    
    return () => {
      clearAllTimers();
    };
  }, [loginWithTelegram, isAuthenticated, authAttempts]);
  
  // При достижении максимального количества попыток - показываем ошибку и не пытаемся больше авторизоваться
  useEffect(() => {
    if (authAttempts >= maxAuthAttempts && !authCompletedRef.current && !globalAuthAttempted.completed) {
      console.error('[TelegramAutoAuth] Достигнуто максимальное количество попыток авторизации');
      setStatus('error');
      setError('Не удалось авторизоваться после нескольких попыток. Пожалуйста, перезагрузите страницу или попробуйте войти другим способом.');
      clearAllTimers();
      
      // Записываем последнюю ошибку в глобальную переменную
      if (!globalAuthAttempted.lastError) {
        globalAuthAttempted.lastError = 'Достигнут лимит попыток авторизации';
      }
      
      // Добавляем задержку и повторную попытку после длительного ожидания
      // Это даст возможность Telegram WebApp полностью инициализироваться
      setTimeout(() => {
        console.log('[TelegramAutoAuth] Выполняем финальную попытку авторизации после длительного ожидания');
        // Сбрасываем счетчик попыток и флаги для финальной попытки
        setAuthAttempts(0);
        authAttemptedRef.current = false;
        globalAuthAttempted.attempted = false;
        
        // Вызываем авторизацию с небольшой задержкой
        setTimeout(() => {
          authWithTelegram();
        }, 1000);
      }, 15000); // Ждем 15 секунд перед финальной попыткой
    }
  }, [authAttempts]);
  
  // Этот эффект добавляет проверку авторизации по интервалу
  useEffect(() => {
    // Проверяем статус авторизации каждые 5 секунд, если находимся в состоянии ошибки
    if (status === 'error' && !authCompletedRef.current && !isAuthenticated) {
      const checkInterval = setInterval(() => {
        // Если пользователь уже авторизован, сбрасываем статус ошибки
        if (user && isAuthenticated) {
          console.log('[TelegramAutoAuth] Обнаружена успешная авторизация при проверке интервалом');
          authCompletedRef.current = true;
          globalAuthAttempted.completed = true;
          globalAuthAttempted.timestamp = Date.now();
          setStatus('success');
          clearInterval(checkInterval);
        }
      }, 5000);
      
      return () => {
        clearInterval(checkInterval);
      };
    }
  }, [status, isAuthenticated, user]);

  // Если компонент находится в состоянии загрузки или ошибки, можно отображать соответствующее состояние
  // Но для данного случая возвращаем null, так как компонент должен работать незаметно для пользователя
  return null;
} 