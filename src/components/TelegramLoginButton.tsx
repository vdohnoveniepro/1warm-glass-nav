'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';
import { isTelegramWebApp, getTelegramInitData, TELEGRAM_MINI_APP_URL } from '@/lib/telegram-config';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        isExpanded: boolean;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (callback: Function) => void;
          offClick: (callback: Function) => void;
          showProgress: (leaveActive: boolean) => void;
          hideProgress: () => void;
          setText: (text: string) => void;
        };
      };
    };
  }
}

interface TelegramLoginButtonProps {
  redirectTo?: string;
  className?: string;
  text?: string;
}

export default function TelegramLoginButton({
  redirectTo = '/cabinet',
  className = '',
  text = 'Войти через Telegram'
}: TelegramLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { refreshUser, loginWithTelegram } = useAuth();

  useEffect(() => {
    // Проверяем, запущено ли приложение внутри Telegram WebApp
    const isTgWebApp = isTelegramWebApp();
    
    // Если это Telegram WebApp и есть данные пользователя, автоматически авторизуемся
    if (isTgWebApp && getTelegramInitData()) {
      handleTelegramLogin();
    }
  }, []);

  const handleTelegramLogin = async () => {
    const initData = getTelegramInitData();
    if (!initData) {
      toast.error('Не удалось получить данные Telegram');
      return;
    }

    try {
      setIsLoading(true);
      
      // Используем функцию из AuthContext для авторизации
      const success = await loginWithTelegram(initData, redirectTo);
      
      if (success) {
        toast.success('Вход через Telegram выполнен успешно');
      } else {
        toast.error('Ошибка при входе через Telegram');
      }
    } catch (error) {
      console.error('Ошибка при авторизации через Telegram:', error);
      toast.error('Произошла ошибка при авторизации через Telegram');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик для внешней авторизации через Telegram
  const handleExternalTelegramLogin = () => {
    // Открываем ссылку в новом окне
    window.open('https://t.me/vdohnoveniepro_bot/shop', '_blank');
  };

  return (
    <div className="relative pulse-container">
      <button
        onClick={handleExternalTelegramLogin}
        disabled={isLoading}
        className={`relative z-10 flex items-center justify-center py-2 px-4 bg-[#0088cc] text-white rounded-md hover:bg-[#0077b5] focus:outline-none focus:ring-2 focus:ring-[#0088cc] shadow-md transition-all duration-200 w-full text-sm font-medium ${className}`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Загрузка...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.376 0 0 5.376 0 12C0 18.624 5.376 24 12 24C18.624 24 24 18.624 24 12C24 5.376 18.624 0 12 0ZM17.568 8.16C17.388 10.056 16.608 14.664 16.212 16.788C16.044 17.688 15.708 18.024 15.396 18.06C14.7 18.132 14.172 17.604 13.5 17.16C12.444 16.464 11.844 16.032 10.824 15.36C9.636 14.592 10.404 14.172 11.088 13.464C11.268 13.272 14.34 10.44 14.4 10.188C14.412 10.152 14.412 10.044 14.352 9.996C14.292 9.948 14.2 9.96 14.136 9.972C14.052 9.984 12.36 11.1 9.06 13.32C8.58 13.656 8.148 13.812 7.764 13.8C7.332 13.788 6.504 13.56 5.868 13.368C5.1 13.128 4.5 13.008 4.548 12.588C4.572 12.372 4.872 12.156 5.46 11.928C8.964 10.356 11.292 9.312 12.444 8.808C15.672 7.32 16.476 7.032 17.028 7.032C17.148 7.032 17.424 7.056 17.604 7.2C17.76 7.32 17.808 7.488 17.82 7.608C17.832 7.68 17.868 7.932 17.568 8.16Z" fill="currentColor" />
            </svg>
            <span>{text}</span>
          </>
        )}
      </button>
      
      {/* Стили для пульсации */}
      <style jsx>{`
        .pulse-container {
          position: relative;
          z-index: 0;
        }
        
        .pulse-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 0.375rem;
          z-index: 5;
          box-shadow: 0 0 0 0 rgba(64, 224, 208, 0.65);
          animation: pulse 2.5s infinite ease-in-out;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(64, 224, 208, 0.65);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(64, 224, 208, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(64, 224, 208, 0);
          }
        }
      `}</style>
    </div>
  );
} 