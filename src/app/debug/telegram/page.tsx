'use client';

import { useState, useEffect } from 'react';
import { isTelegramWebApp, getTelegramUser } from '@/lib/telegram-config';

export default function TelegramDebugPage() {
  const [telegramInfo, setTelegramInfo] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Проверяем, запущены ли мы в Telegram WebApp
    const isTelegram = isTelegramWebApp();
    const telegramUser = getTelegramUser();
    
    // Собираем информацию о Telegram WebApp
    const telegramData = {
      isTelegramWebApp: isTelegram,
      webAppAvailable: typeof window !== 'undefined' && !!window.Telegram?.WebApp,
      initDataAvailable: typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData,
      user: telegramUser,
      authToken: typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null,
      userDataInStorage: typeof localStorage !== 'undefined' ? localStorage.getItem('user_data') : null
    };
    
    setTelegramInfo(telegramData);
    
    if (typeof localStorage !== 'undefined' && localStorage.getItem('user_data')) {
      try {
        setUserData(JSON.parse(localStorage.getItem('user_data') || '{}'));
      } catch (e) {
        console.error('Ошибка при парсинге user_data из localStorage:', e);
      }
    }
  }, []);

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
          setUserData(data.data.user);
        }
        
        // Обновляем информацию о Telegram
        setTelegramInfo(prev => ({
          ...prev,
          authToken: localStorage.getItem('auth_token'),
          userDataInStorage: localStorage.getItem('user_data')
        }));
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

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      
      const telegramUser = getTelegramUser();
      if (!telegramUser || !telegramUser.id) {
        alert('Данные пользователя Telegram не доступны!');
        return;
      }
      
      // Отправляем запрос на создание пользователя
      const response = await fetch('/api/debug/telegram-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telegramId: telegramUser.id.toString(),
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          username: telegramUser.username,
          photoUrl: telegramUser.photo_url
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Пользователь ${data.data.action === 'created' ? 'создан' : 'найден'}! ID: ${data.data.user.id}`);
      } else {
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      alert(`Ошибка при создании пользователя: ${error}`);
      console.error('Ошибка при создании пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAuth = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUserData(null);
    setTelegramInfo(prev => ({
      ...prev,
      authToken: null,
      userDataInStorage: null
    }));
    alert('Данные авторизации очищены');
  };

  // Если не в Telegram WebApp, показываем сообщение
  if (telegramInfo && !telegramInfo.isTelegramWebApp) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Отладка Telegram Mini App</h1>
          <p className="text-red-500 mb-6">
            Эта страница должна быть открыта в Telegram Mini App!
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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">Отладка Telegram Mini App</h1>
        
        {/* Статус авторизации */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Статус авторизации:</h2>
          <div className={`p-3 rounded ${userData ? 'bg-green-100' : 'bg-red-100'}`}>
            {userData ? (
              <div>
                <p className="font-medium">Пользователь авторизован</p>
                <p>ID: {userData.id}</p>
                <p>Имя: {userData.firstName} {userData.lastName}</p>
                <p>Telegram ID: {userData.telegramId}</p>
                <p>Реферальный код: {userData.referralCode}</p>
              </div>
            ) : (
              <p>Пользователь не авторизован</p>
            )}
          </div>
        </div>
        
        {/* Кнопки управления */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleForceAuth}
            disabled={loading || !telegramInfo?.initDataAvailable}
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Загрузка...' : 'Принудительная авторизация'}
          </button>
          
          <button
            onClick={handleCreateUser}
            disabled={loading || !telegramInfo?.user}
            className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            Создать пользователя в БД
          </button>
          
          <button
            onClick={handleClearAuth}
            disabled={loading || !userData}
            className="w-full py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
          >
            Очистить авторизацию
          </button>
        </div>
        
        {/* Информация о Telegram */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Данные Telegram:</h2>
          <div className="bg-gray-100 p-3 rounded overflow-auto text-xs">
            <pre>{JSON.stringify(telegramInfo, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
} 