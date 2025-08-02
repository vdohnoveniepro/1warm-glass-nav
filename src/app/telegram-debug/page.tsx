'use client';

import { useState, useEffect } from 'react';
import { isTelegramWebApp, getTelegramInitData, getTelegramUser, notifyTelegramReady, expandTelegramWebApp } from '@/lib/telegram-config';

export default function TelegramDebugPage() {
  const [initData, setInitData] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isInTelegram, setIsInTelegram] = useState<boolean>(false);
  const [authResult, setAuthResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Проверяем, запущено ли приложение в Telegram WebApp
    const isTg = isTelegramWebApp();
    setIsInTelegram(isTg);
    
    if (isTg) {
      // Получаем данные инициализации Telegram
      const data = getTelegramInitData();
      setInitData(data);
      
      // Получаем данные пользователя
      const userData = getTelegramUser();
      setUser(userData);
      
      // Сообщаем Telegram, что приложение готово
      notifyTelegramReady();
      
      // Разворачиваем приложение на весь экран
      expandTelegramWebApp();
    }
  }, []);

  // Функция для отправки запроса на авторизацию
  const handleAuth = async () => {
    if (!initData) {
      setAuthResult({
        success: false,
        message: 'Отсутствуют данные инициализации Telegram'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setAuthResult(null);
      
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData }),
      });
      
      const data = await response.json();
      
      setAuthResult({
        success: response.ok && data.success,
        message: data.success 
          ? 'Авторизация успешна' 
          : `Ошибка: ${data.error || 'Неизвестная ошибка'}`,
        data: data
      });
    } catch (error) {
      setAuthResult({
        success: false,
        message: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Отладка авторизации Telegram</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h2 className="text-xl font-semibold mb-2">Статус Telegram WebApp</h2>
        <p className="mb-2">
          <span className="font-medium">В Telegram WebApp: </span>
          <span className={isInTelegram ? "text-green-600" : "text-red-600"}>
            {isInTelegram ? 'Да' : 'Нет'}
          </span>
        </p>
      </div>
      
      {isInTelegram && (
        <>
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-semibold mb-2">Данные пользователя</h2>
            {user ? (
              <div>
                <p><span className="font-medium">ID: </span>{user.id}</p>
                <p><span className="font-medium">Имя: </span>{user.first_name}</p>
                {user.last_name && <p><span className="font-medium">Фамилия: </span>{user.last_name}</p>}
                {user.username && <p><span className="font-medium">Username: </span>{user.username}</p>}
              </div>
            ) : (
              <p className="text-red-600">Данные пользователя недоступны</p>
            )}
          </div>
          
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-semibold mb-2">Данные инициализации</h2>
            {initData ? (
              <div className="overflow-auto max-h-40">
                <code className="text-xs break-all">{initData}</code>
              </div>
            ) : (
              <p className="text-red-600">Данные инициализации недоступны</p>
            )}
          </div>
          
          <div className="mb-4">
            <button
              onClick={handleAuth}
              disabled={isLoading || !initData}
              className={`px-4 py-2 rounded-lg ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading ? 'Авторизация...' : 'Авторизоваться через Telegram'}
            </button>
          </div>
          
          {authResult && (
            <div className={`bg-gray-100 p-4 rounded-lg mb-4 ${
              authResult.success ? 'border-green-500 border-2' : 'border-red-500 border-2'
            }`}>
              <h2 className="text-xl font-semibold mb-2">Результат авторизации</h2>
              <p className={authResult.success ? "text-green-600" : "text-red-600"}>
                {authResult.message}
              </p>
              {authResult.data && (
                <div className="mt-2">
                  <h3 className="font-medium">Данные ответа:</h3>
                  <pre className="bg-gray-200 p-2 rounded overflow-auto max-h-60 text-xs">
                    {JSON.stringify(authResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {!isInTelegram && (
        <div className="bg-yellow-100 p-4 rounded-lg border-yellow-500 border-2">
          <p className="text-yellow-800">
            Эта страница должна быть открыта в Telegram Mini App.
            Откройте её через бота @vdohnoveniepro_bot.
          </p>
        </div>
      )}
    </div>
  );
} 