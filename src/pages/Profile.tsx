
import React from 'react';
import { User, Calendar, FileText, Heart, Settings, LogOut } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedButton from '@/components/ui/AnimatedButton';

const Profile = () => {
  // Sample user data (in a real app, this would come from authentication)
  const user = {
    name: 'Александр',
    email: 'alex@example.com',
    isLoggedIn: false
  };
  
  // Profile sections (for logged in users)
  const profileSections = [
    { 
      id: 'appointments', 
      title: 'Мои записи', 
      icon: Calendar, 
      link: '/profile/appointments',
      count: 2
    },
    { 
      id: 'favorites', 
      title: 'Избранные статьи', 
      icon: Heart, 
      link: '/profile/favorites',
      count: 3
    },
    { 
      id: 'reviews', 
      title: 'Мои отзывы', 
      icon: FileText, 
      link: '/profile/reviews',
      count: 1
    },
    { 
      id: 'settings', 
      title: 'Настройки', 
      icon: Settings, 
      link: '/profile/settings' 
    },
  ];
  
  // Login methods
  const loginMethods = [
    { id: 'telegram', title: 'Войти через Telegram', primary: true },
    { id: 'email', title: 'Войти с Email' },
    { id: 'google', title: 'Войти через Google' },
  ];

  return (
    <Layout>
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold mb-6 text-warmgray-800">Личный кабинет</h1>
        
        {user.isLoggedIn ? (
          // Logged in user profile
          <>
            {/* User Info */}
            <div className="glass-card rounded-xl p-5 mb-6 flex items-center">
              <div className="w-16 h-16 bg-warmbeige-200 rounded-full flex items-center justify-center mr-4">
                <User className="w-8 h-8 text-warmgray-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-warmgray-800">{user.name}</h2>
                <p className="text-sm text-warmgray-600">{user.email}</p>
              </div>
            </div>
            
            {/* Profile Sections */}
            <div className="space-y-4 mb-6">
              {profileSections.map((section) => (
                <a
                  key={section.id}
                  href={section.link}
                  className="flex items-center justify-between p-4 glass-card rounded-lg hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-warmbeige-100 rounded-full flex items-center justify-center mr-3">
                      <section.icon className="w-5 h-5 text-warmgray-600" />
                    </div>
                    <span className="font-medium text-warmgray-800">{section.title}</span>
                  </div>
                  
                  {section.count !== undefined && (
                    <div className="bg-warmbeige-100 rounded-full px-2 py-1 text-xs font-medium text-warmgray-800">
                      {section.count}
                    </div>
                  )}
                </a>
              ))}
            </div>
            
            {/* Logout Button */}
            <button className="flex items-center justify-center w-full p-4 rounded-lg border border-warmgray-300 text-warmgray-600 hover:bg-warmgray-100 transition-colors">
              <LogOut className="w-5 h-5 mr-2" />
              <span>Выйти из аккаунта</span>
            </button>
          </>
        ) : (
          // Login screen
          <div className="text-center">
            <div className="w-20 h-20 bg-warmbeige-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-warmgray-600" />
            </div>
            
            <h2 className="text-xl font-medium mb-2 text-warmgray-800">Войдите в аккаунт</h2>
            <p className="text-warmgray-600 mb-8">Для доступа к личному кабинету, пожалуйста, авторизуйтесь</p>
            
            <div className="space-y-4">
              {loginMethods.map((method) => (
                <AnimatedButton
                  key={method.id}
                  fullWidth
                  variant={method.primary ? 'primary' : 'outline'}
                >
                  {method.title}
                </AnimatedButton>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
