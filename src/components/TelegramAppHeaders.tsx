'use client';

import { useEffect } from 'react';
import { isTelegramWebApp } from '@/lib/telegram-config';

/**
 * Компонент для установки заголовка X-Telegram-App в запросах
 * при работе в Telegram WebApp и отключения кеширования
 */
export default function TelegramAppHeaders() {
  useEffect(() => {
    // Запоминаем, является ли приложение Telegram WebApp
    const isInTelegramWebApp = isTelegramWebApp();
    
    if (!isInTelegramWebApp) {
      console.log('[TelegramAppHeaders] Не в Telegram WebApp, заголовки не будут установлены');
      return;
    }
    
    console.log('[TelegramAppHeaders] Устанавливаем перехват fetch для Telegram WebApp');
    
    // Принудительно отключаем кеширование для всех страниц в Telegram WebApp
    if (typeof document !== 'undefined') {
      // Добавляем мета-теги для отключения кеширования динамически
      const metaTags = [
        { httpEquiv: 'Cache-Control', content: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
        { httpEquiv: 'Pragma', content: 'no-cache' },
        { httpEquiv: 'Expires', content: '0' }
      ];
      
      metaTags.forEach(meta => {
        let metaTag = document.querySelector(`meta[http-equiv="${meta.httpEquiv}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('http-equiv', meta.httpEquiv);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', meta.content);
      });
      
      console.log('[TelegramAppHeaders] Установлены мета-теги для отключения кеширования');
    }
    
    // Устанавливаем заголовок для всех fetch запросов
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      // Создаем новый объект init, если он отсутствует
      const modifiedInit = init || {};
      
      // Создаем новые заголовки, если они отсутствуют
      const modifiedHeaders = new Headers(modifiedInit.headers || {});
      
      try {
        // Устанавливаем заголовок Telegram
        modifiedHeaders.set('X-Telegram-App', 'true');
        
        // Добавляем заголовки для предотвращения кэширования
        modifiedHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        modifiedHeaders.set('Pragma', 'no-cache');
        modifiedHeaders.set('Expires', '0');
      } catch (error) {
        console.error('[TelegramAppHeaders] Ошибка при установке заголовков:', error);
      }
      
      // Обновляем заголовки в init
      modifiedInit.headers = modifiedHeaders;
      
      // Добавляем параметр времени к URL для предотвращения кеширования
      let url = typeof input === 'string' ? input : input.url;
      if (url && !url.includes('_next/static/') && !url.includes('_next/image')) {
        // Добавляем timestamp только к API запросам и динамическим маршрутам
        const urlObj = new URL(url, window.location.origin);
        urlObj.searchParams.set('_t', Date.now().toString());
        
        if (typeof input === 'string') {
          input = urlObj.toString();
        } else {
          input = new Request(urlObj.toString(), input);
        }
      
      // Выводим информацию о запросе в консоль для отладки
        if (url.includes('/api/')) {
          console.log('[TelegramAppHeaders] Перехвачен запрос к API:', urlObj.toString());
        }
      }
      
      // Вызываем оригинальный fetch с модифицированными параметрами
      return originalFetch.call(this, input, modifiedInit);
    };
    
    // Устанавливаем модифицированный XMLHttpRequest, если необходимо
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      // Добавляем параметр времени к URL для предотвращения кеширования
      let modifiedUrl = url;
      if (typeof url === 'string' && !url.includes('_next/static/') && !url.includes('_next/image')) {
        const urlObj = new URL(url, window.location.origin);
        urlObj.searchParams.set('_t', Date.now().toString());
        modifiedUrl = urlObj.toString();
      }
      
      // Вызываем оригинальный метод с модифицированным URL
      originalOpen.call(this, method, modifiedUrl, async === undefined ? true : async, user, password);
      
      // Добавляем заголовок для Telegram
      this.setRequestHeader('X-Telegram-App', 'true');
      this.setRequestHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      this.setRequestHeader('Pragma', 'no-cache');
      
      return this;
    };
    
    console.log('[TelegramAppHeaders] Заголовки Telegram успешно настроены');
    
    return () => {
      // Восстанавливаем оригинальный fetch и XMLHttpRequest при размонтировании компонента
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalOpen;
      console.log('[TelegramAppHeaders] Восстановлены оригинальные методы запросов');
    };
  }, []);
  
  return null;
} 