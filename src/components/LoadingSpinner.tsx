import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  let sizeClasses = '';
  
  switch (size) {
    case 'sm':
      sizeClasses = 'h-4 w-4 border-2';
      break;
    case 'lg':
      sizeClasses = 'h-16 w-16 border-4';
      break;
    case 'md':
    default:
      sizeClasses = 'h-10 w-10 border-3';
      break;
  }
  
  return (
    <div className={`animate-spin rounded-full ${sizeClasses} border-t-[#48a9a6] border-r-[#48a9a6] border-b-transparent border-l-transparent ${className}`} />
  );
};

export default LoadingSpinner; 