
import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

const AnimatedButton = ({
  children,
  onClick,
  className,
  fullWidth = false,
  variant = 'primary'
}: AnimatedButtonProps) => {
  const baseClasses = "relative overflow-hidden rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 py-3 px-6 shadow-sm";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-200/50",
    secondary: "bg-gradient-to-r from-pink-400 to-rose-400 text-white hover:shadow-lg hover:shadow-pink-200/50",
    outline: "bg-transparent border border-indigo-400 text-indigo-700 hover:bg-indigo-50"
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        baseClasses,
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        "group",
        className
      )}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 w-full h-full bg-white/20 transform scale-x-0 origin-left transition-transform duration-500 ease-out group-hover:scale-x-100"></span>
    </button>
  );
};

export default AnimatedButton;
