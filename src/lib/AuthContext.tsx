'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { getCookie } from '../lib/utils';
import { User, UserRole } from '../models/types';
import { create } from 'zustand';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getUserRoleDisplayName, isAdmin, isSpecialist } from '@/utils/user-roles';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authToken: string | null;
  login: (email: string, password: string, redirectToProfile?: boolean) => Promise<boolean>;
  loginWithTelegram: (initData: string, redirectTo?: string) => Promise<boolean>;
  register: (userData: { firstName: string; lastName: string; email: string; password: string; phone?: string; }) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<boolean>;
  getAuthToken: () => string | null;
  updateUserInfo: (userData: Partial<User>) => void;
  showLoginModal: (returnUrl?: string, onSuccess?: () => void) => void;
}

// Создаем стор для управления состоянием модального окна авторизации
export const useAuthModalStore = create<{
  isOpen: boolean;
  returnUrl: string | null;
  onSuccess?: () => void;
  open: (returnUrl?: string | null, onSuccess?: () => void) => void;
  close: () => void;
}>((set) => ({
  isOpen: false,
  returnUrl: null,
  onSuccess: undefined,
  open: (returnUrl = null, onSuccess) => set({ isOpen: true, returnUrl, onSuccess }),
  close: () => set({ isOpen: false, returnUrl: null, onSuccess: undefined }),
}));

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authToken: null,
  login: async () => false,
  loginWithTelegram: async () => false,
  register: async () => false,
  logout: async () => {},
  refreshUser: async () => false,
  getAuthToken: () => null,
  updateUserInfo: () => {},
  showLoginModal: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Функция для загрузки данных пользователя
  const fetchUserData = useCallback(async (): Promise<{ user: User | null, token: string | null }> => {
    try {
      console.log("[AuthContext] Запрашиваем данные пользователя с сервера");
      const response = await fetch('/api/auth/me', {
        credentials: 'include' // Важно для работы с куками
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log("[AuthContext] Получен ответ от /api/auth/me:", { success: userData.success });
        
        if (userData.success) {
          const token = userData.data.token || null;
          
          // Сохраняем токен в localStorage для сохранения между обновлениями страницы
          if (token) {
            console.log("[AuthContext] Сохраняем полученный токен в localStorage");
            localStorage.setItem('auth_token', token);
          }
          
          return { user: userData.data.user, token };
        }
      }
      
      // Если не удалось получить данные с сервера, пробуем использовать кеш
      const cachedUser = localStorage.getItem('user_data');
      if (cachedUser) {
        try {
          console.log("[AuthContext] Используем кешированные данные пользователя");
          const parsedUser = JSON.parse(cachedUser);
          return { user: parsedUser, token: authToken || localStorage.getItem('auth_token') };
        } catch (e) {
          console.error("[AuthContext] Ошибка при разборе кешированных данных:", e);
        }
      }
      
      // При неудаче очищаем localStorage
      console.log("[AuthContext] Не удалось получить данные пользователя, очищаем кеш");
      // localStorage.removeItem('auth_token');  // Не удаляем токен при ошибке, может пригодиться
      return { user: null, token: null };
    } catch (error) {
      console.error('[AuthContext] Error fetching user data:', error);
      return { user: null, token: null };
    }
  }, [authToken]);

  // Мемоизируем getAuthToken
  const getAuthToken = useCallback((): string | null => {
    // Проверяем localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) return token;
      
      // Проверяем cookie через функцию getCookie
      const cookieToken = getCookie('auth_token');
      if (cookieToken) return cookieToken;
    }
    
    return null;
  }, []);

  // Проверка авторизации при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("[AuthContext] Проверка авторизации при загрузке страницы");
        
        // Проверяем наличие сессионного токена
        const sessionToken = getCookie('next-auth.session-token') || 
                           getCookie('__Secure-next-auth.session-token');
        const storedToken = localStorage.getItem('auth_token');
        const clientAuthToken = getCookie('client_auth_token');
        const authCookie = getCookie('auth_token');

        console.log("[AuthContext] Проверка токенов:", { 
          hasSessionToken: !!sessionToken, 
          hasStoredToken: !!storedToken,
          hasClientAuthToken: !!clientAuthToken,
          hasAuthCookie: !!authCookie
        });

        // Если найден токен, сразу устанавливаем isAuthenticated в true и восстанавливаем пользователя из localStorage
        if (storedToken || clientAuthToken || authCookie) {
          console.log("[AuthContext] Найден токен в localStorage или куки, устанавливаем флаг авторизации");
          setAuthToken(storedToken || clientAuthToken || authCookie);
          
          // Пробуем восстановить пользователя из localStorage
          const cachedUser = localStorage.getItem('user_data');
          if (cachedUser) {
            try {
              console.log("[AuthContext] Используем кешированные данные пользователя");
              const parsedUser = JSON.parse(cachedUser);
              setUser(parsedUser);
              setIsAuthenticated(true);
              console.log("[AuthContext] Пользователь восстановлен из localStorage:", parsedUser.email);
            } catch (e) {
              console.error("[AuthContext] Ошибка при разборе кешированных данных:", e);
            }
          }
        }

        if (!sessionToken && !storedToken && !clientAuthToken && !authCookie) {
          console.log("[AuthContext] Токены не найдены, пользователь не авторизован");
          setUser(null);
          setIsLoading(false);
          setIsAuthenticated(false);
          return;
        }

        // Загружаем данные пользователя с сервера
        const { user: fetchedUser, token } = await fetchUserData();
        
        if (fetchedUser) {
          console.log("[AuthContext] Пользователь получен успешно:", fetchedUser.email);
          
          // Специальная обработка для пользователя bakeevd@yandex.ru
          if (fetchedUser.email === 'bakeevd@yandex.ru') {
            console.log("[AuthContext] Обнаружен специальный пользователь bakeevd@yandex.ru, устанавливаем роль ADMIN");
            fetchedUser.role = UserRole.ADMIN;
          }
          
          setUser(fetchedUser);
          setIsAuthenticated(true);
          
          // Кешируем данные пользователя
          localStorage.setItem('user_data', JSON.stringify(fetchedUser));
          
          if (token) {
            setAuthToken(token);
            localStorage.setItem('auth_token', token);
          }
        } else {
          // Если не удалось получить пользователя, но есть кеш - используем его
          const cachedUser = localStorage.getItem('user_data');
          
          if (cachedUser) {
            try {
              console.log("[AuthContext] Не удалось получить пользователя с сервера, используем кеш");
              const parsedUser = JSON.parse(cachedUser);
              setUser(parsedUser);
              setIsAuthenticated(true);
            } catch (e) {
              console.error("[AuthContext] Ошибка при разборе кешированных данных:", e);
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            console.log("[AuthContext] Пользователь не найден ни на сервере, ни в кеше");
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error checking auth:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [fetchUserData]);

  // Функция для входа
  const login = async (email: string, password: string, redirectToProfile: boolean = true): Promise<boolean> => {
    try {
      console.log('[AuthContext] Начало процесса входа:', { email });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Важно для сохранения куки
      });
      
      console.log('[AuthContext] Ответ сервера:', { 
        status: response.status, 
        statusText: response.statusText 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthContext] Ошибка входа:', errorData);
        return false;
      }
      
      const data = await response.json();
      console.log('[AuthContext] Успешный вход, данные:', { 
        success: data.success, 
        hasToken: !!data.data?.token, 
        hasUser: !!data.data?.user 
      });
      
      if (data.success && data.data) {
        // Сохраняем пользователя в состоянии
        setUser(data.data.user);
        setIsAuthenticated(true);
        
        // Сохраняем данные пользователя в localStorage
        localStorage.setItem('user_data', JSON.stringify(data.data.user));
        
        // Сохраняем токен в localStorage и устанавливаем его в состоянии
        if (data.data.token) {
          setAuthToken(data.data.token);
          localStorage.setItem('auth_token', data.data.token);
          console.log('[AuthContext] Токен сохранен в localStorage, длина:', data.data.token.length);
        }
        
        console.log('[AuthContext] Состояние после входа:', { 
          isAuthenticated: true, 
          userId: data.data.user?.id 
        });
        
        // Обновляем заголовок авторизации для всех последующих запросов
        if (data.data.token) {
          const authHeader = `Bearer ${data.data.token}`;
          console.log('[AuthContext] Устанавливаем заголовок авторизации для будущих запросов');
        }
        
        // Показываем уведомление об успешном входе
        toast.success('Вы успешно вошли в систему');

        // Перенаправляем пользователя в кабинет только если указан флаг
        if (redirectToProfile) {
          router.push('/cabinet');
        }
        
        return true;
      }
      
      console.error('[AuthContext] Ошибка входа: неверный формат ответа от сервера');
      return false;
    } catch (error) {
      console.error('[AuthContext] Исключение при входе:', error);
      toast.error(error.message || 'Ошибка при входе');
      return false;
    }
  };

  // Функция для регистрации
  const register = async (userData: { firstName: string; lastName: string; email: string; password: string; phone?: string; }): Promise<boolean> => {
    try {
      console.log('[AuthContext] Начало процесса регистрации:', { email: userData.email });
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include', // Важно для сохранения куки
      });
      
      console.log('[AuthContext] Ответ сервера:', { 
        status: response.status, 
        statusText: response.statusText 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthContext] Ошибка регистрации:', errorData);
        return false;
      }
      
      const data = await response.json();
      console.log('[AuthContext] Успешная регистрация, данные:', { 
        success: data.success, 
        hasToken: !!data.data?.token, 
        hasUser: !!data.data?.user 
      });
      
      if (data.success && data.data) {
        // Сохраняем пользователя в состоянии
        setUser(data.data.user);
        setIsAuthenticated(true);
        
        // Сохраняем данные пользователя в localStorage
        localStorage.setItem('user_data', JSON.stringify(data.data.user));
        
        // Сохраняем токен в localStorage и устанавливаем его в состоянии
        if (data.data.token) {
          setAuthToken(data.data.token);
          localStorage.setItem('auth_token', data.data.token);
          console.log('[AuthContext] Токен сохранен в localStorage, длина:', data.data.token.length);
        }
        
        console.log('[AuthContext] Состояние после регистрации:', { 
          isAuthenticated: true, 
          userId: data.data.user?.id 
        });
        
        // Показываем уведомление об успешной регистрации
        toast.success('Вы успешно зарегистрировались');

        // Перенаправляем пользователя в кабинет
        router.push('/cabinet');
        
        return true;
      }
      
      console.error('[AuthContext] Ошибка регистрации: неверный формат ответа от сервера');
      return false;
    } catch (error) {
      console.error('[AuthContext] Исключение при регистрации:', error);
      toast.error(error.message || 'Ошибка при регистрации');
      return false;
    }
  };

  // Функция для выхода
  const logout = async (): Promise<void> => {
    try {
      console.log('[AuthContext] Начало процесса выхода');
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Важно для удаления куки
      });
      
      console.log('[AuthContext] Ответ сервера:', { 
        status: response.status, 
        statusText: response.statusText 
      });
      
      // Очищаем состояние и localStorage независимо от ответа сервера
      setUser(null);
      setIsAuthenticated(false);
      setAuthToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      console.log('[AuthContext] Состояние после выхода:', { 
        isAuthenticated: false, 
        user: null 
      });
      
      // Показываем уведомление об успешном выходе
      toast.success('Вы успешно вышли из системы');

      // Перенаправляем пользователя на главную страницу
      router.push('/');
    } catch (error) {
      console.error('[AuthContext] Исключение при выходе:', error);
      
      // Даже в случае ошибки, очищаем состояние и localStorage
      setUser(null);
      setIsAuthenticated(false);
      setAuthToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      // Показываем уведомление об успешном выходе
      toast.success('Вы успешно вышли из системы');

      // Перенаправляем пользователя на главную страницу
      router.push('/');
    }
  };

  // Функция для обновления данных пользователя
  const refreshUser = async (): Promise<boolean> => {
    try {
      console.log('[AuthContext] Начало обновления данных пользователя');
      
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Важно для передачи куки
        cache: 'no-store', // Отключаем кеширование
      });
      
      console.log('[AuthContext] Ответ на запрос данных пользователя:', { 
        status: response.status, 
        statusText: response.statusText 
      });
      
      if (!response.ok) {
        console.error('[AuthContext] Ошибка при получении данных пользователя:', response.status, response.statusText);
        return false;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('[AuthContext] Ошибка в ответе API:', data.message || 'Неизвестная ошибка');
        return false;
      }
      
      // Проверяем наличие данных пользователя
      if (!data.data || !data.data.user) {
        console.error('[AuthContext] Данные пользователя отсутствуют в ответе API');
        return false;
      }
      
      // Обновляем данные пользователя
      const userData = data.data.user;
      
      // Проверяем и обрабатываем избранное
      if (userData) {
        // Проверяем, есть ли у пользователя поле favorites
        if (!userData.favorites) {
          console.log('[AuthContext] Избранное отсутствует, создаем пустую структуру');
          userData.favorites = {
            articles: [],
            services: [],
            specialists: []
          };
        } 
        // Если избранное - строка, пробуем распарсить JSON
        else if (typeof userData.favorites === 'string') {
          try {
            console.log('[AuthContext] Избранное в формате строки, парсим JSON');
            userData.favorites = JSON.parse(userData.favorites);
          } catch (error) {
            console.error('[AuthContext] Ошибка при парсинге JSON избранного:', error);
            userData.favorites = {
              articles: [],
              services: [],
              specialists: []
            };
          }
        }
        
        // Проверяем структуру избранного
        if (!userData.favorites.articles) userData.favorites.articles = [];
        if (!userData.favorites.services) userData.favorites.services = [];
        if (!userData.favorites.specialists) userData.favorites.specialists = [];
        
        // Проверяем, что массивы действительно массивы
        if (!Array.isArray(userData.favorites.articles)) userData.favorites.articles = [];
        if (!Array.isArray(userData.favorites.services)) userData.favorites.services = [];
        if (!Array.isArray(userData.favorites.specialists)) userData.favorites.specialists = [];
      }
      
      // Обновляем состояние
      setUser(userData);
      setIsAuthenticated(true);
      
      // Обновляем токен, если он есть в ответе
      if (data.data.token) {
        console.log('[AuthContext] Обновляем токен авторизации');
        setAuthToken(data.data.token);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.data.token);
        }
      }
      
      console.log('[AuthContext] Данные пользователя успешно обновлены');
      
      // Обновляем данные в localStorage для кеширования между сессиями
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('user_data', JSON.stringify(userData));
        } catch (error) {
          console.error('[AuthContext] Ошибка при сохранении данных пользователя в localStorage:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('[AuthContext] Ошибка при обновлении данных пользователя:', error);
      return false;
    }
  };

  // Добавим функцию для дебаунсинга запросов
  function debounce<F extends (...args: any[]) => any>(
    fn: F,
    delay: number
  ): (...args: Parameters<F>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return function(...args: Parameters<F>) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    };
  }

  // Кеширование результатов запросов
  interface RequestCache {
    [key: string]: {
      data: any;
      timestamp: number;
    }
  }

  const requestCache: RequestCache = {};
  const CACHE_TTL = 5000; // 5 секунд

  // Аутентификация с использованием данных Telegram
  const loginWithTelegram = async (initData: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Создаем кеш-ключ на основе данных инициализации
      const cacheKey = `telegram-auth-${initData.substring(0, 50)}`;
      
      // Проверяем, есть ли кешированный результат
      const now = Date.now();
      const cachedResult = requestCache[cacheKey];
      
      if (cachedResult && (now - cachedResult.timestamp < CACHE_TTL)) {
        console.log('[AuthContext] Используем кешированный результат авторизации Telegram');
        
        if (cachedResult.data.success) {
          setUser(cachedResult.data.user);
        }
        
        return cachedResult.data;
      }
      
      // Проверяем наличие сохраненного реферального кода
      let referralCode: string | null = null;
      
      if (typeof window !== 'undefined') {
        // Пытаемся получить реферальный код из localStorage
        referralCode = localStorage.getItem('telegram_referral_code');
        
        // Если он есть, сразу удаляем его, чтобы использовать только один раз
        if (referralCode) {
          console.log('[AuthContext] Найден сохраненный реферальный код:', referralCode);
          localStorage.removeItem('telegram_referral_code');
        }
      }
      
      setIsLoading(true);
      console.log('[AuthContext] Отправка запроса авторизации через Telegram', referralCode ? 'с реферальным кодом: ' + referralCode : 'без реферального кода');
      
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-App': 'true'
        },
        body: JSON.stringify({ 
          initData,
          referralCode // Добавляем реферальный код, если он есть
        })
      });
      
      const data = await response.json();
      
      // Кешируем результат
      requestCache[cacheKey] = {
        data: data,
        timestamp: Date.now()
      };
      
      if (data.success) {
        console.log('[AuthContext] Успешная авторизация через Telegram:', data.user?.id);
        
        // Сохраняем данные пользователя
        setUser(data.user);
        
        // Сохраняем токен в localStorage для последующих запросов
        if (typeof window !== 'undefined' && data.token) {
          localStorage.setItem('auth_token', data.token);
        }
        
        setIsLoading(false);
        return { success: true };
      } else {
        console.error('[AuthContext] Ошибка авторизации через Telegram:', data.error);
        setIsLoading(false);
        return { success: false, error: data.error };
      }
    } catch (error: any) {
      console.error('[AuthContext] Ошибка при авторизации через Telegram:', error);
      setIsLoading(false);
      return { success: false, error: error.message || 'Ошибка при авторизации через Telegram' };
    }
  };

  // Дебаунсированная версия функции авторизации через Telegram
  const debouncedLoginWithTelegram = (initData: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const execute = debounce(async () => {
        const result = await loginWithTelegram(initData);
        resolve(result);
      }, 300);
      
      execute();
    });
  };

  // Функция для обновления данных пользователя без запроса к серверу
  const updateUserInfo = (userData: Partial<User>): void => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      
      // Кешируем обновленные данные
      localStorage.setItem('user_data', JSON.stringify(updated));
      
      return updated;
    });
  };

  // Функция для открытия модального окна авторизации
  const showLoginModal = useCallback((returnUrl?: string, onSuccess?: () => void) => {
    console.log('[AuthContext] Открываем модальное окно авторизации:', { returnUrl, hasCallback: !!onSuccess });
    useAuthModalStore.getState().open(returnUrl || null, onSuccess);
  }, []);

  // Мемоизируем значение контекста
  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      authToken,
      login,
      loginWithTelegram: debouncedLoginWithTelegram,
      register,
      logout,
      refreshUser,
      getAuthToken,
      updateUserInfo,
      showLoginModal,
    }),
    [user, isLoading, isAuthenticated, authToken, getAuthToken, showLoginModal]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Вспомогательная функция для получения токена авторизации,
// которую можно использовать в любом месте приложения
export const getAuthTokenStatic = (): string | null => {
  // Проверяем localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) return token;
    
    // Проверяем cookie через функцию getCookie
    const cookieToken = getCookie('auth_token');
    if (cookieToken) return cookieToken;
  }
  
  return null;
};

// Функции для проверки ролей пользователя
export function useIsAdmin() {
  const { user } = useAuth();
  return isAdmin(user);
}

export function useIsSpecialist() {
  const { user } = useAuth();
  return isSpecialist(user);
}

export function useUserRoleDisplay() {
  const { user } = useAuth();
  return user ? getUserRoleDisplayName(user.role) : '';
}
