'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { FaRubleSign, FaClock, FaArrowLeft, FaUser, FaCalendarAlt, FaShareAlt } from 'react-icons/fa';
import { Service } from '@/models/types';
import BookingModal from '@/components/BookingModal';
import FavoriteButton from '@/components/Services/FavoriteButton';
import { useAuth } from '@/lib/AuthContext';

// Форматирование цены
const formatPrice = (price: number) => {
  if (!price || price === 0) {
    return 'Бесплатно';
  }
  return `${price.toLocaleString('ru-RU')} ₽`;
};

export default function ServicePage() {
  const params = useParams();
  const id = params.id as string;
  const { user, isAuthenticated } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Состояние для хранения URL изображения
  const [serviceSrc, setServiceSrc] = useState('/images/photoPreview.jpg');
  
  // Устанавливаем путь к изображению услуги при загрузке компонента
  useEffect(() => {
    if (service) {
      const timestamp = new Date().getTime();
      if (service.image && service.image.length > 0) {
        // Если у услуги есть путь к изображению в базе данных, используем его
        const imagePath = service.image.startsWith('/') ? service.image.substring(1) : service.image;
        setServiceSrc(`/api/images?path=${encodeURIComponent(imagePath)}&t=${timestamp}`);
        console.log(`Установлен путь к изображению услуги из БД: /api/images?path=${encodeURIComponent(imagePath)}&t=${timestamp}`);
      } else {
        // Если нет пути в базе данных, используем ID услуги
        setServiceSrc(`/api/images?path=services/${service.id}&t=${timestamp}`);
        console.log(`Установлен путь к изображению услуги по ID: /api/images?path=services/${service.id}&t=${timestamp}`);
      }
    } else {
      setServiceSrc('/images/photoPreview.jpg');
    }
  }, [service]);

  // Состояние для хранения URL изображений специалистов
  const [specialistImages, setSpecialistImages] = useState<{[key: string]: string}>({});
  
  // Устанавливаем пути к изображениям при загрузке компонента
  useEffect(() => {
    const imageUrls: {[key: string]: string} = {};
    
    if (service?.specialists) {
      service.specialists.forEach(specialist => {
        if (specialist.photo) {
          const timestamp = new Date().getTime();
          const photoPath = specialist.photo.startsWith('/') ? specialist.photo.substring(1) : specialist.photo;
          imageUrls[specialist.id] = `/api/images?path=${encodeURIComponent(photoPath)}&t=${timestamp}`;
          console.log(`Установлен путь к фото специалиста через API: /api/images?path=${encodeURIComponent(photoPath)}&t=${timestamp}`);
        } else {
          imageUrls[specialist.id] = '/images/photoPreview.jpg';
          console.log('Фото специалиста отсутствует, используется заглушка');
        }
      });
    }
    
    setSpecialistImages(imageUrls);
  }, [service?.specialists]);

  // Установка URL для шаринга
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);
  
  // Проверка на наличие услуги в избранном
  useEffect(() => {
    if (isAuthenticated && user?.favorites?.services) {
      setIsFavorite(user.favorites.services.includes(id));
    }
  }, [isAuthenticated, user, id]);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/services/${id}`);
        const data = await response.json();
        
        if (response.ok) {
          setService(data);
        } else {
          setError(data.error || 'Произошла ошибка при загрузке данных');
        }
      } catch (error) {
        console.error('Ошибка при загрузке услуги:', error);
        setError('Произошла ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchService();
    }
  }, [id]);

  const openBookingModal = () => {
    setShowBookingModal(true);
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
  };

  const shareService = () => {
    if (navigator.share) {
      navigator.share({
        title: service?.title || 'Интересная услуга',
        text: service?.description || 'Узнайте больше об этой услуге',
        url: shareUrl,
      })
      .catch((error) => {
        console.error('Ошибка при шаринге:', error);
        copyToClipboard(shareUrl);
      });
    } else {
      copyToClipboard(shareUrl);
    }
  };
  
  // Универсальная функция копирования, работающая на всех устройствах
  const copyToClipboard = (text: string) => {
    // Пробуем использовать современный API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text)
        .then(() => {
          const toast = document.createElement('div');
          toast.textContent = 'Ссылка скопирована в буфер обмена';
          toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50';
          document.body.appendChild(toast);
          
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
        const toast = document.createElement('div');
        toast.textContent = 'Ссылка скопирована в буфер обмена';
        toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50';
        document.body.appendChild(toast);
        
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 2000);
      } else {
        const toast = document.createElement('div');
        toast.textContent = 'Не удалось скопировать ссылку. Пожалуйста, скопируйте её вручную';
        toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50';
        document.body.appendChild(toast);
        
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Ошибка при резервном копировании:', err);
      const toast = document.createElement('div');
      toast.textContent = 'Не удалось скопировать ссылку';
      toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Услуга не найдена</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error || 'Запрашиваемая услуга не существует или была удалена'}</p>
          <Link href="/services" className="text-[#48a9a6] hover:underline inline-flex items-center text-sm sm:text-base">
            <FaArrowLeft className="mr-2" />
            Вернуться к списку услуг
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <Link href="/services" className="inline-flex items-center text-[#48a9a6] hover:underline text-sm sm:text-base">
          <FaArrowLeft className="mr-2" />
          Назад к услугам
        </Link>
        
        <div className="flex gap-2">
          <FavoriteButton serviceId={id} initialIsFavorite={isFavorite} />
          
          <button
            onClick={shareService}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <FaShareAlt className="mr-2" />
            Поделиться
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="relative w-full h-48 sm:h-64 md:h-80">
          <Image
            src={serviceSrc}
            alt={service?.name || 'Услуга'}
            fill
            className="object-cover"
            unoptimized={true}
            priority={true}
            loading="eager"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              console.error(`Ошибка загрузки изображения услуги: ${target.src}`);
              // Пробуем загрузить изображение еще раз с новым timestamp через API
              const newTimestamp = new Date().getTime();
              if (service && service.id) {
                target.src = `/api/images?path=services/${service.id}&t=${newTimestamp}`;
              } else {
                target.src = '/images/photoPreview.jpg';
              }
              // Если повторная попытка не удалась, используем заглушку
              target.onerror = () => {
                console.error(`Повторная попытка загрузки изображения услуги не удалась`);
              target.src = '/images/photoPreview.jpg';
                target.onerror = null; // Предотвращаем бесконечный цикл
              };
            }}
            onLoad={() => {
              console.log(`Изображение услуги успешно загружено: ${service?.name}`);
            }}
          />
        </div>
        
        <div className="p-4 sm:p-6 md:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#4B4B4B] mb-3 sm:mb-4">{service?.name}</h1>
          
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="inline-flex items-center px-2 sm:px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs sm:text-sm font-medium">
              <FaRubleSign size={12} className="mr-1 sm:mr-2" />
              {service ? formatPrice(service.price) : '0 ₽'}
            </div>
            
            <div className="inline-flex items-center px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
              <FaClock size={12} className="mr-1 sm:mr-2" />
              {service ? service.duration : '0'} минут
            </div>
          </div>
          
          <div 
            className="prose prose-sm sm:prose max-w-none mb-6 sm:mb-8 text-gray-700"
            dangerouslySetInnerHTML={{ __html: service?.description || '' }}
          />
          
          {service?.specialists && service.specialists.length > 0 && (
            <div className="mb-5 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-[#4B4B4B]">Специалисты</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {service.specialists.map(specialist => (
                  <Link 
                    href={`/specialists/${specialist.id}`} 
                    key={specialist.id} 
                    className="flex items-center p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden bg-gray-100 mr-2 sm:mr-3">
                      {specialistImages[specialist.id] ? (
                        <Image 
                          src={specialistImages[specialist.id]} 
                          alt={`${specialist.firstName} ${specialist.lastName}`} 
                          fill
                          className="object-cover"
                          unoptimized={true}
                          loading="eager"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            console.error(`Ошибка загрузки изображения специалиста: ${target.src}`);
                              target.src = '/images/photoPreview.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#48a9a6]/20 text-[#48a9a6]">
                          <FaUser />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[#4B4B4B] text-sm sm:text-base">
                        {specialist.firstName} {specialist.lastName}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <button 
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors text-sm sm:text-base font-medium shadow-md hover:shadow-lg"
              onClick={openBookingModal}
            >
              <FaCalendarAlt className="text-lg" />
              <span>Записаться на услугу</span>
            </button>
            
            <div className="flex gap-2">
              <FavoriteButton serviceId={id} initialIsFavorite={isFavorite} />
              
              <button
                onClick={shareService}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <FaShareAlt className="mr-2" />
                Поделиться
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Модальное окно бронирования */}
      {service && (
        <BookingModal 
          isOpen={showBookingModal} 
          onClose={closeBookingModal} 
          service={service} 
        />
      )}
    </div>
  );
} 