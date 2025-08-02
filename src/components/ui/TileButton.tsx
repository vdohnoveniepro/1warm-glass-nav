
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TileButtonProps {
  icon: React.ElementType;
  title: string;
  description: string;
  to: string;
  color?: 'indigo' | 'purple' | 'pink' | 'teal' | 'amber';
  featured?: boolean;
}

const TileButton = ({
  icon: Icon,
  title,
  description,
  to,
  color = 'indigo',
  featured = false
}: TileButtonProps) => {
  
  const colorStyles = {
    indigo: "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-indigo-200/50",
    purple: "bg-gradient-to-r from-purple-500 to-purple-600 shadow-purple-200/50",
    pink: "bg-gradient-to-r from-pink-500 to-pink-600 shadow-pink-200/50",
    teal: "bg-gradient-to-r from-teal-500 to-teal-600 shadow-teal-200/50",
    amber: "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-200/50",
  };

  return (
    <Link 
      to={to} 
      className="block"
    >
      <div 
        className={cn(
          "flex flex-col justify-center items-center p-4 rounded-xl text-white transition-all duration-300",
          colorStyles[color],
          featured 
            ? "relative overflow-hidden shadow-lg hover:shadow-xl animate-pulse-soft" 
            : "shadow-md hover:shadow-lg hover:translate-y-[-2px]"
        )}
      >
        {featured && (
          <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
        )}
        
        <Icon className="w-7 h-7 mb-2" />
        <h3 className="font-medium text-white/90 mb-1">{title}</h3>
        <p className="text-xs text-white/80">{description}</p>
      </div>
    </Link>
  );
};

export default TileButton;
