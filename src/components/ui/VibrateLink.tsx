'use client';

import { MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import useVibration from '@/lib/hooks/useVibration';

interface VibrateLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  vibrationPattern?: number | number[];
}

/**
 * Компонент ссылки с эффектом вибрации при нажатии
 */
const VibrateLink = ({
  href,
  children,
  className = '',
  onClick,
  vibrationPattern = 50
}: VibrateLinkProps) => {
  // Используем хук для вибрации
  const { vibrate, isSupported } = useVibration(vibrationPattern);
  
  // Обработчик клика с вибрацией
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Если API поддерживается, вызываем вибрацию
    if (isSupported) {
      vibrate();
    }
    
    // Если передан дополнительный обработчик, вызываем его
    if (onClick) {
      onClick(e);
    }
  };
  
  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
};

export default VibrateLink; 