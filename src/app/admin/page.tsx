'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaUsers, FaBookMedical, FaCalendarAlt, FaNewspaper, FaChartLine, FaComments, FaCog, FaBroom, FaDatabase, FaHeart, FaStore } from 'react-icons/fa';
import { ReactNode } from 'react';
import { toast } from 'react-hot-toast';

// Функция для проверки прав администратора
function isUserAdmin(user: any): boolean {
  if (!user) return false;
  
  // Проверяем email для специального пользователя
  if (user.email === 'bakeevd@yandex.ru') return true;
  
  // Проверяем роль в верхнем регистре
  if (typeof user.role === 'string' && user.role.toUpperCase() === 'ADMIN') return true;
  
  // Проверяем роль в нижнем регистре
  if (typeof user.role === 'string' && user.role.toLowerCase() === 'admin') return true;
  
  // Проверяем массив ролей
  if (Array.isArray(user.roles) && user.roles.some((role: string) => role.toLowerCase() === 'admin')) return true;
  
  // Проверяем, если роль - это объект с полем name
  if (user.role && typeof user.role === 'object' && user.role.name && 
      (user.role.name.toUpperCase() === 'ADMIN' || user.role.name.toLowerCase() === 'admin')) return true;
  
  return false;
}

type StatCardProps = {
  title: string;
  value: number;
  icon: ReactNode;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'indigo';
  href: string;
};

type AdminCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
};

type Stats = {
  users: number;
  specialists: number;
  services: number;
  articles: number;
  appointments: number;
  reviews: number;
};

export default function AdminPanel() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // Данные статистики
  const [stats, setStats] = useState<Stats>({
    users: 0,
    specialists: 0,
    services: 0,
    articles: 0,
    appointments: 0,
    reviews: 0
  });
  
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCleaningFiles, setIsCleaningFiles] = useState(false);

  // Загрузка данных статистики
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Добавляем параметр времени для предотвращения кеширования
        const timestamp = new Date().getTime();
        // Запрос к API для статистики
        const response = await fetch(`/api/admin/stats?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.data.stats);
          } else {
            // Если API не вернул данные - запаcное решение
            console.error('Ошибка получения статистики:', data.error);
            fetchStatsFromUsers();
          }
        } else {
          console.error('Ошибка при запросе статистики');
          fetchStatsFromUsers();
        }
      } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        fetchStatsFromUsers();
      } finally {
        setStatsLoaded(true);
      }
    };
    
    // Запасной вариант: подсчет пользователей по ролям для статистики
    const fetchStatsFromUsers = async () => {
      try {
        // Добавляем параметр времени для предотвращения кеширования
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/admin/users?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const users = data.data.users;
            
            // Считаем количество пользователей по ролям
            const numUsers = users.filter((u: any) => 
              u.role.toUpperCase() === 'USER').length;
              
            const numSpecialists = users.filter((u: any) => 
              u.role.toUpperCase() === 'SPECIALIST').length;
              
            // Устанавливаем статистику на основе реальных данных
            setStats(prev => ({
              ...prev,
              users: users.length,
              specialists: numSpecialists,
            }));
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
      } finally {
        setStatsLoaded(true);
      }
    };
    
    fetchStats();
  }, []);

  // Защита маршрута: только для админов
  useEffect(() => {
    // Проверка прав администратора с использованием функции isUserAdmin
    if (!isLoading && isUserAdmin(user)) {
      console.log('Доступ к админке разрешен для пользователя:', user?.email);
      return;
    }
    
    // Если пользователь не админ, перенаправляем на главную страницу
    if (!isLoading) {
      console.log('Доступ запрещен: пользователь не администратор, роль:', user?.role);
      toast.error('У вас нет прав для доступа к панели администратора');
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // Функция для очистки неактуальных связей
  const cleanupRelations = async () => {
    if (isCleaning) return;
    
    if (!confirm('Вы действительно хотите выполнить очистку неактуальных связей? Это удалит все ссылки на несуществующие услуги и специалистов.')) {
      return;
    }
    
    setIsCleaning(true);
    
    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Неактуальные связи успешно очищены!');
        } else {
          toast.error('Ошибка при очистке связей: ' + (data.error || 'Неизвестная ошибка'));
        }
      } else {
        toast.error('Ошибка при выполнении запроса очистки');
      }
    } catch (error) {
      console.error('Ошибка при очистке связей:', error);
      toast.error('Произошла ошибка при выполнении очистки');
    } finally {
      setIsCleaning(false);
    }
  };

  // Функция для очистки неактуальных файлов
  const cleanupFiles = async () => {
    if (isCleaningFiles) return;
    
    if (!confirm('Вы действительно хотите выполнить очистку неактуальных файлов? Это удалит все файлы, которые больше не используются в базе данных.')) {
      return;
    }
    
    setIsCleaningFiles(true);
    
    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Неактуальные файлы успешно очищены!');
        } else {
          toast.error('Ошибка при очистке файлов: ' + (data.error || 'Неизвестная ошибка'));
        }
      } else {
        toast.error('Ошибка при выполнении запроса очистки файлов');
      }
    } catch (error) {
      console.error('Ошибка при очистке файлов:', error);
      toast.error('Произошла ошибка при выполнении очистки файлов');
    } finally {
      setIsCleaningFiles(false);
    }
  };

  if (isLoading || !statsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EAE8E1]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }
  
  // Проверка прав администратора с использованием функции isUserAdmin
  const hasAdminAccess = isUserAdmin(user);

  if (!hasAdminAccess) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Статистика */}
      <div className="mb-8 md:mb-12">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Статистика сайта</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <StatCard 
            title="Пользователи" 
            value={stats.users} 
            icon={<FaUsers className="text-blue-500" size={20} />} 
            color="blue"
            href="/admin/users"
          />
          <StatCard 
            title="Специалисты" 
            value={stats.specialists} 
            icon={<FaBookMedical className="text-green-500" size={20} />} 
            color="green"
            href="/admin/specialists"
          />
          <StatCard 
            title="Услуги" 
            value={stats.services} 
            icon={<FaCalendarAlt className="text-purple-500" size={20} />} 
            color="purple"
            href="/admin/services"
          />
          <StatCard 
            title="Статьи" 
            value={stats.articles} 
            icon={<FaNewspaper className="text-amber-500" size={20} />} 
            color="amber"
            href="/admin/articles"
          />
          <StatCard 
            title="Записи" 
            value={stats.appointments} 
            icon={<FaChartLine className="text-rose-500" size={20} />} 
            color="rose"
            href="/admin/appointments"
          />
          <StatCard 
            title="Отзывы" 
            value={stats.reviews} 
            icon={<FaComments className="text-indigo-500" size={20} />} 
            color="indigo"
            href="/admin/reviews"
          />
        </div>
      </div>

      {/* Блоки управления */}
      <div className="mb-8 md:mb-12">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Управление контентом</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <AdminCard
            title="Пользователи"
            description="Просмотр и управление учетными записями пользователей сайта"
            icon={<FaUsers size={24} />}
            href="/admin/users"
          />
          <AdminCard
            title="Специалисты"
            description="Добавление и редактирование карточек специалистов центра"
            icon={<FaBookMedical size={24} />}
            href="/admin/specialists"
          />
          <AdminCard
            title="Услуги"
            description="Управление услугами, настройка цен, категорий и параметров"
            icon={<FaCalendarAlt size={24} />}
            href="/admin/services"
          />
          <AdminCard
            title="Статьи"
            description="Создание и редактирование статей и материалов блога"
            icon={<FaNewspaper size={24} />}
            href="/admin/articles"
          />
          <AdminCard
            title="Записи"
            description="Просмотр и управление записями на услуги и консультации"
            icon={<FaChartLine size={24} />}
            href="/admin/appointments"
          />
          <AdminCard
            title="Отзывы"
            description="Просмотр и модерация отзывов посетителей сайта"
            icon={<FaComments size={24} />}
            href="/admin/reviews"
          />
          <AdminCard
            title="Статистика и аналитика"
            description="Подробная статистика по посещаемости и активности"
            icon={<FaChartLine size={24} />}
            href="/admin/stats"
          />
          <AdminCard
            title="Настройки"
            description="Общие настройки сайта, SEO, оптимизация и уведомления"
            icon={<FaCog size={24} />}
            href="/admin/settings"
          />
          <AdminCard
            title="Магазин"
            description="Настройка отображения кнопки магазина на главной странице"
            icon={<FaStore size={24} />}
            href="/admin/shop"
          />
          <AdminCard
            title="База данных"
            description="Миграция данных, резервное копирование и управление БД"
            icon={<FaDatabase size={24} />}
            href="/admin/database"
          />
          <Link href="/cabinet" className="flex items-center justify-center">
            <div className="w-full h-full min-h-[120px] rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-center">
              <span className="text-[#48a9a6] font-medium">Вернуться в личный кабинет</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Компонент карточки статистики
function StatCard({ title, value, icon, color, href }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    amber: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    rose: 'bg-rose-50 border-rose-200 hover:bg-rose-100',
    indigo: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
  };

  return (
    <Link href={href} className={`block rounded-xl ${colorClasses[color]} p-3 md:p-4 border transition-all transform hover:shadow-md hover:-translate-y-1 text-center`}>
      <div className="flex flex-col items-center justify-center">
        <div className="mb-1 md:mb-2">{icon}</div>
        <div className="text-xl md:text-2xl font-bold text-gray-800">{value}</div>
        <div className="text-xs md:text-sm text-gray-600">{title}</div>
      </div>
    </Link>
  );
}

// Компонент карточки для админ-функций
function AdminCard({ title, description, icon, href }: AdminCardProps) {
  return (
    <Link href={href}>
      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 hover:shadow-md transition-shadow h-full">
        <div className="flex items-center mb-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#48a9a6]/10 flex items-center justify-center text-[#48a9a6]">
            {icon}
          </div>
          <h3 className="ml-3 font-semibold text-gray-800">{title}</h3>
        </div>
        <p className="text-xs md:text-sm text-gray-600">{description}</p>
      </div>
    </Link>
  );
} 