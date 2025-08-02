'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FaCalendarAlt, FaArrowLeft, FaShareAlt, FaTag, FaUser, FaComment, FaHeart } from 'react-icons/fa';
import CommentSection from '@/components/Comments/CommentSection';
import RelatedArticlesCarousel from '@/components/Blog/RelatedArticlesCarousel';
import FavoriteButton from '@/components/Blog/FavoriteButton';
import { useAuth } from '@/lib/AuthContext';
import React from 'react';
import { Article as CarouselArticle, Author, getAuthorInitials, getAuthorName } from '@/components/Blog/types';
import ConsultationBookingModal from '@/components/ConsultationBookingModal';

// Расширенный интерфейс статьи для страницы полной статьи
interface BlogArticle extends Omit<CarouselArticle, 'excerpt' | 'image'> {
  content: string;
  excerpt: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
  views: number;
  tags?: string[];
}

// Параметры для страницы
interface ArticlePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;
  
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  
  // Состояния
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<CarouselArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Реф для секции комментариев и отслеживания панели навигации
  const commentsRef = useRef<HTMLDivElement>(null);
  const [showFloatingNav, setShowFloatingNav] = useState(true);
  const floatingNavRef = useRef<HTMLDivElement>(null);
  
  // Состояния для настроек блока консультации
  const [consultationSettings, setConsultationSettings] = useState({
    isEnabled: true,
    title: 'Нужна консультация специалиста?',
    description: 'Обсудите ваши вопросы с экспертом. Наши специалисты помогут вам найти решение ваших проблем и подобрать индивидуальный подход.',
    serviceId: ''
  });
  
  // Эффект для отслеживания видимости секции комментариев
  useEffect(() => {
    const handleScroll = () => {
      if (commentsRef.current) {
        // Получаем позицию блока комментариев
        const commentsTop = commentsRef.current.getBoundingClientRect().top;
        // Вычисляем высоту окна браузера
        const windowHeight = window.innerHeight;
        
        // Если блок комментариев в зоне видимости (или близко к ней), скрываем панель
        if (commentsTop < windowHeight - 100) {
          if (showFloatingNav && floatingNavRef.current) {
            // Добавляем класс для анимации исчезания
            floatingNavRef.current.style.animation = 'fadeOut 0.3s ease-in-out forwards';
            // После анимации убираем элемент из DOM
            setTimeout(() => {
              setShowFloatingNav(false);
            }, 300);
          }
        } else if (!showFloatingNav) {
          setShowFloatingNav(true);
        }
      }
    };
    
    // Вешаем обработчик на прокрутку
    window.addEventListener('scroll', handleScroll);
    // Вызываем один раз для инициализации
    handleScroll();
    
    // Отписываемся при размонтировании
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showFloatingNav]);
  
  // Функция для прокрутки к блоку комментариев
  const scrollToComments = () => {
    if (commentsRef.current) {
      commentsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Загружаем настройки блока консультации
  useEffect(() => {
    const fetchConsultationSettings = async () => {
      try {
        const response = await fetch('/api/settings/consultation');
        if (response.ok) {
          const data = await response.json();
          setConsultationSettings({
            isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
            title: data.title || 'Нужна консультация специалиста?',
            description: data.description || 'Обсудите ваши вопросы с экспертом. Наши специалисты помогут вам найти решение ваших проблем и подобрать индивидуальный подход.',
            serviceId: data.serviceId || ''
          });
        }
      } catch (error) {
        console.error('Ошибка при загрузке настроек консультации:', error);
      }
    };
    
    fetchConsultationSettings();
  }, []);
  
  // Установка URL для шаринга
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);
  
  // Проверка на наличие статьи в избранном
  useEffect(() => {
    if (isAuthenticated && user?.favorites?.articles) {
      setIsFavorite(user.favorites.articles.includes(id));
    }
  }, [isAuthenticated, user, id]);
  
  // Загрузка статьи
  useEffect(() => {
    const fetchArticle = async () => {
      setIsLoading(true);
      try {
        // Загрузка текущей статьи
        const response = await fetch(`/api/articles/${id}/public`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Статья не найдена');
          }
          throw new Error('Ошибка при загрузке статьи');
        }
        
        const data = await response.json();
        if (data.success && data.data) {
          setArticle(data.data as BlogArticle);
          
          // Загружаем связанные статьи
          try {
            // Сначала пробуем загрузить статьи той же категории
            const relatedResponse = await fetch(`/api/articles/public?category=${encodeURIComponent(data.data.category)}&limit=5&exclude=${id}`);
            if (relatedResponse.ok) {
              const relatedData = await relatedResponse.json();
              if (relatedData.success && Array.isArray(relatedData.data) && relatedData.data.length >= 3) {
                setRelatedArticles(relatedData.data as CarouselArticle[]);
              } else {
                // Если статей той же категории мало, загружаем случайные статьи
                const randomResponse = await fetch(`/api/articles/public?limit=5&exclude=${id}`);
                if (randomResponse.ok) {
                  const randomData = await randomResponse.json();
                  if (randomData.success && Array.isArray(randomData.data)) {
                    setRelatedArticles(randomData.data as CarouselArticle[]);
                  }
                }
              }
            }
          } catch (err) {
            console.error('Ошибка при загрузке связанных статей:', err);
            // Если не удалось загрузить связанные статьи, просто продолжаем без них
          }
        } else {
          throw new Error('Некорректный формат данных');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке статьи');
        console.error('Ошибка при загрузке статьи:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchArticle();
    }
  }, [id]);
  
  // Функция для шаринга статьи
  const shareArticle = () => {
    if (navigator.share) {
      // Используем нативный Web Share API для мобильных устройств (iOS, Android)
      navigator.share({
        title: article?.title || 'Интересная статья',
        text: article?.excerpt || 'Прочитайте эту интересную статью',
        url: shareUrl,
      })
      .catch((error) => {
        console.error('Ошибка при шаринге:', error);
        // Если произошла ошибка при шаринге, используем запасной вариант
        copyToClipboard(shareUrl);
      });
    } else {
      // Для десктопов или устройств, не поддерживающих Web Share API
      copyToClipboard(shareUrl);
    }
  };
  
  // Универсальная функция копирования, работающая на всех устройствах
  const copyToClipboard = (text: string) => {
    // Пробуем использовать современный API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text)
        .then(() => {
          // Используем временное тост-уведомление вместо alert
          const toast = document.createElement('div');
          toast.textContent = 'Ссылка скопирована в буфер обмена';
          toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50';
          document.body.appendChild(toast);
          
          // Удаляем уведомление через 2 секунды
          setTimeout(() => {
            if (document.body.contains(toast)) {
              document.body.removeChild(toast);
            }
          }, 2000);
        })
        .catch(error => {
          console.error('Ошибка при копировании через API:', error);
          fallbackCopyToClipboard(text);
        });
    } else {
      // Запасной вариант для устройств без поддержки clipboard API
      fallbackCopyToClipboard(text);
    }
  };
  
  // Запасной метод копирования через временный элемент input
  const fallbackCopyToClipboard = (text: string) => {
    try {
      // Создаем временный элемент input
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Устанавливаем стили, чтобы элемент был невидимым
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      // Выделяем и копируем текст
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        // Используем временное тост-уведомление вместо alert
        const toast = document.createElement('div');
        toast.textContent = 'Ссылка скопирована в буфер обмена';
        toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50';
        document.body.appendChild(toast);
        
        // Удаляем уведомление через 2 секунды
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 2000);
      } else {
        // Если не удалось скопировать, показываем сообщение с инструкцией
        const toast = document.createElement('div');
        toast.textContent = 'Не удалось скопировать ссылку. Пожалуйста, скопируйте её вручную';
        toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50';
        document.body.appendChild(toast);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Ошибка при резервном копировании:', err);
      // Показываем сообщение об ошибке
      const toast = document.createElement('div');
      toast.textContent = 'Не удалось скопировать ссылку';
      toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50';
      document.body.appendChild(toast);
      
      // Удаляем уведомление через 3 секунды
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    }
  };
  
  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  // Обработчик для кнопки "Назад"
  const handleBack = () => {
    router.back();
  };
  
  // Функции для модального окна бронирования
  const openBookingModal = () => {
    setShowBookingModal(true);
  };
  
  const closeBookingModal = () => {
    setShowBookingModal(false);
  };
  
  // Индикатор загрузки
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }
  
  // Обработка ошибок
  if (error || !article) {
    return (
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-7xl flex flex-col items-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 md:p-6 rounded-lg mb-6 md:mb-8 w-full max-w-2xl">
          <h1 className="text-xl md:text-2xl font-bold text-red-700 mb-2">
            {error || 'Статья не найдена'}
          </h1>
          <p className="text-red-600 mb-4 text-sm md:text-base">
            К сожалению, запрашиваемая статья недоступна или не существует.
          </p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleBack}
              className="px-3 py-2 md:px-4 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm md:text-base flex items-center"
            >
              <FaArrowLeft className="inline mr-2" />
              Вернуться назад
            </button>
            <Link 
              href="/blog"
              className="px-3 py-2 md:px-4 md:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block text-sm md:text-base"
            >
              Перейти в блог
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 md:py-12 max-w-7xl">
      {/* Навигация и ссылка назад */}
      <div className="mb-4 md:mb-6 flex flex-wrap justify-between items-center gap-2">
        <button 
          onClick={handleBack}
          className="inline-flex items-center text-[#48a9a6] hover:underline text-sm md:text-base"
        >
          <FaArrowLeft className="mr-2" />
          <span>Вернуться в блог</span>
        </button>
        
        <div className="flex gap-2">
          <FavoriteButton articleId={id} initialIsFavorite={isFavorite} />
          
          <button
            onClick={shareArticle}
            className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs md:text-sm font-medium"
          >
            <FaShareAlt className="mr-1 md:mr-2" />
            Поделиться
          </button>
        </div>
      </div>
      
      <article className="bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden mb-8 md:mb-12">
        {/* Заголовок и мета-информация */}
        <header className="px-4 pt-5 sm:px-6 md:px-10 md:pt-10 pb-0">
          <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
            <Link 
              href={`/blog?category=${encodeURIComponent(article.category)}`} 
              className="bg-[#48a9a6]/10 text-[#48a9a6] px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium hover:bg-[#48a9a6]/20 transition-colors"
            >
              {article.category}
            </Link>
            
            {article.tags && article.tags.length > 0 && (
              article.tags.map(tag => (
                <Link 
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`} 
                  className="bg-gray-100 text-gray-700 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm hover:bg-gray-200 transition-colors flex items-center"
                >
                  <FaTag className="mr-1 text-[0.6rem] md:text-xs" />
                  {tag}
                </Link>
              ))
            )}
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-bold text-gray-800 mb-3 md:mb-4 leading-tight">
            {article.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
            <div className="flex items-center">
              <FaCalendarAlt className="mr-1.5 md:mr-2 text-[#48a9a6]" />
              <span>{formatDate(article.publishedAt)}</span>
            </div>
          </div>
          
          {/* Информация об авторе */}
          {article.author && (
            <div className="flex items-center border-t border-gray-100 pt-3 md:pt-4 pb-4 md:pb-6">
              <Link 
                href={`/specialists/${article.author.id}`}
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full overflow-hidden bg-gray-200 mr-2 md:mr-3">
                  {article.author.avatar ? (
                    <Image
                      src={article.author.avatar}
                      alt={getAuthorName(article.author)}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#48a9a6] text-white text-base md:text-lg">
                      {getAuthorInitials(article.author)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center">
                    <p className="font-medium text-gray-900 text-sm md:text-base">
                      {getAuthorName(article.author)}
                    </p>
                    <FaUser className="ml-1.5 md:ml-2 text-[#48a9a6] text-xs" />
                  </div>
                  {article.author.specialization && (
                    <p className="text-xs md:text-sm text-gray-500">{article.author.specialization}</p>
                  )}
                </div>
              </Link>
            </div>
          )}
        </header>
        
        {/* Изображение баннера */}
        {article.image && (
          <div className="relative h-[180px] sm:h-[250px] md:h-[350px] lg:h-[450px] w-full mb-5 md:mb-8 bg-gray-100">
            <Image
              src={article.image}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        
        {/* Содержимое статьи */}
        <div className="px-4 sm:px-6 md:px-10 pb-6 md:pb-10">
          {/* Краткое описание */}
          <div className="mb-5 md:mb-8 text-base md:text-lg text-gray-700 italic border-l-4 border-[#48a9a6] pl-3 md:pl-4 py-1.5 md:py-2 bg-[#48a9a6]/5 rounded-r-lg">
            {article.excerpt}
          </div>
          
          {/* Основное содержимое */}
          <div 
            className="prose prose-sm md:prose-base lg:prose-lg max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-a:text-[#48a9a6] prose-img:rounded-xl prose-strong:text-gray-800"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
          
          {/* Кнопки действий в конце статьи */}
          <div className="mt-6 md:mt-10 pt-4 md:pt-6 border-t border-gray-100 flex flex-wrap gap-3 justify-between items-center">
            <Link
              href="/blog"
              className="inline-flex items-center px-4 py-2 md:px-6 md:py-3 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors text-sm md:text-base"
            >
              <FaArrowLeft className="mr-2" />
              Все статьи
            </Link>
            
            <div className="flex gap-2">
              <FavoriteButton articleId={id} initialIsFavorite={isFavorite} />
              
              <button
                onClick={shareArticle}
                className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs md:text-sm font-medium"
              >
                <FaShareAlt className="mr-1 md:mr-2" />
                Поделиться
              </button>
            </div>
          </div>
        </div>
      </article>
      
      {/* Блок с призывом к действию для консультации */}
      {consultationSettings.isEnabled && (
        <div className="bg-gradient-to-r from-[#48a9a6] to-[#3a8a87] rounded-xl md:rounded-2xl shadow-lg overflow-hidden mb-8 md:mb-12 text-white">
          <div className="px-4 sm:px-6 md:px-10 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0 md:pr-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 md:mb-3">
                {consultationSettings.title}
              </h2>
              <p className="text-white/90 text-sm md:text-base max-w-xl">
                {consultationSettings.description}
              </p>
            </div>
            <div className="flex-shrink-0">
              <button 
                onClick={openBookingModal}
                className="inline-block px-6 py-3 md:px-8 md:py-4 bg-white text-[#48a9a6] rounded-lg font-medium text-base md:text-lg hover:bg-gray-100 transition-colors"
              >
                Записаться
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Связанные статьи */}
      {relatedArticles.length > 0 && (
        <div className="mb-8 md:mb-12">
          <RelatedArticlesCarousel 
            articles={relatedArticles} 
            formatDate={formatDate} 
          />
        </div>
      )}
      
      {/* Плавающая панель навигации */}
      {showFloatingNav && (
        <div 
          ref={floatingNavRef}
          className="fixed bottom-[4.5rem] left-1/2 transform -translate-x-1/2 z-40 flex items-center justify-center gap-1 px-2 py-1.5 rounded-full bg-gray-800/50 backdrop-blur-md shadow-lg border border-white/20 opacity-0"
          style={{
            animation: 'fadeIn 0.3s ease-in-out forwards'
          }}
        >
          <FavoriteButton 
            articleId={id} 
            initialIsFavorite={isFavorite}
            isCompact={true}
          />
          
          <button
            onClick={scrollToComments}
            className="w-6 h-6 flex items-center justify-center rounded-full text-white hover:scale-110 active:scale-90 transition-all duration-200"
            title="Комментарии"
          >
            <FaComment size={14} />
          </button>
          
          <button
            onClick={shareArticle}
            className="w-6 h-6 flex items-center justify-center rounded-full text-white hover:scale-110 active:scale-90 transition-all duration-200"
            title="Поделиться"
          >
            <FaShareAlt size={14} />
          </button>
        </div>
      )}
      
      {/* Секция комментариев */}
      <div ref={commentsRef}>
        <CommentSection articleId={id} />
      </div>
      
      {/* Модальное окно для записи */}
      <ConsultationBookingModal 
        isOpen={showBookingModal} 
        onClose={closeBookingModal} 
        serviceId={consultationSettings.serviceId}
      />
      
      {/* Добавляем стиль для скрытия полосы прокрутки и анимации */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; transform: translate(-50%, 0); }
          to { opacity: 0; transform: translate(-50%, 20px); }
        }
      `}</style>
    </div>
  );
}