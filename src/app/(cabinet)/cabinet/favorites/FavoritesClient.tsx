'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaHeart, FaSpinner } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';

// Типы данных
interface Article {
  id: string;
  title: string;
  excerpt: string;
  thumbnail: string;
  banner?: string;
  image?: string;
  publishedAt: string;
  category: string;
  author: {
    firstName: string;
    lastName: string;
  };
  views: number;
}

interface Service {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  image?: string;
  price: number;
  duration: number;
  category: string;
  color: string;
}

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  avatar?: string;
  specialization: string;
  position?: string;
  rating: number;
}

export default function FavoritesClient() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParamsWrapper();

  // Состояния
  const [activeTab, setActiveTab] = useState<'articles' | 'services' | 'specialists'>('articles');
  const [favoriteArticles, setFavoriteArticles] = useState<Article[]>([]);
  const [favoriteServices, setFavoriteServices] = useState<Service[]>([]);
  const [favoriteSpecialists, setFavoriteSpecialists] = useState<Specialist[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/cabinet/favorites');
      return;
    }

    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated, authLoading, router]);

  // Проверяем параметры URL при загрузке
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'articles' || tab === 'services' || tab === 'specialists') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Загрузка данных избранного
  const fetchFavorites = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('[FavoritesClient] Начало загрузки избранного...');
      const response = await fetch('/api/favorites');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FavoritesClient] Ошибка при загрузке избранного:', errorText);
        throw new Error(`Ошибка при загрузке избранного: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[FavoritesClient] Ответ API избранного:', data);
      
      if (data.success) {
        console.log('[FavoritesClient] Полученные данные из API:', data.data);
        
        if (!data.data) {
          console.warn('[FavoritesClient] Данные отсутствуют в ответе API');
          setFavoriteArticles([]);
          setFavoriteServices([]);
          setFavoriteSpecialists([]);
          return;
        }
        
        // Обрабатываем статьи
        if (Array.isArray(data.data.articles)) {
          const articles = data.data.articles;
          console.log(`[FavoritesClient] Загружено ${articles.length} статей`);
          if (articles.length === 0) {
            console.log('[FavoritesClient] Список статей пуст');
          }
          setFavoriteArticles(articles);
        } else {
          console.warn('[FavoritesClient] Поле articles отсутствует или не является массивом');
          setFavoriteArticles([]);
        }
        
        // Обрабатываем услуги
        if (Array.isArray(data.data.services)) {
          const services = data.data.services;
          console.log(`[FavoritesClient] Загружено ${services.length} услуг`);
          if (services.length === 0) {
            console.log('[FavoritesClient] Список услуг пуст');
          }
          setFavoriteServices(services);
        } else {
          console.warn('[FavoritesClient] Поле services отсутствует или не является массивом');
          setFavoriteServices([]);
        }
        
        // Обрабатываем специалистов
        if (Array.isArray(data.data.specialists)) {
          const specialists = data.data.specialists;
          console.log(`[FavoritesClient] Загружено ${specialists.length} специалистов`);
          if (specialists.length === 0) {
            console.log('[FavoritesClient] Список специалистов пуст');
          }
          setFavoriteSpecialists(specialists);
        } else {
          console.warn('[FavoritesClient] Поле specialists отсутствует или не является массивом');
          setFavoriteSpecialists([]);
        }
        
        // Проверяем, есть ли хоть один элемент в избранном
        const totalItems = 
          (Array.isArray(data.data.articles) ? data.data.articles.length : 0) +
          (Array.isArray(data.data.services) ? data.data.services.length : 0) +
          (Array.isArray(data.data.specialists) ? data.data.specialists.length : 0);
        
        if (totalItems === 0) {
          console.log('[FavoritesClient] Избранное полностью пусто');
        } else {
          console.log(`[FavoritesClient] Всего элементов в избранном: ${totalItems}`);
        }
      } else {
        console.error('[FavoritesClient] Ошибка в ответе API:', data.message);
        setError(data.message || 'Произошла ошибка при загрузке избранного');
        
        // Сбрасываем все списки
        setFavoriteArticles([]);
        setFavoriteServices([]);
        setFavoriteSpecialists([]);
      }
    } catch (err) {
      console.error('[FavoritesClient] Исключение при загрузке избранного:', err);
      setError('Произошла ошибка при загрузке избранного. Пожалуйста, попробуйте позже.');
      
      // Сбрасываем все списки
      setFavoriteArticles([]);
      setFavoriteServices([]);
      setFavoriteSpecialists([]);
      
      // Пробуем перезагрузить данные через 3 секунды
      setTimeout(() => {
        console.log('[FavoritesClient] Повторная попытка загрузки избранного...');
        fetchFavorites();
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Удаление статьи из избранного
  const removeArticleFromFavorites = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    
    try {
      const response = await fetch(`/api/favorites/articles/${articleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
        }),
      });

      if (response.ok) {
        // Обновляем список избранных статей
        setFavoriteArticles(prev => prev.filter(article => article.id !== articleId));
      }
    } catch (err) {
      console.error('Ошибка при удалении из избранного:', err);
    }
  };

  // Удаление услуги из избранного
  const removeServiceFromFavorites = async (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    
    try {
      const response = await fetch(`/api/favorites/services/${serviceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
        }),
      });

      if (response.ok) {
        // Обновляем список избранных услуг
        setFavoriteServices(prev => prev.filter(service => service.id !== serviceId));
      }
    } catch (err) {
      console.error('Ошибка при удалении из избранного:', err);
    }
  };

  // Удаление специалиста из избранного
  const removeSpecialistFromFavorites = async (specialistId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    
    try {
      const response = await fetch(`/api/favorites/specialists/${specialistId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
        }),
      });

      if (response.ok) {
        // Обновляем список избранных специалистов
        setFavoriteSpecialists(prev => prev.filter(specialist => specialist.id !== specialistId));
      }
    } catch (err) {
      console.error('Ошибка при удалении из избранного:', err);
    }
  };

  // Рендеринг содержимого в зависимости от выбранной вкладки
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <FaSpinner className="animate-spin text-[#48a9a6] text-3xl" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500 p-4 border border-red-200 rounded-lg">
          {error}
        </div>
      );
    }

    switch (activeTab) {
      case 'articles':
        return favoriteArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteArticles.map(article => (
              <div 
                key={article.id} 
                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => router.push(`/blog/${article.id}`)}
              >
                <div className="relative h-48 w-full">
                  <Image 
                    src={article.thumbnail || article.banner || article.image || '/images/placeholder-article.jpg'} 
                    alt={article.title}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    fill
                    unoptimized={true}
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 group-hover:text-[#48a9a6] transition-colors">{article.title}</h3>
                    <button 
                      onClick={(e) => removeArticleFromFavorites(article.id, e)}
                      className="text-red-500 hover:text-red-700 z-10"
                    >
                      <FaHeart />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{article.excerpt}</p>
                  <div className="text-xs text-gray-500">
                    <span>{formatDate(article.publishedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">У вас пока нет избранных статей.</p>
            <Link 
              href="/blog" 
              className="inline-block bg-[#48a9a6] text-white px-4 py-2 rounded-lg hover:bg-[#3a8a87] transition-colors"
            >
              Перейти к статьям
            </Link>
          </div>
        );
      
      case 'services':
        return favoriteServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteServices.map(service => (
              <div 
                key={service.id} 
                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => router.push(`/services/${service.id}`)}
              >
                <div className="relative h-40 w-full">
                  <Image 
                    src={service.thumbnail || service.image || '/images/placeholder-service.jpg'} 
                    alt={service.name}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    fill
                    unoptimized={true}
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-[#48a9a6] transition-colors">{service.name}</h3>
                    <button 
                      onClick={(e) => removeServiceFromFavorites(service.id, e)}
                      className="text-red-500 hover:text-red-700 z-10"
                    >
                      <FaHeart />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[#48a9a6] font-medium">{service.price} ₽</span>
                    <span className="text-xs text-gray-500">{service.duration} мин.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">У вас пока нет избранных услуг.</p>
            <Link 
              href="/services" 
              className="inline-block bg-[#48a9a6] text-white px-4 py-2 rounded-lg hover:bg-[#3a8a87] transition-colors"
            >
              Перейти к услугам
            </Link>
          </div>
        );
      
      case 'specialists':
        return favoriteSpecialists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteSpecialists.map(specialist => (
              <div 
                key={specialist.id} 
                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => router.push(`/specialists/${specialist.id}`)}
              >
                <div className="relative h-48 w-full">
                  <Image 
                    src={specialist.photo || specialist.avatar || '/images/placeholder-specialist.jpg'} 
                    alt={`${specialist.firstName} ${specialist.lastName}`}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    fill
                    unoptimized={true}
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-[#48a9a6] transition-colors">{specialist.firstName} {specialist.lastName}</h3>
                    <button 
                      onClick={(e) => removeSpecialistFromFavorites(specialist.id, e)}
                      className="text-red-500 hover:text-red-700 z-10"
                    >
                      <FaHeart />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{specialist.specialization || specialist.position || 'Специалист'}</p>
                  <div className="flex items-center">
                    {specialist.rating && (
                      <>
                        <span className="text-yellow-500">★</span>
                        <span className="ml-1 text-sm">{specialist.rating.toFixed(1)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">У вас пока нет избранных специалистов.</p>
            <Link 
              href="/specialists" 
              className="inline-block bg-[#48a9a6] text-white px-4 py-2 rounded-lg hover:bg-[#3a8a87] transition-colors"
            >
              Перейти к специалистам
            </Link>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="flex justify-between items-center mb-6">
        <Link href="/cabinet" className="inline-flex items-center text-[#48a9a6] hover:underline">
          <FaArrowLeft className="mr-2" />
          <span>Вернуться в личный кабинет</span>
        </Link>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Избранное</h1>

      {/* Вкладки */}
      <div className="flex mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('articles')}
          className={`pb-3 px-4 font-medium text-sm ${
            activeTab === 'articles'
              ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Статьи {favoriteArticles.length > 0 && `(${favoriteArticles.length})`}
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 px-4 font-medium text-sm ${
            activeTab === 'services'
              ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Услуги {favoriteServices.length > 0 && `(${favoriteServices.length})`}
        </button>
        <button
          onClick={() => setActiveTab('specialists')}
          className={`pb-3 px-4 font-medium text-sm ${
            activeTab === 'specialists'
              ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Специалисты {favoriteSpecialists.length > 0 && `(${favoriteSpecialists.length})`}
        </button>
      </div>

      {/* Содержимое выбранной вкладки */}
      {renderTabContent()}
    </div>
  );
} 