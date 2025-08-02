import React from 'react';

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  type = 'button',
  variant = 'primary',
  size = 'md',
  children,
  disabled = false,
  fullWidth = false,
  onClick,
  className = '',
  icon,
  loading = false,
}) => {
  // Базовые классы для всех кнопок
  let buttonClasses = 'rounded-lg font-medium transition-colors flex items-center justify-center';
  
  // Классы для размеров
  if (size === 'sm') {
    buttonClasses += ' text-xs px-3 py-1.5';
  } else if (size === 'md') {
    buttonClasses += ' text-sm px-4 py-2';
  } else if (size === 'lg') {
    buttonClasses += ' text-base px-5 py-2.5';
  }
  
  // Классы для вариантов
  if (variant === 'primary') {
    buttonClasses += ' bg-[#48a9a6] hover:bg-[#48a9a6]/90 text-white';
  } else if (variant === 'secondary') {
    buttonClasses += ' bg-purple-600 hover:bg-purple-700 text-white';
  } else if (variant === 'outline') {
    buttonClasses += ' border border-gray-300 bg-white hover:bg-gray-50 text-gray-700';
  } else if (variant === 'danger') {
    buttonClasses += ' bg-red-600 hover:bg-red-700 text-white';
  } else if (variant === 'success') {
    buttonClasses += ' bg-green-600 hover:bg-green-700 text-white';
  }
  
  // Классы для ширины
  if (fullWidth) {
    buttonClasses += ' w-full';
  }
  
  // Классы для состояния "отключена" или "загрузка"
  if (disabled || loading) {
    buttonClasses += ' opacity-50 cursor-not-allowed';
  }
  
  // Добавляем пользовательские классы
  buttonClasses += ` ${className}`;
  
  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </span>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button; 