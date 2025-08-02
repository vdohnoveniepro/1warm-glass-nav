'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { cva, type VariantProps } from 'class-variance-authority';

interface StarRatingDisplayProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

interface StarRatingSelectProps {
  value: number;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

const starRatingVariants = cva(
  'flex items-center justify-center',
  {
    variants: {
      size: {
        sm: 'gap-1',
        md: 'gap-2',
        lg: 'gap-3'
      },
      isInteractive: {
        true: 'cursor-pointer',
        false: ''
      }
    },
    defaultVariants: {
      size: 'md',
      isInteractive: false
    }
  }
);

const starSizeVariants = cva(
  'transition-transform duration-200',
  {
    variants: {
      size: {
        sm: 'text-lg',
        md: 'text-xl sm:text-2xl',
        lg: 'text-2xl sm:text-3xl'
      },
      isActive: {
        true: 'scale-110',
        false: 'scale-100'
      }
    },
    defaultVariants: {
      size: 'md',
      isActive: false
    }
  }
);

const labelVariants = cva(
  'text-center mt-1 block',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-xs sm:text-sm',
        lg: 'text-sm sm:text-base'
      }
    },
    defaultVariants: {
      size: 'md'
    }
  }
);

const getRatingLabel = (rating: number) => {
  if (rating <= 1) return { color: 'text-red-500', label: 'Не понравилось' };
  if (rating <= 2) return { color: 'text-orange-500', label: 'Так себе' };
  if (rating <= 3) return { color: 'text-yellow-500', label: 'Нормально' };
  if (rating <= 4) return { color: 'text-green-500', label: 'Хорошо' };
  return { color: 'text-emerald-500', label: 'Отлично' };
};

export default function StarRating(props: StarRatingDisplayProps | StarRatingSelectProps) {
  // Определяем, какой тип компонента нужен - для отображения или выбора
  if ('onChange' in props) {
    return <StarRatingSelect {...props} />;
  }
  return <StarRatingDisplay {...props} />;
}

// Компонент для отображения рейтинга
function StarRatingDisplay({ rating, size = 'md', showValue = true, className = '' }: StarRatingDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { color } = getRatingLabel(rating || 0);
  
  const sizeClasses = {
    sm: { starSize: 'w-3.5 h-3.5 md:w-4 md:h-4', gap: 'gap-0.5', text: 'text-xs' },
    md: { starSize: 'w-4 h-4 md:w-5 md:h-5', gap: 'gap-1', text: 'text-sm' },
    lg: { starSize: 'w-5 h-5 md:w-6 md:h-6', gap: 'gap-1', text: 'text-base' },
  };
  
  const { starSize, gap, text } = sizeClasses[size];
  
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  return (
    <div className={`flex items-center ${gap} ${className}`}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center ${gap}`}
          >
            {[...Array(5)].map((_, index) => (
              <FaStar 
                key={index} 
                className={`${starSize} ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`} 
              />
            ))}
            
            {showValue && (
              <span className={`font-semibold ${text} ${color} ml-1`}>
                {rating ? rating.toFixed(1) : '0.0'}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Компонент для выбора рейтинга (интерактивный)
function StarRatingSelect({ value, onChange, size = 'md', showLabels = false, className = '' }: StarRatingSelectProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [internalValue, setInternalValue] = useState<number>(value);
  const currentRating = hoverRating !== null ? hoverRating : internalValue;
  
  // Синхронизируем внутреннее состояние с пропсом value при монтировании и изменении
  useEffect(() => {
    console.log('StarRating: value изменен внешне:', value);
    setInternalValue(value);
  }, [value]);
  
  // Вручную форсируем колбэк при монтировании, если есть начальное значение
  useEffect(() => {
    // Если у нас есть начальное значение, убедимся, что родительский компонент его знает
    if (internalValue > 0) {
      console.log('StarRating: Отправляем начальный рейтинг в родительский компонент:', internalValue);
      onChange(internalValue);
    }
  }, []);
  
  const { color, label } = getRatingLabel(currentRating || 0);
  
  // Адаптивные размеры в зависимости от устройства
  const sizeClasses = {
    sm: { 
      starSize: 'w-4 h-4 sm:w-5 sm:h-5', 
      gap: 'gap-0.5 sm:gap-1', 
      text: 'text-[10px] sm:text-xs',
      labelWidth: 'w-14 sm:w-16'
    },
    md: { 
      starSize: 'w-5 h-5 sm:w-6 sm:h-6', 
      gap: 'gap-1 sm:gap-1.5', 
      text: 'text-xs sm:text-sm',
      labelWidth: 'w-16 sm:w-18'
    },
    lg: { 
      starSize: 'w-6 h-6 sm:w-7 sm:h-7', 
      gap: 'gap-1 sm:gap-1.5', 
      text: 'text-xs sm:text-sm',
      labelWidth: 'w-18 sm:w-20'
    },
  };
  
  const { starSize, gap, text, labelWidth } = sizeClasses[size];
  
  const stars = [1, 2, 3, 4, 5];
  
  // Помощник для обработки клика
  const handleRatingClick = (rating: number) => {
    console.log('Клик по звезде с рейтингом:', rating);
    
    // Устанавливаем внутреннее значение и отправляем наверх
    setInternalValue(rating);
    onChange(rating);
    
    // Сразу сбрасываем hover-эффект, чтобы не было конфликтов со значением
    setHoverRating(null);
  };
  
  return (
    <div className={className}>
      <div className={`flex items-center justify-center ${gap} mb-2 touch-manipulation`}>
        {stars.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRatingClick(rating)}
            onMouseEnter={() => setHoverRating(rating)}
            onMouseLeave={() => setHoverRating(null)}
            className="relative group focus:outline-none p-1 touch-manipulation"
            aria-label={`Оценка ${rating} из 5`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {currentRating >= rating ? (
              <FaStar className={`${starSize} text-yellow-400 transition-transform hover:scale-110`} />
            ) : (
              <FaRegStar className={`${starSize} text-gray-400 transition-transform hover:scale-110`} />
            )}
          </button>
        ))}
      </div>
      
      {showLabels && currentRating > 0 && (
        <div className="text-center mt-1 min-h-[1.5rem]">
          <span className={`${text} font-medium ${getRatingLabel(currentRating).color}`}>
            {getRatingLabel(currentRating).label}
          </span>
        </div>
      )}
      
      {value > 0 && !showLabels && (
        <div className="text-center mt-1 min-h-[1.5rem]">
          <span className={`${text} font-medium ${getRatingLabel(value).color}`}>
            Ваша оценка: {getRatingLabel(value).label}
          </span>
        </div>
      )}
      
      {!value && !currentRating && showLabels && (
        <div className="text-center mt-1 min-h-[1.5rem]">
          <span className={`${text} text-gray-500`}>
            Выберите оценку
          </span>
        </div>
      )}
    </div>
  );
} 