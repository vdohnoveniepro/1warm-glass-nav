'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  FaUsers, FaComments, FaChartLine, FaNewspaper, 
  FaCalendarAlt, FaEye, FaUserPlus, FaStar, FaChevronLeft
} from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type AnalyticsData = {
  period: string;
  visitStats: Array<{
    date: string;
    total_visits: number;
    total_unique_visitors: number;
  }>;
  topPages: Array<{
    page: string;
    total_visits: number;
  }>;
  newUsers: Array<{
    date: string;
    count: number;
  }>;
  newReviews: Array<{
    date: string;
    count: number;
  }>;
  newComments: Array<{
    date: string;
    count: number;
  }>;
  topArticles: Array<{
    id: string;
    title: string;
    views: number;
  }>;
  topSpecialists: Array<{
    id: string;
    firstName: string;
    lastName: string;
    views: number;
  }>;
  appointments: Array<{
    date: string;
    count: number;
  }>;
};

export default function StatsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('week');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Защита маршрута: только для админов
  useEffect(() => {
    if (!isLoading && user) {
      if (user.email !== 'bakeevd@yandex.ru' && user.role?.toUpperCase() !== 'ADMIN') {
        toast.error('У вас нет прав для доступа к этой странице');
        router.replace('/');
      }
    } else if (!isLoading && !user) {
      toast.error('Необходимо авторизоваться');
      router.replace('/login');
    }
  }, [user, isLoading, router]);
  
  // Автоматическая миграция базы данных при первой загрузке
  useEffect(() => {
    const runMigration = async () => {
      try {
        const response = await fetch('/api/admin/migrate', {
          method: 'POST',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('Миграция базы данных успешно выполнена');
          } else {
            console.error('Ошибка миграции:', data.error);
          }
        }
      } catch (error) {
        console.error('Ошибка при миграции:', error);
      }
    };
    
    if (user && (user.role?.toUpperCase() === 'ADMIN' || user.email === 'bakeevd@yandex.ru')) {
      runMigration();
    }
  }, [user]);
  
  // Загрузка данных аналитики
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoadingData(true);
      try {
        const response = await fetch(`/api/admin/stats/analytics?period=${period}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAnalytics(data.data);
          } else {
            toast.error(`Ошибка: ${data.error || 'Не удалось загрузить данные'}`);
          }
        } else {
          toast.error('Ошибка при загрузке данных аналитики');
        }
      } catch (error) {
        console.error('Ошибка при загрузке аналитики:', error);
        toast.error('Произошла ошибка при загрузке данных');
      } finally {
        setIsLoadingData(false);
      }
    };
    
    if (user && (user.role?.toUpperCase() === 'ADMIN' || user.email === 'bakeevd@yandex.ru')) {
      fetchAnalytics();
    }
  }, [period, user]);
  
  // Подготовка данных для графиков
  const visitsChartData = {
    labels: analytics?.visitStats.map(item => item.date) || [],
    datasets: [
      {
        label: 'Всего посещений',
        data: analytics?.visitStats.map(item => item.total_visits) || [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Уникальные посетители',
        data: analytics?.visitStats.map(item => item.total_unique_visitors) || [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };
  
  const newUsersChartData = {
    labels: analytics?.newUsers.map(item => item.date) || [],
    datasets: [
      {
        label: 'Новые пользователи',
        data: analytics?.newUsers.map(item => item.count) || [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };
  
  const newContentChartData = {
    labels: analytics?.newReviews.map(item => item.date) || [],
    datasets: [
      {
        label: 'Новые отзывы',
        data: analytics?.newReviews.map(item => item.count) || [],
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      },
      {
        label: 'Новые комментарии',
        data: analytics?.newComments.map(item => item.count) || [],
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
      },
    ],
  };
  
  const appointmentsChartData = {
    labels: analytics?.appointments.map(item => item.date) || [],
    datasets: [
      {
        label: 'Новые записи',
        data: analytics?.appointments.map(item => item.count) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  };
  
  const topPagesChartData = {
    labels: analytics?.topPages.map(item => {
      // Сокращаем URL для лучшего отображения
      const page = item.page;
      return page.length > 30 ? page.substring(0, 27) + '...' : page;
    }) || [],
    datasets: [
      {
        label: 'Посещения',
        data: analytics?.topPages.map(item => item.total_visits) || [],
        backgroundColor: 'rgba(255, 206, 86, 0.6)',
      },
    ],
  };
  
  // Опции для графиков
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };
  
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Кнопка возврата */}
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <FaChevronLeft className="mr-2" />
          <span>Вернуться в панель управления</span>
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Статистика и аналитика</h1>
      
      {/* Переключатель периода */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setPeriod('week')}
          className={`px-4 py-2 rounded-md ${
            period === 'week'
              ? 'bg-[#48a9a6] text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          Неделя
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`px-4 py-2 rounded-md ${
            period === 'month'
              ? 'bg-[#48a9a6] text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          Месяц
        </button>
        <button
          onClick={() => setPeriod('year')}
          className={`px-4 py-2 rounded-md ${
            period === 'year'
              ? 'bg-[#48a9a6] text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          Год
        </button>
        <button
          onClick={() => setPeriod('all')}
          className={`px-4 py-2 rounded-md ${
            period === 'all'
              ? 'bg-[#48a9a6] text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          Все время
        </button>
      </div>
      
      {isLoadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* График посещений */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaEye className="mr-2 text-blue-500" /> Посещения сайта
            </h2>
            <div className="h-80">
              <Line options={chartOptions} data={visitsChartData} />
            </div>
          </div>
          
          {/* График новых пользователей */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaUserPlus className="mr-2 text-green-500" /> Новые пользователи
            </h2>
            <div className="h-80">
              <Bar options={chartOptions} data={newUsersChartData} />
            </div>
          </div>
          
          {/* График отзывов и комментариев */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaComments className="mr-2 text-purple-500" /> Отзывы и комментарии
            </h2>
            <div className="h-80">
              <Bar options={chartOptions} data={newContentChartData} />
            </div>
          </div>
          
          {/* График записей на услуги */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaCalendarAlt className="mr-2 text-rose-500" /> Записи на услуги
            </h2>
            <div className="h-80">
              <Bar options={chartOptions} data={appointmentsChartData} />
            </div>
          </div>
          
          {/* Топ страниц */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaChartLine className="mr-2 text-amber-500" /> Популярные страницы
            </h2>
            <div className="h-80">
              <Bar options={chartOptions} data={topPagesChartData} />
            </div>
          </div>
          
          {/* Топ статей */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaNewspaper className="mr-2 text-indigo-500" /> Популярные статьи
            </h2>
            <div className="overflow-auto max-h-80">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Название</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Просмотры</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.topArticles.map((article) => (
                    <tr key={article.id} className="border-t">
                      <td className="px-4 py-3 text-sm text-gray-800">{article.title}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{article.views}</td>
                    </tr>
                  ))}
                  {(!analytics?.topArticles || analytics.topArticles.length === 0) && (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-center text-sm text-gray-500">
                        Нет данных
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Топ специалистов */}
          <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaStar className="mr-2 text-yellow-500" /> Популярные специалисты
            </h2>
            <div className="overflow-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Специалист</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Просмотры профиля</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.topSpecialists.map((specialist) => (
                    <tr key={specialist.id} className="border-t">
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specialist.firstName} {specialist.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{specialist.views}</td>
                    </tr>
                  ))}
                  {(!analytics?.topSpecialists || analytics.topSpecialists.length === 0) && (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-center text-sm text-gray-500">
                        Нет данных
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 