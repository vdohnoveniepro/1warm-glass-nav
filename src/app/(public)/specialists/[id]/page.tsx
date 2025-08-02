'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { FaArrowLeft, FaCalendarAlt, FaGraduationCap, FaClock, FaFileAlt, FaRubleSign, FaStar, FaUser, FaBriefcase, FaRegCalendarAlt, FaInfoCircle, FaFilePdf, FaImage, FaArrowLeft as FaArrowLeftIcon, FaArrowRight as FaArrowRightIcon, FaDownload, FaTimes, FaChevronLeft, FaChevronRight, FaFile, FaShareAlt, FaNewspaper, FaComment, FaHeart } from 'react-icons/fa';
import { RiServiceLine } from 'react-icons/ri';
import { Specialist, Service, Article } from '@/models/types';
import VibrateButton from '@/components/ui/VibrateButton';
import VibrateLink from '@/components/ui/VibrateLink';
import SpecialistBookingModal from '@/components/SpecialistBookingModal';
import FavoriteButton from '@/components/Specialists/FavoriteButton';
import Reviews from '@/components/Review';
import { useAuth } from '@/lib/AuthContext';
import { toastService } from '@/components/ui/Toast';

// Функция для генерации URL изображения через API с timestamp для предотвращения кэширования
const getImageUrl = (path: string) => {
  if (!path) return '/images/photoPreview.jpg';
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  
  // Если путь начинается с /uploads/, извлекаем только последнюю часть
  const imagePath = path.startsWith('/uploads/') 
    ? path.split('/').slice(-2).join('/') // Получаем "services/filename.jpg" или "specialists/filename.jpg"
    : path;
  
  // Добавляем timestamp для предотвращения кэширования
  const timestamp = new Date().getTime();
  return `/api/images?path=${encodeURIComponent(imagePath)}&t=${timestamp}`;
};

// Функция для безопасного извлечения текста из HTML строки
function getSafeText(htmlString: string | undefined): string {
  if (!htmlString) return '';
  return htmlString.replace(/<[^>]*>/g, '').substring(0, 160) + '...';
}

// Приведение года к правильному склонению
function formatYears(years: number): string {
  if (years % 10 === 1 && years % 100 !== 11) {
    return `${years} год`;
  } else if ([2, 3, 4].includes(years % 10) && ![12, 13, 14].includes(years % 100)) {
    return `${years} года`;
  } else {
    return `${years} лет`;
  }
}

// Поскольку в основной модели Specialist нет поля specialization, создадим расширенный интерфейс
interface SpecialistWithAdditionalFields extends Omit<Specialist, 'documents'> {
  specialization?: string;
  documents?: Array<{
    id: string;
    name: string;
    file: string;
    type?: string;
  }>;
}

export default function SpecialistPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, isAuthenticated } = useAuth();
  const [specialist, setSpecialist] = useState<SpecialistWithAdditionalFields | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [openDocumentIndex, setOpenDocumentIndex] = useState(-1);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [currentOpenDocument, setCurrentOpenDocument] = useState<{ id: string; name: string; file: string } | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  // Реф для блока отзывов и отслеживания панели навигации
  const reviewsRef = useRef<HTMLDivElement>(null);
  const [showFloatingNav, setShowFloatingNav] = useState(true);
  const floatingNavRef = useRef<HTMLDivElement>(null);
  
  // Эффект для отслеживания видимости блока отзывов
  useEffect(() => {
    const handleScroll = () => {
      if (reviewsRef.current) {
        // Получаем позицию блока отзывов
        const reviewsTop = reviewsRef.current.getBoundingClientRect().top;
        // Вычисляем высоту окна браузера
        const windowHeight = window.innerHeight;
        
        // Если блок отзывов в зоне видимости (или близко к ней), скрываем панель
        if (reviewsTop < windowHeight - 100) {
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
  
  // Добавляем эффект для проверки хеш-фрагмента в URL
  useEffect(() => {
    // Проверяем, есть ли в URL хеш #reviews
    if (typeof window !== 'undefined' && window.location.hash === '#reviews') {
      // Даем время на загрузку страницы
      setTimeout(() => {
        scrollToReviews();
      }, 1000);
    }
  }, []);
  
  // Функция для прокрутки к блоку отзывов
  const scrollToReviews = () => {
    if (reviewsRef.current) {
      reviewsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Установка URL для шаринга
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);
  
  // Проверка на наличие специалиста в избранном
  useEffect(() => {
    if (isAuthenticated && user?.favorites?.specialists) {
      setIsFavorite(user.favorites.specialists.includes(id));
    }
  }, [isAuthenticated, user, id]);

  // Загрузка данных специалиста и его услуг
  useEffect(() => {
    const fetchSpecialist = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Добавляем случайный параметр для предотвращения кэширования
        const timestamp = Date.now();
        const response = await fetch(`/api/specialists/${id}?v=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Произошла ошибка при загрузке данных');
        }
        
        const data = await response.json();
        console.log('Получены данные специалиста:', data);
        
        // Проверяем, есть ли данные в ответе
        const specialistData = data.data || data;
        
        // Добавляем случайный параметр к URL фото для предотвращения кэширования
        if (specialistData.photo) {
          // Не модифицируем путь, просто добавляем параметр для сброса кеша
          specialistData.photo = `${specialistData.photo}?v=${timestamp}`;
          console.log('Путь к фото специалиста:', specialistData.photo);
        }
        
        setSpecialist(specialistData);
          
          // Если есть услуги у специалиста, получаем полную информацию о них
        if (specialistData.services && specialistData.services.length > 0) {
          const serviceIds = specialistData.services.map((s: { id: string }) => s.id);
            
            // Запрашиваем полную информацию о каждой услуге
            const servicesResponse = await fetch(`/api/services?v=${timestamp}`);
          
          if (!servicesResponse.ok) {
            throw new Error('Произошла ошибка при загрузке услуг');
          }
          
            const servicesData = await servicesResponse.json();
          console.log('Получены данные услуг:', servicesData);
          
          // Получаем полные данные услуг специалиста
          const allServices = servicesData.data || [];
          const specialistServices = allServices.filter(
            (service: Service) => serviceIds.includes(service.id)
          );
          
          console.log('Отфильтрованные услуги специалиста:', specialistServices);
          setServices(specialistServices);
        }
        
        // Загружаем статьи специалиста
        try {
          const articlesResponse = await fetch(`/api/articles?v=${timestamp}`);
          
          if (articlesResponse.ok) {
            const articlesData = await articlesResponse.json();
            
            // Отфильтровываем статьи, написанные данным специалистом
            const specialistArticles = articlesData.filter(
              (article: Article) => 
                article.status === 'published' && 
                article.author && 
                article.author.id === id
            );
            
            // Сортируем статьи от новых к старым
            specialistArticles.sort((a: Article, b: Article) => {
              const dateA = new Date(a.publishedAt || a.createdAt || 0);
              const dateB = new Date(b.publishedAt || b.createdAt || 0);
              return dateB.getTime() - dateA.getTime();
            });
            
            // Дополнительно проверяем и исправляем некорректные слаги
            specialistArticles.forEach((article: Article) => {
              // Если slug начинается с '--', это некорректный формат
              if (article.slug && article.slug.startsWith('--')) {
                article.slug = ''; // Сбрасываем некорректный слаг
              }
            });
            
            console.log('Статьи специалиста:', specialistArticles);
            setArticles(specialistArticles);
          }
        } catch (articlesError) {
          console.error('Ошибка при загрузке статей:', articlesError);
          // Не выбрасываем ошибку, просто логируем, чтобы не блокировать отображение страницы
        }
      } catch (error) {
        console.error('Ошибка при загрузке специалиста:', error);
        setError(error instanceof Error ? error.message : 'Произошла ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSpecialist();
      
      // Убираем интервал для автоматического обновления, чтобы избежать лишних запросов
      // const intervalId = setInterval(() => {
      //   console.log('Автоматическое обновление данных специалиста');
      //   fetchSpecialist();
      // }, 30000); // Обновляем каждые 30 секунд
      
      // return () => clearInterval(intervalId);
      return () => {}; // Пустая функция очистки
    }
  }, [id]);

  // Устанавливаем метаданные для страницы
  useEffect(() => {
    if (specialist) {
      // Безопасно извлекаем текст из description
      const descriptionText = getSafeText(specialist.description);
      
      document.title = `${specialist.firstName} ${specialist.lastName} | Вдохновение`;
      
      // Находим или создаем meta тег description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      
      // Устанавливаем содержимое meta тега
      metaDescription.setAttribute(
        'content',
        `${specialist.firstName} ${specialist.lastName} - ${specialist.position || 'Специалист'}. ${descriptionText}`
      );
    }
  }, [specialist]);

  // Обработчик открытия модального окна записи
  const handleBookingClick = () => {
    setShowBookingModal(true);
  };
  
  // Обработчик закрытия модального окна
  const handleCloseModal = () => {
    setShowBookingModal(false);
  };

  // Функция для определения типа документа по расширению
  const getDocumentType = (filePath: string): 'image' | 'pdf' | 'other' => {
    if (!filePath) return 'other';
    
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (!extension) return 'other';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    } else {
      return 'other';
    }
  };
  
  // Функция для открытия модального окна документа
  const handleOpenDocument = (doc: any, index: number): void => {
    setOpenDocumentIndex(index);
    setIsDocumentModalOpen(true);
    setCurrentOpenDocument(doc);
  };
  
  // Функция для закрытия модального окна документа
  const handleCloseDocumentModal = () => {
    setIsDocumentModalOpen(false);
    setOpenDocumentIndex(-1);
    setCurrentOpenDocument(null);
  };
  
  // Функция для перехода к следующему документу
  const handleNextDocument = () => {
    if (specialist?.documents && openDocumentIndex < specialist.documents.length - 1) {
      const nextIndex = openDocumentIndex + 1;
      setOpenDocumentIndex(nextIndex);
      // Обновляем текущий открытый документ
      if (specialist.documents[nextIndex]) {
        setCurrentOpenDocument(specialist.documents[nextIndex]);
      }
    }
  };
  
  // Функция для перехода к предыдущему документу
  const handlePrevDocument = () => {
    if (specialist?.documents && openDocumentIndex > 0) {
      const prevIndex = openDocumentIndex - 1;
      setOpenDocumentIndex(prevIndex);
      // Обновляем текущий открытый документ
      if (specialist.documents[prevIndex]) {
        setCurrentOpenDocument(specialist.documents[prevIndex]);
      }
    }
  };
  
  // Обработчик шаринга страницы специалиста
  const shareSpecialist = () => {
    if (navigator.share) {
      // Используем нативный Web Share API для мобильных устройств (iOS, Android)
      navigator.share({
        title: specialist ? `${specialist.firstName} ${specialist.lastName}` : 'Специалист',
        text: specialist?.position || 'Подробная информация о специалисте',
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
          toastService.success('Ссылка скопирована в буфер обмена');
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
        toastService.success('Ссылка скопирована в буфер обмена');
      } else {
        toastService.error('Не удалось скопировать ссылку. Пожалуйста, скопируйте её вручную');
      }
    } catch (err) {
      console.error('Ошибка при резервном копировании:', err);
      toastService.error('Не удалось скопировать ссылку');
    }
  };
  
  // Обработчик нажатий клавиш для навигации в галерее
  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!isDocumentModalOpen) return;
    
    if (e.key === 'ArrowRight') {
      handleNextDocument();
    } else if (e.key === 'ArrowLeft') {
      handlePrevDocument();
    } else if (e.key === 'Escape') {
      handleCloseDocumentModal();
    }
  };
  
  // Добавляем обработчик клавиш при монтировании компонента
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDocumentModalOpen, openDocumentIndex]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-center items-center min-h-[50vh]">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2 mb-4"></div>
            <p className="text-gray-500">Загружаем информацию о специалисте...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !specialist) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Специалист не найден</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error || 'Запрашиваемый специалист не существует или был удален'}</p>
          <Link href="/specialists" className="text-[#48a9a6] hover:underline inline-flex items-center text-sm sm:text-base">
            <FaArrowLeft className="mr-2" />
            Вернуться к списку специалистов
          </Link>
        </div>
      </div>
    );
  }

  // Получаем специализацию и оформляем ее в массив элементов
  const specializations = specialist?.specialization 
    ? specialist.specialization.split(',').map((s: string) => s.trim()).filter((s: string) => s) 
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-0 pb-4 relative">
      <div className="flex justify-between items-center mb-4">
        <VibrateLink href="/specialists" className="inline-flex items-center text-[#48a9a6] hover:underline text-sm sm:text-base">
          <FaArrowLeft className="mr-2" />
          Назад к специалистам
        </VibrateLink>
        
        <div className="flex gap-2">
          <FavoriteButton specialistId={id} initialIsFavorite={isFavorite} />
          
          <button
            onClick={shareSpecialist}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <FaShareAlt className="mr-2" />
            Поделиться
          </button>
        </div>
      </div>
      
      {/* Основная информация о специалисте */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        {/* Мобильная версия - фото и имя вверху */}
        <div className="md:hidden">
          {/* Фото специалиста на мобильных */}
          <div className="relative w-full h-[300px]">
            {specialist?.photo ? (
            <Image
              src={`/api/images?path=${encodeURIComponent(specialist.photo.startsWith('/') ? specialist.photo.substring(1) : specialist.photo)}&t=${Date.now()}`}
              alt={`${specialist.firstName} ${specialist.lastName}`}
              fill
              className="object-cover"
                sizes="100vw"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                console.error(`Ошибка загрузки изображения: ${target.src}`);
                // Пробуем загрузить изображение еще раз с новым timestamp через API
                const newTimestamp = new Date().getTime();
                // Извлекаем path из URL
                const urlParams = new URLSearchParams(new URL(target.src).search);
                const photoPath = urlParams.get('path');
                
                if (photoPath) {
                  target.src = `/api/images?path=${encodeURIComponent(photoPath)}&t=${newTimestamp}`;
                } else {
                  // Если не удалось извлечь путь, используем оригинальный src
                  const originalSrc = target.src.split('?')[0];
                  target.src = `${originalSrc}?retry=${newTimestamp}`;
                }
                
                // Если повторная попытка не удалась, используем заглушку
                target.onerror = () => {
                  console.error(`Повторная попытка загрузки изображения не удалась: ${target.src}`);
                target.src = '/images/photoPreview.jpg';
                  target.onerror = null; // Предотвращаем бесконечный цикл
                };
              }}
            />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <FaUser className="text-gray-400" size={64} />
              </div>
            )}
          </div>
          
          {/* Заголовок и кнопка на мобильных */}
          <div className="p-5">
            <h1 className="text-2xl font-bold text-[#4B4B4B] mb-2">
              {specialist.firstName} {specialist.lastName}
            </h1>
            
            <p className="text-[#48a9a6] text-lg font-medium mb-4">
              {specialist.position || 'Специалист'}
            </p>
            
            <VibrateButton 
              className="w-full px-4 py-3 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors flex items-center justify-center shadow-md hover:shadow-lg text-sm"
              onClick={handleBookingClick}
            >
              <FaCalendarAlt className="mr-2" />
              Записаться на прием
            </VibrateButton>
          </div>
        </div>
        
        {/* Десктопная версия - фото и информация рядом */}
        <div className="hidden md:flex p-8 gap-8">
          {/* Фото специалиста в десктопной версии */}
          <div className="w-1/3 lg:w-1/4 flex-shrink-0">
            <div className="relative aspect-square rounded-xl overflow-hidden">
              {specialist?.photo ? (
                <Image
                  src={`/api/images?path=${encodeURIComponent(specialist.photo.startsWith('/') ? specialist.photo.substring(1) : specialist.photo)}&t=${Date.now()}`}
                  alt={`${specialist.firstName} ${specialist.lastName}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 33vw, 25vw"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    console.error(`Ошибка загрузки изображения: ${target.src}`);
                    // Пробуем загрузить изображение еще раз с новым timestamp через API
                    const newTimestamp = new Date().getTime();
                    // Извлекаем path из URL
                    const urlParams = new URLSearchParams(new URL(target.src).search);
                    const photoPath = urlParams.get('path');
                    
                    if (photoPath) {
                      target.src = `/api/images?path=${encodeURIComponent(photoPath)}&t=${newTimestamp}`;
                    } else {
                      // Если не удалось извлечь путь, используем оригинальный src
                      const originalSrc = target.src.split('?')[0];
                      target.src = `${originalSrc}?retry=${newTimestamp}`;
                    }
                    
                    // Если повторная попытка не удалась, используем заглушку
                    target.onerror = () => {
                      console.error(`Повторная попытка загрузки изображения не удалась: ${target.src}`);
                    target.src = '/images/photoPreview.jpg';
                      target.onerror = null; // Предотвращаем бесконечный цикл
                    };
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-xl">
                  <FaUser className="text-gray-400" size={64} />
                </div>
              )}
            </div>
          </div>
          
          {/* Информация о специалисте в десктопной версии */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#4B4B4B] mb-2">
              {specialist.firstName} {specialist.lastName}
            </h1>
            
            <p className="text-[#48a9a6] text-xl font-medium mb-2">
              {specialist.position || 'Специалист'}
            </p>
            
            {/* Показываем дополнительные должности, если они есть */}
            {specialist.additionalPositions && specialist.additionalPositions.length > 0 && (
              <div className="mb-6 text-gray-700">
                {specialist.additionalPositions.map((pos, idx) => (
                  <p key={idx} className="text-gray-600 text-sm mt-1">{pos}</p>
                ))}
              </div>
            )}
            
            {/* Характеристики специалиста */}
            <div className="flex flex-wrap gap-4 mb-6">
              {/* Услуги вместо Специализации */}
              {services && services.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="flex items-center px-3 py-1 bg-green-50 rounded-full text-green-700 font-medium text-sm mr-1">
                    <RiServiceLine className="mr-2" size={14} />
                    Услуги:
                  </span>
                  {services.map(service => (
                    <span
                      key={service.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:brightness-95 transition-all relative group"
                      style={{ backgroundColor: `${service.color}20`, color: service.color }}
                      onClick={() => router.push(`/services/${service.id}`)}
                      title={`Перейти к услуге "${service.name}"`}
                    >
                      {service.name}
                      <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 z-10 text-[10px] whitespace-nowrap px-2 py-1 rounded bg-gray-800 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Перейти к услуге
                      </span>
                    </span>
                  ))}
                </div>
              )}
              </div>
            
            {/* Кнопка записи */}
            <VibrateButton 
              className="px-4 sm:px-6 py-3 sm:py-4 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors flex items-center w-auto shadow-md hover:shadow-lg text-sm sm:text-base"
              onClick={handleBookingClick}
            >
              <FaCalendarAlt className="mr-2" />
              Записаться на прием
            </VibrateButton>
          </div>
        </div>
        
        {/* Услуги (отображается только на мобильных) */}
        {services && services.length > 0 && (
          <div className="p-5 border-t border-gray-100 md:hidden">
            <h2 className="text-lg font-semibold mb-3 text-[#4B4B4B] flex items-center">
              <RiServiceLine className="mr-2 text-[#48a9a6]" size={16} />
              Услуги
            </h2>
            <div className="flex flex-wrap gap-2">
              {services.map((service) => (
                <span 
                  key={service.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:brightness-95 transition-all"
                  style={{ backgroundColor: `${service.color}20`, color: service.color }}
                  onClick={() => router.push(`/services/${service.id}`)}
                  title={`Перейти к услуге "${service.name}"`}
                >
                  {service.name}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Информационные блоки (отображаются только на мобильных) */}
        <div className="md:hidden">
          <div className="grid grid-cols-1 gap-4 p-5 border-t border-gray-100">
            {/* Позиция на мобильных */}
            {specialist.additionalPositions && specialist.additionalPositions.length > 0 && (
              <div className="text-gray-700">
                {specialist.additionalPositions.map((pos, idx) => (
                  <p key={idx} className="text-gray-600 mb-1">{pos}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Описание специалиста */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4 text-[#4B4B4B] flex items-center">
          <FaUser className="mr-3 text-[#48a9a6]" />
          О специалисте
        </h2>
        {specialist.description ? (
          <div 
            className="prose prose-sm sm:prose max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: specialist.description }}
          />
        ) : (
          <p className="text-gray-500 italic">Описание отсутствует</p>
        )}
      </div>
      
      {/* Образование и сертификаты */}
      {specialist.documents && specialist.documents.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8 p-6">
          <h2 className="text-xl font-semibold mb-6 text-[#4B4B4B] flex items-center">
            <FaGraduationCap className="mr-3 text-[#48a9a6]" />
            Образование и сертификаты
          </h2>
          
          <div className="relative">
            {/* Стрелки прокрутки */}
            <button 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-3 shadow-md z-10 hover:bg-gray-100 transition-colors hidden md:block"
              onClick={() => {
                const container = document.getElementById('documents-container');
                if (container) {
                  container.scrollBy({ left: -300, behavior: 'smooth' });
                }
              }}
            >
              <FaChevronLeft className="text-gray-800" size={16} />
            </button>
            
            <button 
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-3 shadow-md z-10 hover:bg-gray-100 transition-colors hidden md:block"
              onClick={() => {
                const container = document.getElementById('documents-container');
                if (container) {
                  container.scrollBy({ left: 300, behavior: 'smooth' });
                }
              }}
            >
              <FaChevronRight className="text-gray-800" size={16} />
            </button>
            
            {/* Горизонтальная прокрутка документов */}
            <div 
              id="documents-container"
              className="flex overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory space-x-4 touch-pan-x"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {specialist.documents.map((doc, index) => (
                <div 
                  key={doc.id} 
                  className="flex-shrink-0 snap-center flex flex-col"
                  onClick={() => handleOpenDocument(doc, index)}
                >
                  {getDocumentType(doc.file) === 'image' ? (
                    <>
                      <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 relative">
                        <Image 
                          src={doc.file} 
                          alt={doc.name || `Документ ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 33vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-300"></div>
                      </div>
                      <p className="mt-2 text-xs text-center text-gray-600 max-w-48 md:max-w-56 truncate px-2">
                        {doc.name || `Документ ${index + 1}`}
                      </p>
                    </>
                  ) : getDocumentType(doc.file) === 'pdf' ? (
                    <>
                      <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center justify-center bg-gray-50">
                        <FaFilePdf className="text-red-500 text-5xl mb-3" />
                        <p className="text-xs text-gray-600 text-center px-4 truncate w-full">PDF документ</p>
                      </div>
                      <p className="mt-2 text-xs text-center text-gray-600 max-w-48 md:max-w-56 truncate px-2">
                        {doc.name || `Документ ${index + 1}`}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center justify-center bg-gray-50">
                        <FaFile className="text-gray-500 text-5xl mb-3" />
                        <p className="text-xs text-gray-600 text-center px-4 truncate w-full">Документ</p>
                      </div>
                      <p className="mt-2 text-xs text-center text-gray-600 max-w-48 md:max-w-56 truncate px-2">
                        {doc.name || `Документ ${index + 1}`}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Услуги специалиста */}
        {services.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8 p-6">
          <h2 className="text-xl font-semibold mb-6 text-[#4B4B4B] flex items-center">
            <RiServiceLine className="text-[#48a9a6] mr-3" size={20} />
            Услуги специалиста
          </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
              <div key={service.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden h-full flex flex-col transition-shadow hover:shadow-lg">
                <div 
                  className="relative h-48 cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/services/${service.id}`)}
                >
                  {service.image ? (
                    <>
                      <div className="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity z-10"></div>
                    <Image
                      src={getImageUrl(`services/${service.id}`)}
                      alt={service.name}
                      fill
                        className="object-cover transition-transform hover:scale-105 duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={true}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/photoPreview.jpg';
                      }}
                    />
                    </>
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-lg">Нет изображения</span>
                    </div>
                  )}
                  </div>
                <div className="p-5 flex flex-col flex-grow">
                  <h3 
                    className="text-xl font-bold mb-2 text-[#4B4B4B] cursor-pointer hover:text-[#48a9a6] transition-colors"
                    onClick={() => router.push(`/services/${service.id}`)}
                    title={`Перейти на страницу услуги "${service.name}"`}
                  >
                    {service.name}
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[#48a9a6] font-medium bg-[#48a9a6]/10 px-3 py-1 rounded-full">{service.price.toLocaleString('ru-RU')} ₽</span>
                    <div className="flex items-center text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      <FaClock className="mr-1" size={14} />
                      <span>{service.duration} мин</span>
                    </div>
                  </div>
                  <div className="mb-4 flex-grow">
                    {service.description ? (
                      <p className="text-gray-600 text-sm">
                        {getSafeText(service.description)}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic text-sm">Описание отсутствует</p>
                    )}
                  </div>
                  <div className="mt-auto flex gap-2">
                    <VibrateButton
                      className="text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1 font-medium flex items-center justify-center text-sm"
                      onClick={handleBookingClick}
                    >
                      <FaCalendarAlt className="mr-1.5" />
                      Записаться
                    </VibrateButton>
                    <VibrateLink
                      href={`/services/${service.id}`}
                      className="text-center py-2 px-4 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors flex-1 font-medium text-sm"
                    >
                      Подробнее
                    </VibrateLink>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Статьи специалиста */}
      {articles && articles.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8 p-6">
          <h2 className="text-xl font-semibold mb-6 text-[#4B4B4B] flex items-center">
            <FaNewspaper className="text-[#48a9a6] mr-3" size={20} />
            Статьи специалиста
          </h2>

          <div className="relative">
            {/* Кнопки прокрутки (видимы только на десктопе) */}
            <button
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-md hover:bg-gray-100 transition-colors hidden md:block"
              onClick={() => {
                const container = document.getElementById('articles-container');
                if (container) {
                  container.scrollBy({ left: -300, behavior: 'smooth' });
                }
              }}
            >
              <FaChevronLeft className="text-gray-800" size={16} />
            </button>
            <button
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-md hover:bg-gray-100 transition-colors hidden md:block"
              onClick={() => {
                const container = document.getElementById('articles-container');
                if (container) {
                  container.scrollBy({ left: 300, behavior: 'smooth' });
                }
              }}
            >
              <FaChevronRight className="text-gray-800" size={16} />
            </button>

            {/* Горизонтальный скролл-контейнер */}
            <div
              id="articles-container"
              className="flex overflow-x-auto scrollbar-hide pb-4 snap-x space-x-4 hide-scrollbar touch-pan-x"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {articles.slice(0, 5).map((article) => (
                <div
                  key={article.id}
                  className="flex-shrink-0 w-[80%] sm:w-[55%] md:w-[40%] lg:w-[28%] snap-start cursor-pointer bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                  onClick={(e) => {
                    // Проверяем, не клик ли это на кнопку
                    if (!(e.target as HTMLElement).closest('button')) {
                      // Определяем корректный путь статьи
                      let articlePath = article.id; // По умолчанию используем ID
                      
                      // Проверяем, есть ли у статьи валидный slug и используем его
                      if (article.slug && article.slug.trim() !== '' && !article.slug.startsWith('--')) {
                        articlePath = article.slug;
                      }
                      
                      router.push(`/blog/${articlePath}`);
                    }
                  }}
                >
                  <div className="relative h-40 w-full">
                    {article.banner ? (
                      <Image
                        src={article.banner}
                        alt={article.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 80vw, (max-width: 768px) 55vw, (max-width: 1024px) 40vw, 28vw"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/photoPreview.jpg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-lg">Нет изображения</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold mb-2 text-[#4B4B4B] line-clamp-2">{article.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-grow">
                      {article.excerpt || getSafeText(article.content)}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                      <span className="flex items-center">
                        <FaRegCalendarAlt className="mr-1" size={12} />
                        {new Date(article.publishedAt || article.createdAt || Date.now()).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <VibrateButton
                      className="text-center py-2 px-4 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors w-full block font-medium text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Определяем корректный путь статьи
                        let articlePath = article.id; // По умолчанию используем ID
                        
                        // Проверяем, есть ли у статьи валидный slug и используем его
                        if (article.slug && article.slug.trim() !== '' && !article.slug.startsWith('--')) {
                          articlePath = article.slug;
                        }
                        
                        router.push(`/blog/${articlePath}`);
                      }}
                    >
                      Читать статью
                    </VibrateButton>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {articles.length > 0 && (
            <div className="mt-6 text-center">
              <VibrateLink
                href={`/blog?author=${id}`}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Все статьи специалиста
              </VibrateLink>
            </div>
          )}
          </div>
        )}
      
      {/* Отзывы о специалисте */}
      <div className="mb-8" ref={reviewsRef} id="reviews">
        <Reviews 
          specialistId={specialist.id} 
          specialistName={`${specialist.firstName} ${specialist.lastName}`} 
        />
      </div>
      
      {/* Модальное окно для записи к специалисту */}
      {specialist && (
        <SpecialistBookingModal
          isOpen={showBookingModal}
          onClose={handleCloseModal}
          specialistId={specialist.id}
        />
      )}
      
      {/* Модальное окно для просмотра документов */}
      {isDocumentModalOpen && currentOpenDocument && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={handleCloseDocumentModal}
        >
          <div 
            className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Навигационные кнопки */}
            {specialist.documents && specialist.documents.length > 1 && (
              <>
                <button 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-3 shadow-lg z-10 hover:bg-gray-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handlePrevDocument(); }}
                >
                  <FaChevronLeft className="text-gray-800" size={20} />
                </button>
                <button 
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-3 shadow-lg z-10 hover:bg-gray-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleNextDocument(); }}
                >
                  <FaChevronRight className="text-gray-800" size={20} />
                </button>
              </>
            )}

            {/* Кнопка закрытия */}
            <button 
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              onClick={handleCloseDocumentModal}
            >
              <FaTimes className="text-gray-800" size={24} />
            </button>

            {/* Счетчик документов */}
            {specialist.documents && specialist.documents.length > 1 && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-1 rounded-full text-sm">
                {openDocumentIndex + 1} / {specialist.documents.length}
              </div>
            )}

            {/* Контент документа */}
            <div className="w-full max-w-5xl">
              {getDocumentType(currentOpenDocument.file) === 'image' ? (
                <div className="relative h-[80vh] w-full">
                  <Image 
                    src={currentOpenDocument.file} 
                    alt={currentOpenDocument.name || 'Документ'}
                    fill
                    className="object-contain" 
                    sizes="100vw"
                  />
                  {/* Название документа для изображений */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm max-w-md text-center">
                    <p className="truncate">
                      {currentOpenDocument.name || `Документ ${openDocumentIndex + 1}`}
                    </p>
                  </div>
                </div>
              ) : getDocumentType(currentOpenDocument.file) === 'pdf' ? (
                <div className="bg-white rounded-lg overflow-hidden p-4">
                  <div className="flex items-center justify-center mb-4">
                    <FaFilePdf className="text-red-500 text-4xl mr-3" />
                    <h3 className="text-xl font-medium truncate">{currentOpenDocument.name || "PDF документ"}</h3>
                  </div>
                  <a 
                    href={currentOpenDocument.file} 
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full bg-[#48a9a6] hover:bg-[#3a8a87] text-white py-3 px-6 rounded-lg transition-colors font-medium text-center"
                  >
                    Открыть документ
                  </a>
                </div>
              ) : (
                <div className="bg-white rounded-lg overflow-hidden p-4">
                  <div className="flex items-center justify-center mb-4">
                    <FaFile className="text-gray-500 text-4xl mr-3" />
                    <h3 className="text-xl font-medium truncate">{currentOpenDocument.name || "Документ"}</h3>
                  </div>
                  <a 
                    href={currentOpenDocument.file} 
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full bg-[#48a9a6] hover:bg-[#3a8a87] text-white py-3 px-6 rounded-lg transition-colors font-medium text-center"
                  >
                    Открыть документ
                  </a>
                </div>
              )}
            </div>
          </div>
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
            specialistId={id} 
            initialIsFavorite={isFavorite}
            isCompact={true}
          />
          
          <button
            onClick={scrollToReviews}
            className="w-6 h-6 flex items-center justify-center rounded-full text-white hover:scale-110 active:scale-90 transition-all duration-200"
            title="Отзывы"
          >
            <FaComment size={14} />
          </button>
          
          <button
            onClick={shareSpecialist}
            className="w-6 h-6 flex items-center justify-center rounded-full text-white hover:scale-110 active:scale-90 transition-all duration-200"
            title="Поделиться"
          >
            <FaShareAlt size={14} />
          </button>
        </div>
      )}

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