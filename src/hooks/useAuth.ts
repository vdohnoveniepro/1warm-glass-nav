// Хук для авторизации пользователя
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Интерфейс для пользователя
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  avatar?: string;
  telegramId?: string;
  telegramUsername?: string;
}

// Интерфейс для состояния авторизации
export interface AuthState {
  isAuthenticated: boolean;
  user: User | undefined;
  isLoading: boolean;
  error: string | null;
}

// Функция для получения авторизованного пользователя
async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log('[useAuth] Запрос /api/auth/me, статус:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[useAuth] Ошибка при получении пользователя:', errorData);
      
      // Если ошибка 401, очищаем куки и localStorage
      if (response.status === 401) {
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'client_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'user_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
      
      return null;
    }

    const data = await response.json();
    console.log('[useAuth] Получены данные пользователя:', data);
    
    if (data.success && data.data) {
      // Сохраняем токен в localStorage для использования в других запросах
      if (data.data.token) {
        localStorage.setItem('auth_token', data.data.token);
      }
      
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error('[useAuth] Ошибка при получении пользователя:', error);
    return null;
  }
}

// Хук для авторизации
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: undefined,
    isLoading: true,
    error: null
  });
  
  const router = useRouter();
  
  // Функция для обновления состояния авторизации
  const checkAuth = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Проверяем наличие токена в localStorage или в куках
      const token = localStorage.getItem('auth_token') || getCookie('auth_token') || getCookie('client_auth_token');
      
      if (!token) {
        console.log('[useAuth] Токен не найден, пользователь не авторизован');
        setAuthState({
          isAuthenticated: false,
          user: undefined,
          isLoading: false,
          error: null
        });
        return;
      }
      
      // Получаем пользователя
      const user = await fetchCurrentUser();
      
      if (!user) {
        console.log('[useAuth] Пользователь не найден, сбрасываем авторизацию');
        setAuthState({
          isAuthenticated: false,
          user: undefined,
          isLoading: false,
          error: 'Не удалось получить данные пользователя'
        });
        
        // Очищаем токен если пользователь не найден
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        return;
      }
      
      console.log('[useAuth] Пользователь авторизован:', user);
      
      // Сохраняем пользователя
      localStorage.setItem('user', JSON.stringify(user));
      
      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('[useAuth] Ошибка при проверке авторизации:', error);
      setAuthState({
        isAuthenticated: false,
        user: undefined,
        isLoading: false,
        error: 'Ошибка при проверке авторизации'
      });
    }
  }, []);
  
  // Функция для выхода из аккаунта
  const logout = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при выходе из аккаунта');
      }
      
      // Очищаем токен и данные пользователя
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Очищаем куки
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'client_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'user_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      setAuthState({
        isAuthenticated: false,
        user: undefined,
        isLoading: false,
        error: null
      });
      
      // Перенаправляем на главную
      router.push('/');
      toast.success('Вы успешно вышли из аккаунта');
    } catch (error) {
      console.error('[useAuth] Ошибка при выходе из аккаунта:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Ошибка при выходе из аккаунта'
      }));
      toast.error('Ошибка при выходе из аккаунта');
    }
  }, [router]);
  
  // Функция для входа через Telegram
  const loginWithTelegram = useCallback(async (telegramData: any) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(telegramData),
        credentials: 'include'
      });
      
      console.log('[useAuth] Ответ от /api/auth/telegram:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[useAuth] Ошибка при входе через Telegram:', errorData);
        throw new Error(errorData.error || 'Ошибка при входе через Telegram');
      }
      
      const data = await response.json();
      console.log('[useAuth] Данные после входа через Telegram:', data);
      
      if (data.success && data.data) {
        // Сохраняем токен и данные пользователя
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data));
        
        setAuthState({
          isAuthenticated: true,
          user: data.data,
          isLoading: false,
          error: null
        });
        
        // Перенаправляем в кабинет
        router.push('/cabinet');
        toast.success('Вы успешно вошли в аккаунт');
        return true;
      }
      
      throw new Error('Не удалось войти через Telegram');
    } catch (error: any) {
      console.error('[useAuth] Ошибка при входе через Telegram:', error);
      setAuthState({
        isAuthenticated: false,
        user: undefined,
        isLoading: false,
        error: error.message || 'Ошибка при входе через Telegram'
      });
      toast.error(error.message || 'Ошибка при входе через Telegram');
      return false;
    }
  }, [router]);
  
  // При монтировании компонента проверяем авторизацию
  useEffect(() => {
    // Проверяем, есть ли данные пользователя в localStorage
    const storedUser = localStorage.getItem('user');
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        console.log('[useAuth] Найден пользователь в localStorage:', user);
        
        // Временно устанавливаем пользователя из localStorage
        setAuthState({
          isAuthenticated: true,
          user,
          isLoading: true,
          error: null
        });
      } catch (error) {
        console.error('[useAuth] Ошибка при разборе пользователя из localStorage:', error);
      }
    }
    
    // Проверяем авторизацию на сервере
    checkAuth();
  }, [checkAuth]);
  
  // Проверяем наличие параметров Telegram в URL
  useEffect(() => {
    const handleTelegramAuth = async () => {
      // Проверяем, есть ли параметр telegramAuth в URL
      const urlParams = new URLSearchParams(window.location.search);
      const isTelegramAuth = urlParams.get('telegramAuth') === 'true';
      
      if (!isTelegramAuth) return;
      
      // Получаем данные Telegram из URL
      const telegramDataString = urlParams.get('telegramData');
      
      if (!telegramDataString) {
        console.error('[useAuth] Параметр telegramData не найден в URL');
        return;
      }
      
      try {
        const telegramData = JSON.parse(telegramDataString);
        console.log('[useAuth] Найдены данные Telegram в URL:', telegramData);
        
        // Входим через Telegram
        await loginWithTelegram(telegramData);
        
        // Очищаем URL от параметров Telegram
        const url = new URL(window.location.href);
        url.searchParams.delete('telegramAuth');
        url.searchParams.delete('telegramData');
        window.history.replaceState({}, document.title, url.toString());
      } catch (error) {
        console.error('[useAuth] Ошибка при обработке данных Telegram из URL:', error);
      }
    };
    
    handleTelegramAuth();
  }, [loginWithTelegram]);
  
  // Возвращаем состояние и функции
  return {
    ...authState,
    logout,
    loginWithTelegram,
    checkAuth
  };
}

// Функция для получения значения куки
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  
  return null;
}

export default useAuth; 