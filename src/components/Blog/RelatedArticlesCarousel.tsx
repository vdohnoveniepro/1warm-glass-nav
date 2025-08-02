'use client';

import { useState, useRef, useEffect, TouchEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt } from 'react-icons/fa';
import { Article, getAuthorName, getAuthorInitials } from './types';

interface RelatedArticlesCarouselProps {
  articles: Article[];
  formatDate: (dateString: string) => string;
}

const RelatedArticlesCarousel: React.FC<RelatedArticlesCarouselProps> = ({ articles, formatDate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const miniListRef = useRef<HTMLDivElement>(null);
  const [miniListCurrentIndex, setMiniListCurrentIndex] = useState(0);
  
  // Постоянное количество видимых мини-статей
  const visibleMiniArticles = 5;
  // Максимальное количество мини-статей
  const maxMiniArticles = 15;
  
  // Для обработки свайпов
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Для обработки свайпов мини-списка
  const [miniTouchStart, setMiniTouchStart] = useState<number | null>(null);
  const [miniTouchEnd, setMiniTouchEnd] = useState<number | null>(null);
  
  // Случайно перемешанные статьи для карусели и мини-списка
  const [shuffledArticles, setShuffledArticles] = useState<Article[]>([]);
  const [shuffledMiniArticles, setShuffledMiniArticles] = useState<Article[]>([]);
  
  // Минимальное расстояние свайпа для срабатывания (в пикселях)
  const minSwipeDistance = 50;
  
  // Функция для перемешивания массива (алгоритм Фишера-Йейтса)
  const shuffleArray = (array: Article[]): Article[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };
  
  // Перемешиваем статьи при инициализации
  useEffect(() => {
    if (articles.length) {
      setShuffledArticles(shuffleArray(articles));
      setShuffledMiniArticles(shuffleArray(articles).slice(0, maxMiniArticles));
    }
  }, [articles]);
  
  // Определение количества видимых карточек в зависимости от ширины экрана
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleCount(1);
      } else if (width < 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Обработчики навигации для основной карусели
  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };
  
  const handleNext = () => {
    setCurrentIndex(prev => Math.min(shuffledArticles.length - visibleCount, prev + 1));
  };
  
  // Обработчики для мини-списка
  const handleMiniPrev = () => {
    setMiniListCurrentIndex(prev => Math.max(0, prev - 1));
  };
  
  const handleMiniNext = () => {
    setMiniListCurrentIndex(prev => 
      Math.min(shuffledMiniArticles.length - visibleMiniArticles, prev + 1)
    );
  };
  
  // Обработчики свайпа для основной карусели
  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null); // Сбрасываем конечную точку
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentIndex < shuffledArticles.length - visibleCount) {
      handleNext();
    } else if (isRightSwipe && currentIndex > 0) {
      handlePrev();
    }
  };
  
  // Обработчики вертикального свайпа для мини-списка
  const onMiniTouchStart = (e: TouchEvent) => {
    setMiniTouchEnd(null);
    setMiniTouchStart(e.targetTouches[0].clientY); // Используем Y-координату для вертикального свайпа
  };
  
  const onMiniTouchMove = (e: TouchEvent) => {
    setMiniTouchEnd(e.targetTouches[0].clientY); // Используем Y-координату для вертикального свайпа
  };
  
  const onMiniTouchEnd = () => {
    if (!miniTouchStart || !miniTouchEnd) return;
    
    const distance = miniTouchStart - miniTouchEnd;
    const isDownSwipe = distance > minSwipeDistance;
    const isUpSwipe = distance < -minSwipeDistance;
    
    if (isDownSwipe && miniListCurrentIndex < shuffledMiniArticles.length - visibleMiniArticles) {
      handleMiniNext();
    } else if (isUpSwipe && miniListCurrentIndex > 0) {
      handleMiniPrev();
    }
  };
  
  // Если нет статей, не отображаем компонент
  if (!shuffledArticles.length) return null;
  
  return (
    <div className="relative space-y-8">
      {/* Основная карусель */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Другие статьи</h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`p-2 rounded-full ${
                currentIndex === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-[#48a9a6] text-white hover:bg-[#3a8a87]'
              }`}
            >
              <FaChevronLeft size={14} />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= shuffledArticles.length - visibleCount}
              className={`p-2 rounded-full ${
                currentIndex >= shuffledArticles.length - visibleCount
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#48a9a6] text-white hover:bg-[#3a8a87]'
              }`}
            >
              <FaChevronRight size={14} />
            </button>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div 
            className="flex transition-transform duration-300"
            style={{ transform: `translateX(-${currentIndex * (100 / visibleCount)}%)` }}
          >
            {shuffledArticles.map((article) => (
              <div 
                key={article.id}
                className="flex-shrink-0"
                style={{ width: `${100 / visibleCount}%` }}
              >
                <div className="m-2">
                  <Link
                    href={`/blog/${article.id}`}
                    className="block bg-white rounded-xl shadow-md overflow-hidden transform transition-transform hover:scale-[1.02] duration-200 h-full"
                  >
                    <div className="relative h-40 bg-gray-200">
                      {article.image ? (
                        <Image
                          src={article.image}
                          alt={article.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                          <span className="text-gray-500">Нет изображения</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <div className="mb-2 flex items-center">
                        <FaCalendarAlt className="text-[#48a9a6] mr-1.5" size={12} />
                        <span className="text-xs text-gray-500">{formatDate(article.publishedAt || '')}</span>
                      </div>
                      
                      <h3 className="font-bold text-gray-800 mb-2 line-clamp-2">{article.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.excerpt}</p>
                      
                      <div className="flex items-center mt-auto">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                          {article.author.avatar ? (
                            <Image
                              src={article.author.avatar}
                              alt={getAuthorName(article.author)}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#48a9a6] text-white text-xs">
                              {getAuthorInitials(article.author)}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">
                          {getAuthorName(article.author)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Мини-список статей */}
      {shuffledMiniArticles.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Популярные статьи</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleMiniPrev}
                disabled={miniListCurrentIndex === 0}
                className={`p-1.5 rounded-full ${
                  miniListCurrentIndex === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FaChevronLeft size={12} transform="rotate(90)" />
              </button>
              <button
                onClick={handleMiniNext}
                disabled={miniListCurrentIndex >= shuffledMiniArticles.length - visibleMiniArticles}
                className={`p-1.5 rounded-full ${
                  miniListCurrentIndex >= shuffledMiniArticles.length - visibleMiniArticles
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FaChevronRight size={12} transform="rotate(90)" />
              </button>
            </div>
          </div>
          
          <div 
            ref={miniListRef}
            className="overflow-hidden"
            style={{ height: `${visibleMiniArticles * 64}px` }}
            onTouchStart={onMiniTouchStart}
            onTouchMove={onMiniTouchMove}
            onTouchEnd={onMiniTouchEnd}
          >
            <div 
              className="flex flex-col space-y-3 transition-transform duration-300"
              style={{ transform: `translateY(-${miniListCurrentIndex * 64}px)` }}
            >
              {shuffledMiniArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/blog/${article.id}`}
                  className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="relative h-14 w-20 min-w-[5rem] bg-gray-200 rounded overflow-hidden mr-3">
                    {article.image ? (
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-300">
                        <span className="text-gray-500 text-xs">Нет фото</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 line-clamp-1 text-sm">{article.title}</h4>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center text-xs text-gray-500 mr-2">
                        <FaCalendarAlt className="mr-1 text-[#48a9a6]" size={10} />
                        {formatDate(article.publishedAt || '')}
                      </div>
                      <div className="flex items-center truncate">
                        <span className="text-xs text-gray-600 truncate hidden sm:inline-block">
                          {getAuthorName(article.author)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatedArticlesCarousel; 