
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpenText, Calendar, FileText, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Главная', path: '/', icon: Home },
    { name: 'Услуги', path: '/services', icon: BookOpenText },
    { name: 'Записаться', path: '/book', icon: Calendar, special: true },
    { name: 'Статьи', path: '/articles', icon: FileText },
    { name: 'Специалисты', path: '/specialists', icon: Users },
    { name: 'Кабинет', path: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-white/30 py-2 px-1 z-50 border-t border-warmbeige-100/30 shadow-lg">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center px-2 pt-2 pb-1 rounded-lg transition-all duration-300",
              location.pathname === item.path
                ? "text-purple-600 font-medium"
                : "text-warmgray-600 hover:text-warmgray-800",
              item.special && "relative"
            )}
          >
            {item.special ? (
              <div className="flex flex-col items-center">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-3 mb-1 shadow-lg relative z-10 hover:scale-105 transition-all duration-300 group">
                  <item.icon className="w-5 h-5 text-white" />
                  <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg opacity-0 group-hover:opacity-30 transition-opacity duration-1000 z-0"></div>
                  <div className="absolute -inset-4 blur-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
                </div>
                <span className="text-xs font-medium text-purple-600">
                  {item.name}
                </span>
              </div>
            ) : (
              <>
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-xs">
                  {item.name}
                </span>
              </>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
