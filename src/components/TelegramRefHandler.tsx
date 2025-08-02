'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getTelegramStartParam, isTelegramWebApp } from '@/lib/telegram-config';

/**
 * Компонент для обработки реферальных кодов из Telegram Mini App
 * и решения проблем с авторизацией
 */
export default function TelegramRefHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const [refCodeProcessed, setRefCodeProcessed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Функция для обработки авторизации Telegram с реферальным кодом
  const handleTelegramAuth = async (referralCode?: string) => {
    try {
      // Проверяем, есть ли WebApp и initData
      if (typeof window === 'undefined' || !window.Telegram?.WebApp?.initData) {
        console.log('[TelegramRefHandler] Отсутствует Telegram WebApp или initData');
        return;
      }
      
      const initData = window.Telegram.WebApp.initData;
      
      // Очищаем существующие данные авторизации, чтобы избежать конфликтов
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      // Отправляем запрос на авторизацию с реферальным кодом
      console.log('[TelegramRefHandler] Отправка авторизационных данных' + (referralCode ? ' с реферальным кодом: ' + referralCode : ''));
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-App': 'true'
        },
        body: JSON.stringify({ 
          initData,
          referralCode: referralCode || undefined 
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[TelegramRefHandler] Авторизация успешна', { 
          userId: data.data?.user?.id,
          telegramId: data.data?.user?.telegramId
        });
        
        // Сохраняем токен в localStorage для последующих запросов
        if (data.data?.token) {
          localStorage.setItem('auth_token', data.data.token);
          console.log('[TelegramRefHandler] Токен сохранен в localStorage');
          
          // Сохраняем данные пользователя
          if (data.data?.user) {
            localStorage.setItem('user_data', JSON.stringify(data.data.user));
          }
          
          // Обновляем страницу, чтобы применить авторизацию
          window.location.reload();
        }
      } else {
        console.error('[TelegramRefHandler] Ошибка авторизации:', data.error);
      }
    } catch (error) {
      console.error('[TelegramRefHandler] Ошибка при авторизации:', error);
    }
  };

  // Проверка валидности токена
  const verifyAuthToken = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;
      
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Telegram-App': 'true'
        }
      });
      
      if (!response.ok) {
        console.log('[TelegramRefHandler] Токен недействителен, необходима повторная авторизация');
        return false;
      }
      
      const data = await response.json();
      return data.success && data.data?.user?.id;
    } catch (error) {
      console.error('[TelegramRefHandler] Ошибка при проверке токена:', error);
      return false;
    }
  };
  
  useEffect(() => {
    // Проверка авторизации в Telegram Mini App
    const checkTelegramAuth = async () => {
      // Если уже проверяли авторизацию, не делаем это повторно
      if (authChecked) return;
      
      const isInTelegram = isTelegramWebApp();
      if (!isInTelegram) return;
      
      console.log('[TelegramRefHandler] Проверка авторизации в Telegram Mini App');
      setAuthChecked(true);
      
      // В Telegram Mini App всегда выполняем авторизацию при запуске
      // Это гарантирует, что пользователь будет создан в базе данных
      if (window.Telegram?.WebApp?.initData) {
        console.log('[TelegramRefHandler] Принудительная авторизация в Telegram Mini App');
        handleTelegramAuth();
      }
    };
    
    // Задержка для инициализации Telegram WebApp
    setTimeout(() => {
      checkTelegramAuth();
    }, 500);
  }, [authChecked]);
  
  useEffect(() => {
    // Обработка реферальных кодов
    const handleReferralCode = () => {
      // Проверяем, запущены ли мы в Telegram WebApp
      const isInTelegram = isTelegramWebApp();
      
      if (isInTelegram && !refCodeProcessed) {
        console.log('[TelegramRefHandler] Запущено в Telegram WebApp');
        
        // Получаем параметр запуска (после ?startapp=)
        const startParam = getTelegramStartParam();
        console.log('[TelegramRefHandler] Получен startParam:', startParam);
        
        // Проверяем, содержит ли параметр реферальный код (формат: ref-КОД)
        if (startParam && startParam.startsWith('ref-')) {
          const referralCode = startParam.replace('ref-', '');
          console.log('[TelegramRefHandler] Обнаружен реферальный код:', referralCode);
          
          // Отмечаем, что код был обработан, чтобы не делать это повторно
          setRefCodeProcessed(true);
          
          // Всегда запускаем авторизацию с реферальным кодом, чтобы гарантировать создание пользователя
          console.log('[TelegramRefHandler] Запускаем авторизацию с реферальным кодом');
          handleTelegramAuth(referralCode);
        }
      }
    };
    
    // Выполняем после проверки авторизации
    if (authChecked) {
      handleReferralCode();
    }
  }, [pathname, router, refCodeProcessed, authChecked]);
  
  // Это невидимый компонент
  return null;
} 