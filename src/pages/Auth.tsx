
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, LogIn, MessageCircle, Globe } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register';

const Auth = () => {
  const navigate = useNavigate();
  const { loginWithEmail, loginWithTelegram, loginWithGoogle, register, loading, error } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  // Переключение между режимами входа и регистрации
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setFormError(null);
  };
  
  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        navigate('/profile');
      } else {
        // Проверка полей при регистрации
        if (!name.trim()) {
          setFormError('Введите ваше имя');
          return;
        }
        await register(name, email, password);
        navigate('/profile');
      }
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Произошла ошибка');
      }
    }
  };
  
  // Вход через Telegram
  const handleTelegramLogin = () => {
    loginWithTelegram();
    navigate('/profile');
  };
  
  // Вход через Google
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/profile');
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Произошла ошибка при входе через Google');
      }
    }
  };
  
  return (
    <Layout hideNavbar>
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold mb-2 text-warmgray-800">
              {mode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}
            </h1>
            <p className="text-warmgray-600">
              {mode === 'login' 
                ? 'Войдите в свой аккаунт или создайте новый' 
                : 'Заполните форму для создания аккаунта'}
            </p>
          </div>
          
          {/* Форма входа/регистрации */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {mode === 'register' && (
              <div className="relative">
                <div className="absolute left-3 top-3.5 text-gray-500">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 pl-10 frosted-glass rounded-lg"
                  required
                />
              </div>
            )}
            
            <div className="relative">
              <div className="absolute left-3 top-3.5 text-gray-500">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                placeholder="Электронная почта"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 pl-10 frosted-glass rounded-lg"
                required
              />
            </div>
            
            <div className="relative">
              <div className="absolute left-3 top-3.5 text-gray-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pl-10 frosted-glass rounded-lg"
                required
              />
            </div>
            
            {formError && (
              <p className="text-red-500 text-sm">{formError}</p>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              <LogIn className="w-4 h-4 mr-2" />
              {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>
          </form>
          
          {/* Разделитель */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <p className="px-3 text-sm text-gray-500">или</p>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>
          
          {/* Социальные сети */}
          <div className="space-y-3">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex items-center justify-center"
              onClick={handleTelegramLogin}
            >
              <MessageCircle className="w-5 h-5 mr-2 text-blue-500" />
              Войти через Telegram
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex items-center justify-center"
              onClick={handleGoogleLogin}
            >
              <Globe className="w-5 h-5 mr-2 text-red-500" />
              Войти через Google
            </Button>
          </div>
          
          {/* Переключение режима */}
          <div className="text-center mt-6">
            <button 
              type="button" 
              className="text-indigo-600 text-sm"
              onClick={toggleMode}
            >
              {mode === 'login' 
                ? 'Еще нет аккаунта? Зарегистрироваться' 
                : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
