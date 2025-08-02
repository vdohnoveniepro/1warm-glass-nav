'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { FaSpinner, FaTimes, FaUser, FaLock, FaEnvelope, FaUserPlus, FaPhone, FaGoogle } from 'react-icons/fa';
import { toastService } from './ui/Toast';
import { signIn } from 'next-auth/react';

interface LoginModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  onSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen = true, onClose, onLoginSuccess, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Обработчик клика за пределами модального окна
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Сброс формы при закрытии
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setError(null);
    }
  }, [isOpen]);
  
  // Обработчик входа
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    console.log("LoginModal: handleLogin started", { email });
    
    try {
      const success = await login(email, password);
      console.log("LoginModal: login result", { success });
      
      if (success) {
        if (onLoginSuccess) {
          console.log("LoginModal: calling onLoginSuccess callback");
          onLoginSuccess();
        }
        if (onSuccess) {
          console.log("LoginModal: calling onSuccess callback");
          onSuccess();
        }
      } else {
        setError('Неверный email или пароль');
        toastService.error('Неверный email или пароль');
      }
    } catch (err) {
      console.error("LoginModal: login error", err);
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка при входе';
      setError(errorMessage);
      toastService.error(errorMessage);
    } finally {
      console.log("LoginModal: handleLogin completed");
      setIsLoading(false);
    }
  };
  
  // Обработчик регистрации
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!firstName || !lastName || !email || !password || !phone) {
      setError('Заполните все поля');
      toastService.error('Заполните все поля');
      return;
    }
    
    // Валидация пароля при регистрации
    if (password.length < 4) {
      setError('Пароль должен содержать не менее 4 символов');
      toastService.error('Пароль должен содержать не менее 4 символов');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await register({ firstName, lastName, email, password, phone });
      if (success) {
        if (onLoginSuccess) onLoginSuccess();
        if (onSuccess) onSuccess();
      } else {
        const errorMsg = 'Не удалось зарегистрироваться. Возможно, email уже занят.';
        setError(errorMsg);
        toastService.error(errorMsg);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка при регистрации';
      setError(errorMessage);
      toastService.error(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для входа через Google
  const handleGoogleLogin = async () => {
    try {
      // Вызываем функцию входа через Google из next-auth
      await signIn('google', { callbackUrl: window.location.href });
    } catch (error) {
      toastService.error('Ошибка при входе через Google');
      console.error('Google login error:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <FaTimes size={20} />
        </button>
        
        <div className="flex justify-center mb-4">
          <div
            className={`text-center px-4 py-2 border-b-2 cursor-pointer ${
              mode === 'login' 
                ? 'border-[#48a9a6] text-[#48a9a6] font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setMode('login')}
          >
            Вход
          </div>
          <div
            className={`text-center px-4 py-2 border-b-2 cursor-pointer ${
              mode === 'register'
                ? 'border-[#48a9a6] text-[#48a9a6] font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setMode('register')}
          >
            Регистрация
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md mb-4 text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                  placeholder="Ваш email"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                  placeholder="Ваш пароль"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? <FaSpinner className="mr-2 animate-spin" /> : <FaUser className="mr-2" />}
              Войти
            </button>
            
            {/* Разделитель */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Или войдите через</span>
              </div>
            </div>
            
            {/* Кнопки соцсетей */}
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#48a9a6] transition-colors"
              >
                <FaGoogle className="text-red-500" />
                Войти через Google
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="firstName">
                  Имя
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                  placeholder="Ваше имя"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="lastName">
                  Фамилия
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                  placeholder="Ваша фамилия"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="regEmail">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  id="regEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                  placeholder="Ваш email"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="phone">
                Телефон
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaPhone className="text-gray-400" />
                </div>
                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                  placeholder="Ваш телефон"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="regPassword">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  id="regPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                  placeholder="Минимум 6 символов"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? <FaSpinner className="mr-2 animate-spin" /> : <FaUserPlus className="mr-2" />}
              Зарегистрироваться
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginModal; 