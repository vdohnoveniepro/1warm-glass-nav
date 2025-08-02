'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { isTelegramWebApp as checkTelegramWebApp, notifyTelegramReady, expandTelegramWebApp } from '@/lib/telegram-config';

// Глобальная переменная для отслеживания перенаправлений
const globalRedirect = {
  redirected: false,
  timestamp: 0,
  path: null
};

export default function TelegramAppClient() {
  const [isTelegramApp, setIsTelegramApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  
  // Используем ref для отслеживания редиректов и предотвращения лишних перенаправлений
  const redirectedRef = useRef(globalRedirect.redirected);
  const telegramInitializedRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Функция для очистки всех таймаутов
  const clearAllTimeouts = () => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    // Проверяем, запущено ли приложение внутри Telegram WebApp
    try {
      if (telegramInitializedRef.current) return; // Инициализируем только один раз
      
      const isTgWebApp = checkTelegramWebApp();
      console.log('[TelegramAppClient] Проверка Telegram WebApp:', isTgWebApp);
      
      setIsTelegramApp(isTgWebApp);
      
      // Сообщаем Telegram WebApp, что приложение готово
      if (isTgWebApp) {
        console.log('[TelegramAppClient] Отправляем сигналы ready и expand');
        
        // Добавляем таймаут для уверенности в инициализации
        initTimeoutRef.current = setTimeout(() => {
          try {
            notifyTelegramReady();
            expandTelegramWebApp();
            telegramInitializedRef.current = true;
            console.log('[TelegramAppClient] Telegram WebApp успешно инициализирован');
          } catch (err) {
            console.error('[TelegramAppClient] Ошибка при инициализации Telegram WebApp в таймауте:', err);
          }
        }, 1000); // Увеличиваем время ожидания до 1 секунды
      }
    } catch (error) {
      console.error('[TelegramAppClient] Ошибка при инициализации Telegram WebApp:', error);
      setIsTelegramApp(false);
    } finally {
      setIsLoading(false);
    }
    
    // Устанавливаем защиту от цикла перенаправлений
    return () => {
      clearAllTimeouts();
    };
  }, []);

  // Перенаправляем на главную при успешной авторизации
  useEffect(() => {
    // Проверяем, прошло ли достаточно времени с последнего редиректа
    const now = Date.now();
    const redirectExpired = now - globalRedirect.timestamp > 10000; // 10 секунд
    
    // Если был недавний редирект, пропускаем
    if (globalRedirect.redirected && !redirectExpired) {
      console.log('[TelegramAppClient] Пропускаем повторный редирект (прошло менее 10 секунд)');
      redirectedRef.current = true;
      return;
    }
    
    // Если был редирект, но прошло достаточно времени, сбрасываем флаг
    if (globalRedirect.redirected && redirectExpired) {
      console.log('[TelegramAppClient] Сбрасываем флаг редиректа (прошло более 10 секунд)');
      globalRedirect.redirected = false;
      redirectedRef.current = false;
    }
    
    // Выполняем редирект только один раз
    if (redirectedRef.current) {
      console.log('[TelegramAppClient] Редирект уже был выполнен, пропускаем');
      return;
    }
    
    // Перенаправляем только если пользователь авторизован и мы в Telegram
    if (user && isTelegramApp) {
      console.log('[TelegramAppClient] Пользователь авторизован, перенаправляем на главную');
      
      // Устанавливаем флаг, что редирект был выполнен
      redirectedRef.current = true;
      globalRedirect.redirected = true;
      globalRedirect.timestamp = now;
      globalRedirect.path = '/';
      
      // Добавляем таймаут для предотвращения немедленного редиректа
      // Это дает время другим компонентам инициализироваться
      const redirectTimeout = setTimeout(() => {
        try {
          console.log('[TelegramAppClient] Выполняем перенаправление на /', user.id);
          router.push('/');
        } catch (err) {
          console.error('[TelegramAppClient] Ошибка при перенаправлении:', err);
        }
      }, 2000); // Увеличиваем время ожидания до 2 секунд
      
      return () => {
        clearTimeout(redirectTimeout);
      };
    }
  }, [user, isTelegramApp, router]);
  
  // Добавляем эффект для проверки, что страница действительно изменилась
  useEffect(() => {
    // Если был выполнен редирект и прошло достаточно времени
    if (globalRedirect.redirected && globalRedirect.path) {
      const checkTimeout = setTimeout(() => {
        // Проверяем, что текущий путь соответствует ожидаемому
        const currentPath = window.location.pathname;
        if (currentPath !== globalRedirect.path) {
          console.log(`[TelegramAppClient] Редирект не сработал, текущий путь: ${currentPath}, ожидался: ${globalRedirect.path}`);
          // Сбрасываем флаг редиректа для повторной попытки
          globalRedirect.redirected = false;
          redirectedRef.current = false;
        } else {
          console.log(`[TelegramAppClient] Редирект успешно выполнен, текущий путь: ${currentPath}`);
        }
      }, 3000); // Проверяем через 3 секунды
      
      return () => {
        clearTimeout(checkTimeout);
      };
    }
  }, []);

  // Если приложение загружается
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#0088cc] border-r-2"></div>
        <p className="mt-4 text-gray-600">Загрузка...</p>
      </div>
    );
  }

  // Если приложение не запущено в Telegram
  if (!isTelegramApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Telegram Mini App</h1>
          <p className="mb-6">
            Это приложение предназначено для работы внутри Telegram. Пожалуйста, откройте его через бота @vdohnoveniepro_bot.
          </p>
          <a 
            href="https://t.me/vdohnoveniepro_bot" 
            className="inline-flex items-center px-4 py-2 bg-[#0088cc] text-white rounded-md"
          >
            Открыть в Telegram
          </a>
        </div>
      </div>
    );
  }

  // Если пользователь авторизован
  if (user) {
    return (
      <div className="flex flex-col">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Добро пожаловать, {user.firstName}!</h1>
          <p className="mb-4">Вы успешно авторизованы в приложении.</p>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Link 
              href="/cabinet"
              className="flex flex-col items-center justify-center p-4 bg-[#f5f5f5] rounded-lg hover:bg-[#e0e0e0]"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              <span>Личный кабинет</span>
            </Link>
            
            <Link 
              href="/services"
              className="flex flex-col items-center justify-center p-4 bg-[#f5f5f5] rounded-lg hover:bg-[#e0e0e0]"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <span>Услуги</span>
            </Link>
            
            <Link 
              href="/specialists"
              className="flex flex-col items-center justify-center p-4 bg-[#f5f5f5] rounded-lg hover:bg-[#e0e0e0]"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <span>Специалисты</span>
            </Link>
            
            <Link 
              href="/appointments"
              className="flex flex-col items-center justify-center p-4 bg-[#f5f5f5] rounded-lg hover:bg-[#e0e0e0]"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span>Записаться</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Если пользователь не авторизован
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Авторизация в процессе...</h1>
        <p className="mb-6">
          Пожалуйста, подождите, идет автоматическая авторизация через Telegram.
        </p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#0088cc] border-r-2 mx-auto"></div>
      </div>
    </div>
  );
} 