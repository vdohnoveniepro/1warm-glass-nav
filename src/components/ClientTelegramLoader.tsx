'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { isTelegramWebApp, getTelegramInitData, notifyTelegramReady, expandTelegramWebApp } from '@/lib/telegram-config';

/**
 * Компонент для инициализации Telegram WebApp на клиенте
 * и автоматической авторизации пользователя через Telegram
 */
export default function ClientTelegramLoader() {
  const { user, loginWithTelegram } = useAuth();
  const originalFetchRef = useRef<typeof window.fetch | null>(null);
  const authAttemptedRef = useRef(false);
  
  // Эффект для инициализации Telegram WebApp
  useEffect(() => {
    // Проверяем, запущено ли приложение в Telegram
    const isInTelegramWebApp = isTelegramWebApp();
    
    if (!isInTelegramWebApp) {
      console.log('[ClientTelegramLoader] Приложение не запущено в Telegram WebApp');
      return;
    }
    
    console.log('[ClientTelegramLoader] Приложение запущено в Telegram WebApp');
    
    // Получаем данные инициализации
    const initData = getTelegramInitData();
    
    if (!initData) {
      console.log('[ClientTelegramLoader] Данные инициализации Telegram WebApp отсутствуют');
      return;
    }
    
    console.log('[ClientTelegramLoader] Данные инициализации получены, длина:', initData.length);
    
    // Сообщаем Telegram WebApp, что приложение готово
    notifyTelegramReady();
    
    // Разворачиваем WebApp на весь экран
    expandTelegramWebApp();
    
    // Сохраняем флаг, что мы в Telegram WebApp
    localStorage.setItem('isTelegramWebApp', 'true');
    
    // Авторизация пользователя через Telegram
    const handleTelegramAuth = async () => {
      // Если уже была попытка авторизации, не пытаемся снова
      if (authAttemptedRef.current) {
        console.log('[ClientTelegramLoader] Авторизация уже была выполнена ранее');
        return;
      }
      
      // Отмечаем, что попытка авторизации была сделана
      authAttemptedRef.current = true;
      
      try {
        // Проверяем, авторизован ли уже пользователь
        if (user) {
          console.log('[ClientTelegramLoader] Пользователь уже авторизован:', user.email);
          
          // Сохраняем токен авторизации в localStorage для Telegram WebApp
          const authToken = localStorage.getItem('auth_token');
          if (authToken) {
            console.log('[ClientTelegramLoader] Токен авторизации сохранен для Telegram WebApp');
          }
          
          return;
        }
        
        console.log('[ClientTelegramLoader] Начало авторизации через Telegram...');
        
        // Пытаемся авторизоваться с данными из Telegram
        const success = await loginWithTelegram(initData);
        
        if (success) {
          console.log('[ClientTelegramLoader] Успешная авторизация через Telegram');
          // НЕ перезагружаем страницу, чтобы избежать бесконечного цикла
        } else {
          console.log('[ClientTelegramLoader] Не удалось авторизоваться через Telegram');
        }
      } catch (error) {
        console.error('[ClientTelegramLoader] Ошибка при авторизации через Telegram:', error);
      }
    };
    
    // Выполняем авторизацию с небольшой задержкой
    setTimeout(handleTelegramAuth, 300);
    
    // Добавляем обработчик для передачи токена авторизации в заголовках запросов
    const addAuthHeadersInterceptor = () => {
      // Оригинальная функция fetch
      originalFetchRef.current = window.fetch;
      
      // Переопределяем fetch для добавления заголовка авторизации
      window.fetch = function(input, init) {
        // Получаем токен из localStorage
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          // Создаем новый объект init, если он отсутствует
          const modifiedInit = init || {};
          
          // Создаем новые заголовки, если они отсутствуют
          const headers = new Headers(modifiedInit.headers || {});
          
          // Добавляем заголовок авторизации
          headers.set('Authorization', `Bearer ${token}`);
          
          // Добавляем заголовок Telegram
          headers.set('X-Telegram-App', 'true');
          
          // Обновляем заголовки в init
          modifiedInit.headers = headers;
          
          // Вызываем оригинальный fetch с модифицированными параметрами
          return originalFetchRef.current!.call(this, input, modifiedInit);
        }
        
        return originalFetchRef.current!.call(this, input, init);
      };
      
      console.log('[ClientTelegramLoader] Добавлен перехватчик для заголовков авторизации');
    };
    
    // Добавляем перехватчик для заголовков авторизации
    addAuthHeadersInterceptor();
    
    return () => {
      // Очистка при размонтировании компонента
      // Восстанавливаем оригинальную функцию fetch
      if (typeof window !== 'undefined' && originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
      console.log('[ClientTelegramLoader] Перехватчик заголовков удален');
    };
  }, [user, loginWithTelegram]);
  
  return null;
} 