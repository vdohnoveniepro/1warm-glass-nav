'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { FaCalendarAlt, FaClock, FaUser, FaTrash, FaCheckCircle, FaTimesCircle, 
  FaRegClock, FaExchangeAlt, FaInfoCircle, FaCalendarCheck, FaArchive, FaHistory, FaArrowLeft } from 'react-icons/fa';
import { AppointmentStatus, AppointmentWithDetails } from '@/models/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getAppointments, cancelAppointment, archiveAppointment, deleteAppointment } from '@/app/api/appointmentsClient';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';

// Компонент для отображения статуса записи
const AppointmentStatusBadge = ({ status }: { status: AppointmentStatus }) => {
  switch (status) {
    case AppointmentStatus.PENDING:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <FaRegClock className="mr-1" />Ожидает подтверждения
      </span>;
    case AppointmentStatus.CONFIRMED:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <FaCheckCircle className="mr-1" />Подтверждена
      </span>;
    case AppointmentStatus.COMPLETED:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <FaCheckCircle className="mr-1" />Завершена
      </span>;
    case AppointmentStatus.CANCELLED:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <FaTimesCircle className="mr-1" />Отменена
      </span>;
    case AppointmentStatus.ARCHIVED:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <FaArchive className="mr-1" />В архиве
      </span>;
    default:
      return null;
  }
};

// Компонент карточки записи
const AppointmentCard = ({ 
  appointment, 
  onCancel, 
  onArchive 
}: { 
  appointment: AppointmentWithDetails, 
  onCancel: (id: string) => void, 
  onArchive?: (id: string) => void 
}) => {
  // Функция для форматирования даты в удобочитаемый формат
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  // Функция для форматирования цены
  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '0 ₽';
    
    // Если есть информация о бонусах или скидке, показываем финальную цену
    const originalPrice = appointment.originalPrice || price;
    const bonusAmount = appointment.bonusAmount || 0;
    const discountAmount = appointment.discountAmount || 0;
    const totalDiscount = bonusAmount + discountAmount;
    
    if (totalDiscount > 0) {
      const finalPrice = originalPrice - totalDiscount;
      return (
        <div>
          <div className="line-through text-gray-500 text-sm">{originalPrice.toLocaleString('ru-RU')} ₽</div>
          <div>{finalPrice.toLocaleString('ru-RU')} ₽</div>
        </div>
      );
    }
    
    return price.toLocaleString('ru-RU') + ' ₽';
  };
  
  // Вычисление продолжительности услуги
  const calculateDuration = () => {
    try {
      return new Date(`2000-01-01T${appointment.endTime}:00`) > new Date(`2000-01-01T${appointment.startTime}:00`) 
        ? Math.round((new Date(`2000-01-01T${appointment.endTime}:00`).getTime() - new Date(`2000-01-01T${appointment.startTime}:00`).getTime()) / 60000)
        : (appointment.service?.duration || 0);
    } catch (error) {
      console.error('Ошибка при расчете продолжительности услуги:', error);
      return appointment.service?.duration || 0;
    }
  };
  
  // Проверяем, является ли запись предстоящей
  const isUpcoming = () => {
    try {
      const appointmentDate = new Date(`${appointment.date}T${appointment.startTime}`);
      const now = new Date();
      return appointmentDate > now;
    } catch (error) {
      console.error('Ошибка при проверке предстоящей записи:', error);
      return false;
    }
  };

  // Получение данных услуги с проверкой
  const getServiceName = () => {
    if (appointment.service?.name) {
      return appointment.service.name;
    }
    return "Неизвестная услуга";
  };
  
  // Получение данных специалиста с проверкой
  const getSpecialistName = () => {
    const firstName = appointment.specialist?.firstName || "Специалист";
    const lastName = appointment.specialist?.lastName || "";
    return `${firstName} ${lastName}`;
  };
  
  // Проверка наличия фото специалиста
  const hasSpecialistPhoto = () => {
    return !!(appointment.specialist?.photo && appointment.specialist.photo.length > 0);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg text-gray-800 mb-1">
              {getServiceName()}
            </h3>
            <div className="mb-2">
              <AppointmentStatusBadge status={appointment.status} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#48a9a6]">
              {formatPrice(appointment.price || 0)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex flex-wrap items-center mb-3">
          <div className="flex items-center mb-2 md:mb-0">
            <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0 mr-3 border-2 border-[#48a9a6]/20">
              {hasSpecialistPhoto() ? (
                <Image 
                  src={appointment.specialist?.photo || ''}
                  alt={getSpecialistName()}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#48a9a6]/20 text-[#48a9a6]">
                  <FaUser size={20} />
                </div>
              )}
            </div>
            <div>
              <div className="font-medium">
                {getSpecialistName()}
              </div>
              {appointment.specialistId && (
                <Link href={`/specialists/${appointment.specialistId}`} className="text-sm text-[#48a9a6] hover:underline inline-flex items-center">
                  <FaInfoCircle className="mr-1" size={12} />
                  Профиль специалиста
                </Link>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm mb-3">
          <div className="flex items-center text-gray-700">
            <FaCalendarAlt className="text-[#48a9a6] mr-2 flex-shrink-0" />
            <span>{formatDate(appointment.date)}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <FaClock className="text-[#48a9a6] mr-2 flex-shrink-0" />
            <span>{appointment.startTime} - {appointment.endTime}</span>
          </div>
        </div>
        
        {/* Детали услуги */}
        <div className="p-3 bg-gray-50 rounded-md mb-3 text-sm">
          <div className="grid grid-cols-1 gap-y-2">
            <div className="flex items-start">
              <FaInfoCircle className="text-[#48a9a6] mr-2 mt-1 flex-shrink-0" />
              <div>
                <div className="font-medium">{getServiceName()}</div>
                <div className="text-gray-600">Продолжительность: {calculateDuration()} мин.</div>
              </div>
            </div>
            <div className="flex items-center">
              <FaCalendarCheck className="text-[#48a9a6] mr-2 flex-shrink-0" />
              <span>Создано: {appointment.createdAt ? new Date(appointment.createdAt).toLocaleDateString('ru-RU') : 'Нет данных'}</span>
            </div>
          </div>
        </div>
        
        {/* Кнопки действий */}
        {appointment.status !== AppointmentStatus.CANCELLED && 
         appointment.status !== AppointmentStatus.COMPLETED && 
         appointment.status !== AppointmentStatus.ARCHIVED && (
          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            {isUpcoming() && appointment.status === AppointmentStatus.CONFIRMED && (
              <Link href={`/cabinet/appointments/reschedule/${appointment.id}`}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center"
              >
                <FaCalendarAlt className="mr-1" />
                <span>Перенести дату</span>
              </Link>
            )}
            <button 
              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
              onClick={() => onCancel(appointment.id)}
            >
              <FaTrash className="mr-1" />
              <span>Отменить</span>
            </button>
          </div>
        )}
        
        {/* Кнопка удаления из архива */}
        {appointment.status === AppointmentStatus.ARCHIVED && onArchive && (
          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <button 
              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
              onClick={() => onArchive(appointment.id)}
            >
              <FaTrash className="mr-1" />
              <span>Удалить из архива</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент с использованием useSearchParams
function SearchParamsWrapper({ children }: { children: (statusFilter: string, tabFilter: string | null) => React.ReactNode }) {
  const searchParams = useSearchParamsWrapper();
  const statusFilter = searchParams.get('status') || 'all';
  const tabFilter = searchParams.get('tab');
  
  return <>{children(statusFilter, tabFilter)}</>;
}

const AppointmentsClientContent = () => {
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('upcoming');
  const [error, setError] = useState<string | null>(null);
  
  // Инициализация данных при загрузке компонента
  useEffect(() => {
    if (!isLoading && user) {
      initializeData();
    } else if (!isLoading && !user) {
      setError('Для просмотра записей необходимо авторизоваться');
      setLoading(false);
    }
  }, [isLoading, user]);
  
  // Функция для инициализации данных
  const initializeData = async () => {
    try {
      setLoading(true);
      
      // Параллельно загружаем все необходимые данные
      const [servicesData, specialistsData, appointmentsData] = await Promise.all([
        fetchServices(),
        fetchSpecialists(),
        fetchAppointments()
      ]);
      
      setServices(servicesData);
      setSpecialists(specialistsData);
      
      // Обогащаем данные записей информацией о специалистах и услугах
      const enrichedAppointments = enrichAppointmentsData(appointmentsData, servicesData, specialistsData);
      setAppointments(enrichedAppointments);
      
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setError('Произошла ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };
  
  // Получение списка услуг
  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Ошибка при загрузке услуг:', error);
      return [];
    }
  };
  
  // Получение списка специалистов
  const fetchSpecialists = async () => {
    try {
      const response = await fetch('/api/specialists');
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Ошибка при загрузке специалистов:', error);
      return [];
    }
  };
  
  // Получение списка записей пользователя
  const fetchAppointments = async () => {
    try {
      if (!user) return [];
      
      const appointments = await getAppointments();
      return appointments;
    } catch (error) {
      console.error('Ошибка при загрузке записей:', error);
      throw error;
    }
  };
  
  // Обогащение данных записей информацией о специалистах и услугах
  const enrichAppointmentsData = (appointments: any, services: any[], specialists: any[]) => {
    return appointments.map((appointment: any) => {
      const service = services.find(s => s.id === appointment.serviceId);
      const specialist = specialists.find(s => s.id === appointment.specialistId);
      
      return {
        ...appointment,
        service: service || null,
        specialist: specialist || null
      };
    });
  };
  
  // Обработчик отмены записи
  const handleCancelAppointment = async (id: string) => {
    try {
      if (window.confirm('Вы действительно хотите отменить эту запись?')) {
        await cancelAppointment(id);
        toast.success('Запись успешно отменена');
        
        // Обновляем список записей
        const updatedAppointments = appointments.map(appointment => {
          if (appointment.id === id) {
            return { ...appointment, status: AppointmentStatus.CANCELLED };
          }
          return appointment;
        });
        
        setAppointments(updatedAppointments);
      }
    } catch (error) {
      toast.error('Ошибка при отмене записи');
      console.error('Ошибка при отмене записи:', error);
    }
  };
  
  // Обработчик удаления записи из архива
  const handleDeleteAppointment = async (id: string) => {
    try {
      if (window.confirm('Вы действительно хотите удалить эту запись из архива?')) {
        await deleteAppointment(id);
        toast.success('Запись успешно удалена из архива');
        
        // Удаляем запись из списка
        const updatedAppointments = appointments.filter(appointment => appointment.id !== id);
        setAppointments(updatedAppointments);
      }
    } catch (error) {
      toast.error('Ошибка при удалении записи');
      console.error('Ошибка при удалении записи:', error);
    }
  };
  
  // Фильтрация записей в зависимости от активной вкладки
  const filterAppointments = () => {
    const now = new Date();
    
    switch (activeTab) {
      case 'upcoming':
        return appointments.filter(appointment => {
          try {
            const appointmentDate = new Date(`${appointment.date}T${appointment.endTime}`);
            return (
              appointmentDate > now &&
              appointment.status !== AppointmentStatus.CANCELLED &&
              appointment.status !== AppointmentStatus.ARCHIVED
            );
          } catch (error) {
            console.error('Ошибка при фильтрации предстоящих записей:', error);
            return false;
          }
        }).sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateA.getTime() - dateB.getTime();
        });
        
      case 'past':
        return appointments.filter(appointment => {
          try {
            const appointmentDate = new Date(`${appointment.date}T${appointment.endTime}`);
            return (
              appointmentDate <= now &&
              appointment.status !== AppointmentStatus.CANCELLED &&
              appointment.status !== AppointmentStatus.ARCHIVED
            );
          } catch (error) {
            console.error('Ошибка при фильтрации прошедших записей:', error);
            return false;
          }
        }).sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateB.getTime() - dateA.getTime(); // Сортировка в обратном порядке для прошедших записей
        });
        
      case 'cancelled':
        return appointments.filter(appointment => 
          appointment.status === AppointmentStatus.CANCELLED
        ).sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateB.getTime() - dateA.getTime();
        });
        
      case 'archived':
        return appointments.filter(appointment => 
          appointment.status === AppointmentStatus.ARCHIVED
        ).sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateB.getTime() - dateA.getTime();
        });
        
      default:
        return [];
    }
  };
  
  // Форматирование текущей даты для отображения
  const formatCurrentDate = () => {
    const date = new Date();
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  // Если пользователь не авторизован, показываем сообщение об ошибке
  if (!isLoading && !user) {
    return (
      <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
        <p className="font-medium">Доступ запрещен</p>
        <p>Для просмотра записей необходимо <Link href="/login" className="underline">войти в аккаунт</Link>.</p>
      </div>
    );
  }
  
  // Если данные загружаются, показываем индикатор загрузки
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Загрузка записей...</p>
        </div>
      </div>
    );
  }
  
  // Если произошла ошибка, показываем сообщение об ошибке
  if (error) {
    return (
      <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
        <p className="font-medium">Ошибка</p>
        <p>{error}</p>
      </div>
    );
  }
  
  const filteredAppointments = filterAppointments();
  
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center mb-4">
            <Link href="/cabinet" className="flex items-center text-[#48a9a6] mb-2 sm:mb-0 sm:mr-4 hover:text-[#357d7a] transition-colors">
              <FaArrowLeft className="mr-2" /> Назад
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 sm:mb-0">Мои записи</h1>
          </div>
          <p className="text-gray-600">Сегодня: {formatCurrentDate()}</p>
        </div>

        {/* Вкладки для переключения между разными типами записей */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap -mb-px">
            <button 
              className={`mr-2 py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'upcoming' 
                ? 'border-[#48a9a6] text-[#48a9a6]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Предстоящие
            </button>
            <button 
              className={`mr-2 py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'past' 
                ? 'border-[#48a9a6] text-[#48a9a6]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('past')}
            >
              Прошедшие
            </button>
            <button 
              className={`mr-2 py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'cancelled' 
                ? 'border-[#48a9a6] text-[#48a9a6]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('cancelled')}
            >
              Отмененные
            </button>
            <button 
              className={`mr-2 py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'archived' 
                ? 'border-[#48a9a6] text-[#48a9a6]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('archived')}
            >
              Архив
            </button>
          </div>
        </div>
        
        {/* Список записей */}
        <div>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <FaCalendarAlt className="mx-auto text-gray-400 text-4xl mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Записи не найдены</h3>
              <p className="text-gray-500 mb-4">
                {activeTab === 'upcoming' && 'У вас нет предстоящих записей.'}
                {activeTab === 'past' && 'У вас нет прошедших записей.'}
                {activeTab === 'cancelled' && 'У вас нет отмененных записей.'}
                {activeTab === 'archived' && 'У вас нет архивных записей.'}
              </p>
              {activeTab === 'upcoming' && (
                <Link href="/specialists" className="inline-flex items-center px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#357d7a] transition-colors">
                  <FaCalendarAlt className="mr-2" />
                  Записаться на прием
                </Link>
              )}
            </div>
          ) : (
            <div>
              {filteredAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment} 
                  onCancel={handleCancelAppointment}
                  onArchive={activeTab === 'archived' ? handleDeleteAppointment : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AppointmentsClient = () => {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Загрузка записей...</p>
        </div>
      </div>
    }>
      <SearchParamsWrapper>
        {(statusFilter, tabFilter) => <AppointmentsClientContent />}
      </SearchParamsWrapper>
    </Suspense>
  );
};

export default AppointmentsClient; 