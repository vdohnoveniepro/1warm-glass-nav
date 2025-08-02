'use client';

import { useState, useEffect } from 'react';
import { isTelegramWebApp } from '@/lib/telegram-config';

export default function TelegramAuthDebugPage() {
  const [telegramInfo, setTelegramInfo] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    // Проверяем, запущены ли мы в Telegram WebApp
    const isTelegram = isTelegramWebApp();
    
    // Получаем информацию о Telegram WebApp
    const telegramData = {
      isTelegramWebApp: isTelegram,
      webAppAvailable: typeof window !== 'undefined' && !!window.Telegram?.WebApp,
      initDataAvailable: typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData,
      startParam: typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.start_param,
      userData: typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user
    };
    
    setTelegramInfo(telegramData);
    
    // Получаем информацию о состоянии авторизации
    const authData = {
      hasAuthToken: typeof localStorage !== 'undefined' && !!localStorage.getItem('auth_token'),
      hasUserData: typeof localStorage !== 'undefined' && !!localStorage.getItem('user_data'),
      userData: typeof localStorage !== 'undefined' ? 
        JSON.parse(localStorage.getItem('user_data') || '{}') : null
    };
    
    setAuthStatus(authData);
  }, [refreshCount]);

  const handleForceAuth = async () => {
    try {
      setLoading(true);
      
      if (!window.Telegram?.WebApp?.initData) {
        alert('Telegram WebApp не инициализирован!');
        return;
      }
      
      // Очищаем текущие данные авторизации
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      // Отправляем запрос на авторизацию
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-App': 'true'
        },
        body: JSON.stringify({ 
          initData: window.Telegram.WebApp.initData 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Авторизация успешна! Пользователь: ${data.data?.user?.firstName || 'Неизвестно'}`);
        
        // Сохраняем токен в localStorage
        if (data.data?.token) {
          localStorage.setItem('auth_token', data.data.token);
        }
        
        // Сохраняем данные пользователя
        if (data.data?.user) {
          localStorage.setItem('user_data', JSON.stringify(data.data.user));
        }
        
        // Обновляем состояние
        setRefreshCount(prev => prev + 1);
      } else {
        alert(`Ошибка авторизации: ${data.error}`);
      }
    } catch (error) {
      alert(`Ошибка при авторизации: ${error}`);
      console.error('Ошибка при авторизации:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAuth = async () => {
    try {
      setLoading(true);
      
      // Получаем telegramId из данных пользователя
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      const telegramId = userData?.telegramId;
      
      if (!telegramId) {
        alert('telegramId не найден в данных пользователя');
        return;
      }
      
      // Отправляем запрос на проверку
      const response = await fetch(`/api/debug/telegram?telegramId=${telegramId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          'X-Telegram-App': 'true',
          'X-Telegram-ID': telegramId
        }
      });
      
      const data = await response.json();
      
      // Отображаем результаты
      alert(`Результаты диагностики:\n` +
        `Авторизован: ${data.data?.isAuthenticated ? 'Да' : 'Нет'}\n` +
        `Пользователь в БД: ${data.data?.dbCheck?.userFound ? 'Найден' : 'Не найден'}`);
      
      console.log('Диагностика авторизации:', data);
    } catch (error) {
      alert(`Ошибка при проверке авторизации: ${error}`);
      console.error('Ошибка при проверке авторизации:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAuth = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setRefreshCount(prev => prev + 1);
    alert('Данные авторизации очищены');
  };

  // Если не в Telegram WebApp, показываем сообщение
  if (telegramInfo && !telegramInfo.isTelegramWebApp) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Страница диагностики Telegram</h1>
          <p className="text-red-500 mb-6">
            Эта страница должна быть открыта в Telegram WebApp!
          </p>
          <div className="bg-yellow-50 p-4 rounded-md text-left">
            <h2 className="font-semibold">Информация:</h2>
            <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(telegramInfo, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Диагностика Telegram-авторизации</h1>
        
        {/* Статус авторизации */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Статус авторизации:</h2>
          <div className={`p-2 rounded ${authStatus?.hasAuthToken ? 'bg-green-100' : 'bg-red-100'}`}>
            {authStatus?.hasAuthToken ? (
              <p>Пользователь авторизован: {authStatus?.userData?.firstName} {authStatus?.userData?.lastName}</p>
            ) : (
              <p>Пользователь не авторизован</p>
            )}
          </div>
        </div>
        
        {/* Информация о Telegram */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Telegram WebApp:</h2>
          <div className="bg-gray-100 p-2 rounded">
            <p>WebApp доступен: {telegramInfo?.webAppAvailable ? 'Да' : 'Нет'}</p>
            <p>initData доступен: {telegramInfo?.initDataAvailable ? 'Да' : 'Нет'}</p>
            <p>startParam: {telegramInfo?.startParam || 'Нет'}</p>
            {telegramInfo?.userData && (
              <p>Пользователь: {telegramInfo.userData.first_name} {telegramInfo.userData.last_name}</p>
            )}
          </div>
        </div>
        
        {/* Кнопки управления */}
        <div className="space-y-4">
          <button
            onClick={handleForceAuth}
            disabled={loading || !telegramInfo?.initDataAvailable}
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Загрузка...' : 'Принудительно авторизоваться'}
          </button>
          
          <button
            onClick={handleCheckAuth}
            disabled={loading || !authStatus?.hasAuthToken}
            className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            Проверить состояние авторизации
          </button>
          
          <button
            onClick={handleClearAuth}
            disabled={loading || !authStatus?.hasAuthToken}
            className="w-full py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
          >
            Очистить данные авторизации
          </button>
        </div>
        
        {/* Подробная информация */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Подробная информация:</h2>
          <div className="bg-gray-100 p-2 rounded overflow-auto text-xs">
            <pre>{JSON.stringify({ telegramInfo, authStatus }, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
} 