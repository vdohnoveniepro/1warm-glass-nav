
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "@/hooks/use-toast";

// Типы пользователей
export type UserRole = 'user' | 'specialist' | 'admin';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  telegramId?: string;
}

// Интерфейс контекста аутентификации
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginWithTelegram: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
}

// Создаем контекст аутентификации
const AuthContext = createContext<AuthContextType | null>(null);

// Провайдер аутентификации
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Инициализация - проверка сохраненной сессии
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Проверяем, есть ли сохраненный пользователь в localStorage
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.error('Ошибка проверки статуса аутентификации:', err);
        setError('Ошибка аутентификации');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Функция для входа через Telegram
  const loginWithTelegram = () => {
    // В реальном приложении здесь должен быть инициирован процесс OAuth с Telegram
    // Для демонстрационных целей создаем макет авторизации
    
    setLoading(true);
    setError(null);
    
    // Уведомление пользователя о том, что это демонстрационная версия авторизации
    toast({
      title: "Демо-режим авторизации",
      description: "В реальном приложении здесь будет настоящая авторизация через Telegram",
    });
    
    // Имитация успешного входа через Telegram
    setTimeout(() => {
      const mockUser: User = {
        id: 'tg_' + Date.now().toString(),
        name: 'Пользователь Telegram',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100&h=100&auto=format&fit=crop',
        role: 'user',
        telegramId: '123456789'
      };
      
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
      setLoading(false);
      
      // Уведомление об успешном входе
      toast({
        title: "Успешный вход",
        description: "Вы вошли через Telegram",
        variant: "success",
      });
    }, 1000);
  };
  
  // Функция для входа по электронной почте и паролю
  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // В реальном приложении здесь должен быть запрос к API
      // Для демонстрационных целей проверяем только наличие email и password
      
      if (!email || !password) {
        throw new Error('Введите email и пароль');
      }
      
      // Уведомление пользователя о том, что это демонстрационная версия авторизации
      toast({
        title: "Демо-режим авторизации",
        description: "В реальном приложении здесь будет настоящая авторизация",
      });
      
      // Имитация задержки API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        id: 'email_' + Date.now().toString(),
        name: email.split('@')[0],
        email,
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&h=100&auto=format&fit=crop'
      };
      
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      // Уведомление об успешном входе
      toast({
        title: "Успешный вход",
        description: "Вы вошли в свой аккаунт",
        variant: "success",
      });
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast({
          title: "Ошибка при входе",
          description: err.message,
          variant: "destructive",
        });
      } else {
        setError('Произошла ошибка при входе');
        toast({
          title: "Ошибка при входе",
          description: "Произошла неизвестная ошибка",
          variant: "destructive",
        });
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для входа через Google
  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // В реальном приложении здесь должна быть интеграция с Google OAuth
      
      // Уведомление пользователя о том, что это демонстрационная версия авторизации
      toast({
        title: "Демо-режим авторизации",
        description: "В реальном приложении здесь будет настоящая авторизация через Google",
      });
      
      // Имитация задержки API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        id: 'google_' + Date.now().toString(),
        name: 'Пользователь Google',
        email: 'user@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&h=100&auto=format&fit=crop',
        role: 'user'
      };
      
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      // Уведомление об успешном входе
      toast({
        title: "Успешный вход",
        description: "Вы вошли через Google",
        variant: "success",
      });
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast({
          title: "Ошибка при входе через Google",
          description: err.message,
          variant: "destructive",
        });
      } else {
        setError('Произошла ошибка при входе через Google');
        toast({
          title: "Ошибка при входе через Google",
          description: "Произошла неизвестная ошибка",
          variant: "destructive",
        });
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для регистрации
  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Проверка полей
      if (!name || !email || !password) {
        throw new Error('Пожалуйста, заполните все поля');
      }
      
      // Уведомление пользователя о том, что это демонстрационная версия регистрации
      toast({
        title: "Демо-режим регистрации",
        description: "В реальном приложении здесь будет настоящая регистрация",
      });
      
      // Имитация задержки API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        id: 'reg_' + Date.now().toString(),
        name,
        email,
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100&h=100&auto=format&fit=crop'
      };
      
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      // Уведомление об успешной регистрации
      toast({
        title: "Успешная регистрация",
        description: "Ваш аккаунт создан",
        variant: "success",
      });
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast({
          title: "Ошибка при регистрации",
          description: err.message,
          variant: "destructive",
        });
      } else {
        setError('Произошла ошибка при регистрации');
        toast({
          title: "Ошибка при регистрации",
          description: "Произошла неизвестная ошибка",
          variant: "destructive",
        });
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для выхода
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    
    // Уведомление о выходе
    toast({
      title: "Выход из аккаунта",
      description: "Вы успешно вышли из своего аккаунта",
    });
  };
  
  // Предоставляем контекст аутентификации
  const value = {
    user,
    loading,
    error,
    loginWithTelegram,
    loginWithEmail,
    loginWithGoogle,
    logout,
    register
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Хук для использования контекста аутентификации
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
