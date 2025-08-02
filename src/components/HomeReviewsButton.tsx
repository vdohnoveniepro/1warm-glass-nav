'use client';

import { useState } from 'react';
import { FaStar, FaArrowRight } from 'react-icons/fa';
import { LuStar } from 'react-icons/lu';
import ReviewsModal from './ReviewsModal';

export default function HomeReviewsButton() {
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  
  return (
    <>
      <button 
        onClick={() => setIsReviewsModalOpen(true)}
        className="w-full block rounded-xl shadow-md overflow-hidden relative h-14 group transition-all hover:scale-[1.02] hover:shadow-lg duration-200"
      >
        {/* Градиентный фон */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#e8d6b9] to-[#f5e6cc]"></div>
          
          {/* Контурные иконки звезд */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Основная большая звезда справа от центра */}
            <div className="absolute top-1/2 right-1/3 -translate-y-1/2">
              <LuStar className="w-48 h-48 text-white/30" />
            </div>
            
            {/* Маленькие звезды рядом */}
            <div className="absolute top-1/3 right-16 -translate-y-1/2">
              <LuStar className="w-16 h-16 text-white/25" />
            </div>
            <div className="absolute bottom-1 right-1/4">
              <LuStar className="w-20 h-20 text-white/25" />
            </div>
          </div>
        </div>
        
        {/* Содержимое карточки в одну строку */}
        <div className="absolute inset-0 flex items-center px-4 justify-between">
          <div className="flex items-center">
            <FaStar className="w-7 h-7 text-gray-800" />
            <div className="ml-3">
              <h3 className="text-gray-800 text-lg font-bold leading-tight">Отзывы</h3>
            </div>
          </div>
          <div className="bg-white/20 rounded-full p-1 backdrop-blur-sm">
            <FaArrowRight className="w-4 h-4 text-gray-800" />
          </div>
        </div>
      </button>
      
      {/* Модальное окно с отзывами */}
      <ReviewsModal isOpen={isReviewsModalOpen} onClose={() => setIsReviewsModalOpen(false)} />
    </>
  );
} 