'use client';

import { MouseEvent, ReactNode } from 'react';
import useVibration from '@/lib/hooks/useVibration';

interface VibrateButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  vibrationPattern?: number | number[];
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Кнопка с эффектом вибрации при нажатии
 */
const VibrateButton = ({
  children,
  className = '',
  onClick,
  vibrationPattern = 50,
  disabled = false,
  type = 'button'
}: VibrateButtonProps) => {
  // Используем хук для вибрации
  const { vibrate, isSupported } = useVibration(vibrationPattern);
  
  // Обработчик клика с вибрацией
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
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
    <button
      type={type}
      className={className}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default VibrateButton; 