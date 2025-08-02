/**
 * Конфигурация для интеграции с Telegram Mini App
 */

// ID бота Telegram
export const TELEGRAM_BOT_ID = '7365896423';

// Токен бота Telegram (используется только на сервере)
export const TELEGRAM_BOT_TOKEN = '7365896423:AAF9RJwe0SOD-Guh68ei7k_ccGYWusyHIs4';

// Имя бота Telegram
export const TELEGRAM_BOT_USERNAME = 'vdohnoveniepro_bot';

// URL для открытия бота в Telegram
export const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

// URL для открытия Mini App в Telegram
export const TELEGRAM_MINI_APP_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}/shop`;

// Проверка, запущено ли приложение внутри Telegram WebApp
export const isTelegramWebApp = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    
    // Проверяем существование объекта Telegram и WebApp
    const telegramExists = window.Telegram !== undefined;
    const webAppExists = telegramExists && window.Telegram?.WebApp !== undefined;
    
    return telegramExists && webAppExists;
  } catch (error) {
    console.error('[telegram-config] Ошибка при проверке Telegram WebApp:', error);
    return false;
  }
};

// Проверка, инициализирован ли Telegram WebApp
export const isTelegramInitialized = (): boolean => {
  try {
    if (!isTelegramWebApp()) return false;
    
    // Проверяем, что данные инициализации существуют
    return !!window.Telegram?.WebApp?.initData && 
           window.Telegram.WebApp.initData.length > 0;
  } catch (error) {
    console.error('[telegram-config] Ошибка при проверке инициализации Telegram WebApp:', error);
    return false;
  }
};

// Получение данных пользователя из Telegram WebApp
export const getTelegramUser = () => {
  try {
    if (!isTelegramWebApp()) return null;
    
    const webApp = window.Telegram?.WebApp;
    if (!webApp || !webApp.initDataUnsafe) return null;
    
    return webApp.initDataUnsafe.user || null;
  } catch (error) {
    console.error('[telegram-config] Ошибка при получении данных пользователя Telegram:', error);
    return null;
  }
};

// Получение параметров запуска из Telegram WebApp (startapp)
export const getTelegramStartParam = (): string | null => {
  try {
    if (!isTelegramWebApp()) return null;
    
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return null;
    
    // Получаем startParam из WebApp - это параметр после "?startapp="
    if ('startParams' in webApp) {
      return webApp.startParams || null;
    } else if ('StartParams' in webApp) {
      return webApp.StartParams || null;
    } else if ('initDataUnsafe' in webApp && webApp.initDataUnsafe && 'start_param' in webApp.initDataUnsafe) {
      // В некоторых версиях API параметр может быть здесь
      return webApp.initDataUnsafe.start_param || null;
    } else {
      // Пробуем получить из URL для совместимости
      try {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('startapp') || null;
      } catch (e) {
        return null;
      }
    }
  } catch (error) {
    console.error('[telegram-config] Ошибка при получении startParam Telegram:', error);
    return null;
  }
};

// Получение initData из Telegram WebApp
export const getTelegramInitData = (): string => {
  try {
    if (!isTelegramWebApp()) return '';
    
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return '';
    
    return webApp.initData || '';
  } catch (error) {
    console.error('[telegram-config] Ошибка при получении initData Telegram:', error);
    return '';
  }
};

// Сообщить Telegram WebApp, что приложение готово
export const notifyTelegramReady = (): void => {
  try {
    if (!isTelegramWebApp()) return;
    
    const webApp = window.Telegram?.WebApp;
    if (!webApp || typeof webApp.ready !== 'function') return;
    
    webApp.ready();
    console.log('[telegram-config] Успешно вызван метод ready()');
  } catch (error) {
    console.error('[telegram-config] Ошибка при вызове ready():', error);
  }
};

// Развернуть Telegram WebApp на весь экран
export const expandTelegramWebApp = (): void => {
  try {
    if (!isTelegramWebApp()) return;
    
    const webApp = window.Telegram?.WebApp;
    if (!webApp || typeof webApp.expand !== 'function') return;
    
    // Проверяем, не развернуто ли уже приложение
    if (webApp.isExpanded) {
      console.log('[telegram-config] WebApp уже развернут');
      return;
    }
    
    webApp.expand();
    console.log('[telegram-config] Успешно вызван метод expand()');
  } catch (error) {
    console.error('[telegram-config] Ошибка при вызове expand():', error);
  }
};

// Закрыть Telegram WebApp
export const closeTelegramWebApp = (): void => {
  try {
    if (!isTelegramWebApp()) return;
    
    const webApp = window.Telegram?.WebApp;
    if (!webApp || typeof webApp.close !== 'function') return;
    
    webApp.close();
    console.log('[telegram-config] Успешно вызван метод close()');
  } catch (error) {
    console.error('[telegram-config] Ошибка при вызове close():', error);
  }
}; 