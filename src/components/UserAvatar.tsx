'use client';

import React from 'react';
import Image from 'next/image';
import { FaUser } from 'react-icons/fa';

interface UserAvatarProps {
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
    photo?: string;
    photo_url?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  // Определяем размеры в зависимости от параметра size
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-20 h-20'
  };
  
  // Используем аватар из любого доступного свойства
  const avatarUrl = user.avatar || user.photo || user.photo_url;
  
  // Если есть аватар, отображаем его
  if (avatarUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden ${className}`}>
        <Image 
          src={avatarUrl} 
          alt={`${user.firstName} ${user.lastName}`}
          width={size === 'lg' ? 80 : size === 'md' ? 48 : 40}
          height={size === 'lg' ? 80 : size === 'md' ? 48 : 40}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }
  
  // Если аватара нет, отображаем инициалы или иконку пользователя
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-[#48a9a6]/20 flex items-center justify-center text-[#48a9a6] ${className}`}>
      {user.firstName && user.lastName ? (
        <span className={`font-bold ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-base'}`}>
          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
        </span>
      ) : (
        <FaUser className={size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-base'} />
      )}
    </div>
  );
}