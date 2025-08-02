'use client';

import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEdit, FaTrash, FaEye, FaSearch, FaFilter, FaSortAmountDown, FaSortAmountUp, FaCalendarAlt, FaUser, FaTag, FaSort, FaSortUp, FaSortDown, FaImage, FaCog, FaComments } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from '@/components/ui/Toast';
import { Dialog, Transition } from '@headlessui/react';

// Типы данных для статей
type ArticleCategory = string;

type Article = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  banner: string; // Путь к изображению
  category: ArticleCategory;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  specialistId?: string; // Добавляем ID специалиста, если есть
  publishedAt: string | null; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  status: 'draft' | 'published';
  views: number;
  slug: string;
  tags?: string[];
  commentsCount?: number; // Добавляем количество комментариев
};

// Компонент для категории статьи
const CategoryTag = ({ category }: { category: ArticleCategory }) => {
  const categoryMap: Record<string, { label: string, color: string }> = {
    'inspiration': { label: 'Вдохновение', color: 'bg-purple-100 text-purple-800' },
    'news': { label: 'Новости', color: 'bg-blue-100 text-blue-800' },
    'health': { label: 'Здоровье', color: 'bg-green-100 text-green-800' },
    'psychology': { label: 'Психология', color: 'bg-purple-100 text-purple-800' },
    'yoga': { label: 'Йога', color: 'bg-amber-100 text-amber-800' },
    'massage': { label: 'Массаж', color: 'bg-indigo-100 text-indigo-800' },
    'tarot': { label: 'Таро', color: 'bg-pink-100 text-pink-800' },
  };
  
  const { label, color } = categoryMap[category] || { label: category, color: 'bg-gray-100 text-gray-800' };
  
  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${color}`}>
      {label}
    </span>
  );
};

// Компонент для статуса статьи
const StatusTag = ({ status }: { status: 'draft' | 'published' }) => {
  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
      status === 'published' 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800'
    }`}>
      {status === 'published' ? 'Опубликовано' : 'Черновик'}
    </span>
  );
};

const ArticleAuthor = ({ 
  article, 
  specialists 
}: { 
  article: Article, 
  specialists: Array<{ id: string, firstName: string, lastName: string }>
}) => {
  // Если есть specialistId, ищем специалиста в списке
  if (article.specialistId) {
    const specialist = specialists.find(s => s.id === article.specialistId);
    if (specialist) {
      return (
        <div className="flex items-center text-sm text-gray-500">
          <FaUser className="mr-1" />
          <span>
            {specialist.firstName} {specialist.lastName}
            <span className="ml-1 text-xs text-gray-400">(специалист)</span>
          </span>
        </div>
      );
    }
  }
  
  // Если специалист не найден или его нет, показываем автора
  return (
    <div className="flex items-center text-sm text-gray-500">
      <FaUser className="mr-1" />
      <span>{article.author.name}</span>
    </div>
  );
};

export default function ArticlesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Состояния для поиска и фильтрации
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ArticleCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sortField, setSortField] = useState<'publishedAt' | 'createdAt' | 'title' | 'views'>('publishedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [specialists, setSpecialists] = useState<Array<{ id: string, firstName: string, lastName: string }>>([]);
  const [specialistFilter, setSpecialistFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [consultationServiceId, setConsultationServiceId] = useState('');
  const [isConsultationEnabled, setIsConsultationEnabled] = useState(true);
  const [consultationTitle, setConsultationTitle] = useState('Нужна консультация специалиста?');
  const [consultationDescription, setConsultationDescription] = useState('Обсудите ваши вопросы с экспертом. Наши специалисты помогут вам найти решение ваших проблем и подобрать индивидуальный подход.');
  const [services, setServices] = useState<Array<{ id: string, name: string, price: number }>>([]);

  // Загрузка данных с сервера
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/articles');
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке статей');
        }
        
        const data = await response.json();
        console.log('Загруженные статьи:', data);
        
        // Проверяем формат данных и корректно обрабатываем их
        let articlesArray = [];
        if (Array.isArray(data)) {
          articlesArray = data;
        } else if (data && typeof data === 'object') {
          // Если пришел объект вместо массива, пробуем извлечь данные
          if (Array.isArray(data.articles)) {
            articlesArray = data.articles;
          } else if (Array.isArray(data.data)) {
            articlesArray = data.data; // Добавляем проверку на data
          } else if (data.error) {
            console.error('Ошибка API:', data.error);
            throw new Error(data.error);
          } else {
            console.warn('API вернул неожиданный формат данных:', data);
            articlesArray = [];
          }
        }
        
        // Дополнительно проверяем каждый элемент массива
        const validArticles = articlesArray.filter(article => 
          article && typeof article === 'object' && article.id
        );
        
        setArticles(validArticles);
        
        // Извлекаем уникальные категории
        const uniqueCategories = Array.from(
          new Set(validArticles
            .map((article: Article) => article.category)
            .filter((category): category is string => Boolean(category)))
        ).sort();
        
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Ошибка при загрузке статей:', error);
        toast.error('Ошибка при загрузке статей');
        setArticles([]); // Устанавливаем пустой массив в случае ошибки
      } finally {
        setLoading(false);
        setIsLoaded(true);
      }
    };
    
    const fetchSpecialists = async () => {
      try {
        const response = await fetch('/api/specialists');
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке специалистов');
        }
        
        const data = await response.json();
        
        // Проверяем формат данных
        if (Array.isArray(data)) {
          setSpecialists(data);
        } else {
          console.warn('API специалистов вернул неожиданный формат данных:', data);
          setSpecialists([]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке специалистов:', error);
        setSpecialists([]);
      }
    };
    
    // Загружаем данные, если пользователь - админ
    if (!isLoading && user && (user.role?.toUpperCase() === 'ADMIN')) {
      console.log('Загружаем данные для админа, роль:', user.role);
      fetchArticles();
      fetchSpecialists();
    }
  }, [isLoading, user]);

  // Защита маршрута: только для админов
  useEffect(() => {
    // Специальная проверка для пользователя bakeevd@yandex.ru
    if (!isLoading && user && user.email === 'bakeevd@yandex.ru') {
      console.log('Доступ к странице статей разрешен для bakeevd@yandex.ru');
      return; // Пропускаем проверку роли
    }
    
    // Приводим роль к верхнему регистру для сравнения
    const userRole = user?.role?.toUpperCase();
    
    // Если пользователь не админ, перенаправляем на главную страницу
    if (!isLoading && (!user || userRole !== 'ADMIN')) {
      console.log('Доступ запрещен: пользователь не администратор, роль:', userRole);
      toast.error('У вас нет прав для доступа к управлению статьями');
      router.replace('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings/consultation');
        if (response.ok) {
          const data = await response.json();
          setConsultationServiceId(data.serviceId || '');
          setIsConsultationEnabled(data.isEnabled !== undefined ? data.isEnabled : true);
          setConsultationTitle(data.title || 'Нужна консультация специалиста?');
          setConsultationDescription(data.description || 'Обсудите ваши вопросы с экспертом. Наши специалисты помогут вам найти решение ваших проблем и подобрать индивидуальный подход.');
        }
      } catch (error) {
        console.error('Ошибка при загрузке настроек консультации:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // Загрузка услуг при открытии модального окна
  useEffect(() => {
    if (!isSettingsOpen) return;
    
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (response.ok) {
          const data = await response.json();
          // Фильтруем активные услуги
          const activeServices = data.filter((service: any) => !service.isArchived);
          setServices(activeServices);
        }
      } catch (error) {
        console.error('Ошибка при загрузке услуг:', error);
      }
    };
    
    fetchServices();
  }, [isSettingsOpen]);
  
  const saveConsultationSettings = async () => {
    try {
      const response = await fetch('/api/settings/consultation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: consultationServiceId,
          isEnabled: isConsultationEnabled,
          title: consultationTitle,
          description: consultationDescription
        }),
      });
      
      if (response.ok) {
        toast.success('Настройки консультации сохранены');
        setIsSettingsOpen(false);
      } else {
        toast.error('Ошибка при сохранении настроек');
      }
    } catch (error) {
      toast.error('Ошибка при сохранении настроек');
      console.error(error);
    }
  };

  // Удаление статьи
  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту статью?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при удалении статьи');
      }
      
      // Обновить список статей
      setArticles(articles.filter(article => article.id !== id));
      toast.success('Статья успешно удалена');
    } catch (error) {
      console.error('Ошибка при удалении статьи:', error);
      toast.error('Ошибка при удалении статьи');
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Фильтрация статей
  const filteredArticles = articles.filter(article => {
    // Проверяем, что статья существует и содержит необходимые поля
    if (!article || typeof article !== 'object') {
      return false;
    }
    
    const matchesSearch = 
      (article.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (article.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (article.content?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      ((article.author?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    const matchesSpecialist = specialistFilter === 'all' || article.specialistId === specialistFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesSpecialist;
  });

  // Сортировка статей
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (!a || !b) return 0;
    
    let comparison = 0;
    
    switch (sortField) {
      case 'publishedAt':
        // Для черновиков используем createdAt если publishedAt пустой
        const aDate = a.publishedAt || a.createdAt || '';
        const bDate = b.publishedAt || b.createdAt || '';
        comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
        break;
      case 'createdAt':
        const aCreated = a.createdAt || '';
        const bCreated = b.createdAt || '';
        comparison = new Date(aCreated).getTime() - new Date(bCreated).getTime();
        break;
      case 'title':
        comparison = (a.title || '').localeCompare(b.title || '');
        break;
      case 'views':
        comparison = (a.views || 0) - (b.views || 0);
        break;
      default:
        return 0;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Функция для переключения направления сортировки
  const toggleSortDirection = (field: 'publishedAt' | 'createdAt' | 'title' | 'views') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // По умолчанию сначала новые
    }
  };

  // Пока загружаем данные, показываем индикатор загрузки
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }

  // Проверка роли в верхнем регистре
  const userRole = user?.role?.toUpperCase();
  
  // Если пользователь не админ, ничего не показываем
  if (!user || userRole !== 'ADMIN') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Управление статьями</h1>
      </div>
      
      <Link href="/admin" className="inline-block mb-6 text-[#48a9a6] hover:underline">
        ← Вернуться в панель управления
      </Link>
      
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => router.push('/admin/articles/add')}
                  className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors flex items-center"
                >
                  <span className="inline-block mr-2">+</span> Добавить статью
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center md:ml-2"
                >
                  <FaCog className="mr-2" /> 
                </button>
              </div>
              
              {/* Поиск */}
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Поиск статей..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-2 px-4 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            
            {/* Фильтры */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as ArticleCategory | 'all')}
                    className="w-full md:w-48 py-2 px-4 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] appearance-none"
                  >
                    <option value="all">Все категории</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full md:w-40 py-2 px-4 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] appearance-none"
                  >
                    <option value="all">Все статусы</option>
                    <option value="published">Опубликованные</option>
                    <option value="draft">Черновики</option>
                  </select>
                  <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
            
            {/* Сортировка */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => toggleSortDirection('publishedAt')}
                className={`px-3 py-1 rounded-md text-xs flex items-center ${sortField === 'publishedAt' ? 'bg-[#48a9a6]/10 text-[#48a9a6]' : 'bg-gray-100 text-gray-700'}`}
              >
                <FaCalendarAlt className="mr-1" />
                <span>По дате публикации</span>
                {sortField === 'publishedAt' && (
                  sortDirection === 'desc' ? <FaSortAmountDown className="ml-1" /> : <FaSortAmountUp className="ml-1" />
                )}
              </button>
              <button 
                onClick={() => toggleSortDirection('createdAt')}
                className={`px-3 py-1 rounded-md text-xs flex items-center ${sortField === 'createdAt' ? 'bg-[#48a9a6]/10 text-[#48a9a6]' : 'bg-gray-100 text-gray-700'}`}
              >
                <FaCalendarAlt className="mr-1" />
                <span>По дате создания</span>
                {sortField === 'createdAt' && (
                  sortDirection === 'desc' ? <FaSortAmountDown className="ml-1" /> : <FaSortAmountUp className="ml-1" />
                )}
              </button>
              <button 
                onClick={() => toggleSortDirection('title')}
                className={`px-3 py-1 rounded-md text-xs flex items-center ${sortField === 'title' ? 'bg-[#48a9a6]/10 text-[#48a9a6]' : 'bg-gray-100 text-gray-700'}`}
              >
                <span>По названию</span>
                {sortField === 'title' && (
                  sortDirection === 'desc' ? <FaSortAmountDown className="ml-1" /> : <FaSortAmountUp className="ml-1" />
                )}
              </button>
              <button 
                onClick={() => toggleSortDirection('views')}
                className={`px-3 py-1 rounded-md text-xs flex items-center ${sortField === 'views' ? 'bg-[#48a9a6]/10 text-[#48a9a6]' : 'bg-gray-100 text-gray-700'}`}
              >
                <span>По просмотрам</span>
                {sortField === 'views' && (
                  sortDirection === 'desc' ? <FaSortAmountDown className="ml-1" /> : <FaSortAmountUp className="ml-1" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Индикатор сортировки */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Найдено статей: {sortedArticles.length}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Порядок:</span>
          <button 
            onClick={() => setSortDirection('desc')}
            className={`px-3 py-1 rounded-md text-xs flex items-center ${
              sortDirection === 'desc' ? 'bg-[#48a9a6] text-white' : 'bg-gray-100 text-gray-700'
            }`}
            title="Сначала новые"
          >
            Сначала новые
          </button>
          <button 
            onClick={() => setSortDirection('asc')}
            className={`px-3 py-1 rounded-md text-xs flex items-center ${
              sortDirection === 'asc' ? 'bg-[#48a9a6] text-white' : 'bg-gray-100 text-gray-700'
            }`}
            title="Сначала старые"
          >
            Сначала старые
          </button>
        </div>
      </div>
      
      {/* Добавляем фильтрацию по специалистам */}
      <div className="mb-4">
        <label htmlFor="specialistFilter" className="block text-sm font-medium text-gray-700 mb-1">
          Автор (специалист)
        </label>
        <select
          id="specialistFilter"
          value={specialistFilter}
          onChange={(e) => setSpecialistFilter(e.target.value)}
          className="block w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">Все специалисты</option>
          {specialists.map(specialist => (
            <option key={specialist.id} value={specialist.id}>
              {specialist.firstName} {specialist.lastName}
            </option>
          ))}
        </select>
      </div>
      
      {/* Список статей */}
      <div className="space-y-6">
        {sortedArticles.map((article) => (
          <div key={article.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="md:flex">
              <div className="md:flex-shrink-0 relative h-48 md:h-auto md:w-48 bg-gray-100">
                {article.banner ? (
                  <Image 
                    src={article.banner}
                    alt={article.title}
                    fill
                    className="object-cover md:h-full md:w-48"
                    onError={(e) => {
                      // Если изображение не загрузилось, используем заглушку
                      (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x300?text=${encodeURIComponent(article.category || 'Статья')}`;
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FaImage size={40} className="mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">Нет изображения</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 md:p-6 flex-1">
                <div className="flex flex-wrap gap-2 mb-2">
                  <CategoryTag category={article.category} />
                  <StatusTag status={article.status} />
                </div>
                
                <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-900">{article.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{article.excerpt}</p>
                
                <div className="flex flex-wrap justify-between items-end">
                  <div className="mb-2 md:mb-0">
                    <ArticleAuthor article={article} specialists={specialists} />
                    <div className="text-xs text-gray-500 mt-1">
                      <div>Создано: {formatDate(article.createdAt)}</div>
                      {article.status === 'published' && (
                        <div>Опубликовано: {formatDate(article.publishedAt)}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    {article.views > 0 && (
                        <span className="flex items-center">
                          <FaEye className="mr-1" /> {article.views}
                        </span>
                      )}
                      {/* Отображаем количество комментариев */}
                      <span className="flex items-center">
                        <FaComments className="mr-1" /> {article.commentsCount || 0}
                      </span>
                      </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link 
                      href={`/admin/articles/edit/${article.id}`}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm flex items-center"
                    >
                      <FaEdit className="mr-1" />
                      <span className="md:inline">Изменить</span>
                    </Link>
                    <button 
                      onClick={() => handleDeleteArticle(article.id)} 
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-sm flex items-center"
                    >
                      <FaTrash className="mr-1" />
                      <span className="md:inline">Удалить</span>
                    </button>
                    <Link 
                      href={`/blog/${article.slug}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-sm flex items-center"
                    >
                      <FaEye className="mr-1" />
                      <span className="md:inline">Просмотр</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {sortedArticles.length === 0 && (
          <div className="text-center py-10 bg-gray-50 rounded-xl">
            <p className="text-gray-500">Статьи не найдены</p>
          </div>
        )}
      </div>
      
      {/* Модальное окно настроек */}
      <Transition appear show={isSettingsOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsSettingsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                  >
                    Настройки блока консультации на странице статьи
                  </Dialog.Title>
                  
                  <div className="mt-2">
                    <div className="mb-4">
                      <label className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={isConsultationEnabled}
                          onChange={(e) => setIsConsultationEnabled(e.target.checked)}
                          className="mr-2 h-4 w-4"
                        />
                        <span className="text-sm font-medium text-gray-700">Отображать блок на странице статьи</span>
                      </label>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Заголовок блока
                      </label>
                      <input
                        type="text"
                        value={consultationTitle}
                        onChange={(e) => setConsultationTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                        placeholder="Заголовок блока консультации"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Описание
                      </label>
                      <textarea
                        value={consultationDescription}
                        onChange={(e) => setConsultationDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                        placeholder="Описание блока консультации"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Услуга для записи
                      </label>
                      <select
                        value={consultationServiceId}
                        onChange={(e) => setConsultationServiceId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                      >
                        <option value="">Выберите услугу</option>
                        {services.map(service => (
                          <option key={service.id} value={service.id}>{service.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                      onClick={() => setIsSettingsOpen(false)}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-[#48a9a6] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a8a87] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#48a9a6]"
                      onClick={saveConsultationSettings}
                    >
                      Сохранить
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* Добавляем отступ внизу страницы для мобильных устройств */}
      <div className="pb-20"></div>
    </div>
  );
} 