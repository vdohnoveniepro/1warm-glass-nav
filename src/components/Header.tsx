'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaSearch } from 'react-icons/fa';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';

interface User {
  firstName: string;
  lastName?: string;
}

const Header = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isAuthenticated, user, isLoading } = useAuth();
  const pathname = usePathname();

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  // Добавляем отладочный лог для проверки состояния авторизации
  useEffect(() => {
    console.log('[Header] Состояние авторизации:', { 
      isAuthenticated, 
      user: user ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        role: user.role
      } : undefined,
      isLoading
    });
  }, [isAuthenticated, user, isLoading]);

  return (
    <header className="bg-[#EAE8E1] py-2 px-2 sm:px-4">
      {/* Логотип */}
      <div className="text-center mb-3">
        <div className="flex items-center justify-center">
          <span className="text-3xl font-medium text-gray-700">ВДОХН</span>
          <div className="relative w-10 h-10 mx-[-2px]">
            <Image 
              src="/images/logo-flower.png" 
              alt="О" 
              fill 
              className="object-contain"
            />
          </div>
          <span className="text-3xl font-medium text-gray-700">ВЕНИЕ</span>
        </div>
      </div>
      
      {/* Главное меню - закругленные кнопки */}
      <div className="max-w-md mx-auto px-2 mb-3">
        <div className="relative grid grid-cols-4 gap-1 rounded-2xl bg-gray-800/50 backdrop-blur-md overflow-hidden p-1.5">
          <Link href="/" className={`flex justify-center items-center py-2.5 rounded-xl text-white text-center text-sm sm:text-base font-medium z-10 transition-colors duration-300 ${pathname === '/' ? 'bg-[#48a9a6]' : 'bg-transparent hover:bg-[#48a9a6]/30'}`}>
            Главная
          </Link>
          <Link href="/services" className={`flex justify-center items-center py-2.5 rounded-xl text-white text-center text-sm sm:text-base font-medium z-10 transition-colors duration-300 ${pathname === '/services' ? 'bg-[#48a9a6]' : 'bg-transparent hover:bg-[#48a9a6]/30'}`}>
            Услуги
          </Link>
          <Link href="/blog" className={`flex justify-center items-center py-2.5 rounded-xl text-white text-center text-sm sm:text-base font-medium z-10 transition-colors duration-300 ${pathname === '/blog' ? 'bg-[#48a9a6]' : 'bg-transparent hover:bg-[#48a9a6]/30'}`}>
            Статьи
          </Link>
          <Link href="/cabinet" className={`flex justify-center items-center py-2.5 rounded-xl text-white text-center text-sm sm:text-base font-medium z-10 transition-colors duration-300 ${pathname === '/cabinet' ? 'bg-[#48a9a6]' : 'bg-transparent hover:bg-[#48a9a6]/30'}`}>
            {isAuthenticated && user ? 'Кабинет' : 'Войти'}
          </Link>
        </div>
      </div>

      {/* Строка поиска при необходимости */}
      {isSearchOpen && (
        <div className="max-w-md mx-auto mb-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Поиск..." 
              className="w-full py-2 px-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              <FaSearch size={16} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 