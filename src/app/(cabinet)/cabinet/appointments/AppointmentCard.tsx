import React, { FC, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaCalendarAlt, FaClock, FaUser, FaTrash, FaCheckCircle, FaTimesCircle, 
  FaRegClock, FaExchangeAlt, FaInfoCircle, FaCalendarCheck } from 'react-icons/fa';
import { AppointmentStatus, AppointmentWithDetails } from '@/models/types';
import { cancelAppointment } from '@/app/api/appointmentsClient';

// Расширение типа для поддержки разных форматов данных
interface ExtendedAppointment extends AppointmentWithDetails {
  specialist?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    photo?: string;
  };
  service?: {
    id?: string;
    name?: string;
    price?: number;
    duration?: number;
  };
  timeStart?: string;
  timeEnd?: string;
  createdAt?: string;
  originalPrice?: number;
  bonusAmount?: number;
  discountAmount?: number;
}

interface AppointmentCardProps {
  appointment: ExtendedAppointment;
  onCancel: (id: string) => void;
  onArchive?: (id: string) => void;
}

// Вспомогательная функция для форматирования даты
const formatDateFull = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Получение цвета для статуса
const getStatusColor = (status: AppointmentStatus) => {
  switch (status) {
    case AppointmentStatus.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case AppointmentStatus.CONFIRMED:
      return 'bg-green-100 text-green-800';
    case AppointmentStatus.CANCELLED:
      return 'bg-red-100 text-red-800';
    case AppointmentStatus.COMPLETED:
      return 'bg-blue-100 text-blue-800';
    case AppointmentStatus.ARCHIVED:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Компонент для отображения статуса записи
const AppointmentStatusBadge: FC<{ status: AppointmentStatus }> = ({ status }) => {
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
        <FaTimesCircle className="mr-1" />Отменена
      </span>;
    default:
      return null;
  }
};

// Компонент обратного отсчета времени
const CountdownTimer: FC<{ date: string; startTime: string }> = ({ date, startTime }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const appointmentDate = new Date(`${date}T${startTime}`);
      const now = new Date();
      const difference = appointmentDate.getTime() - now.getTime();
      
      if (difference <= 0) {
        return "Время записи наступило";
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        return `До записи: ${days} д. ${hours} ч.`;
      } else if (hours > 0) {
        return `До записи: ${hours} ч. ${minutes} мин.`;
      } else {
        return `До записи: ${minutes} мин.`;
      }
    };
    
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Обновляем каждую минуту
    
    return () => clearInterval(timer);
  }, [date, startTime]);
  
  return (
    <div className="inline-flex items-center bg-blue-50 px-2 py-1 rounded-md text-blue-700 text-sm">
      <FaRegClock className="mr-1" />
      {timeLeft}
    </div>
  );
};

const AppointmentCard: FC<AppointmentCardProps> = ({ appointment, onCancel, onArchive }) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // Функция для форматирования даты в удобочитаемый формат
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    // Сегодня и завтра выделяем отдельно
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) {
      return 'Сегодня';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Завтра';
    }
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  // Функция для определения, является ли дата прошедшей
  const isPastDate = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    return date < today;
  };
  
  // Функция для форматирования цены
  const formatPrice = (price: number) => {
    if (!price) return "Бесплатно";
    
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
  
  // Дополнительные классы для карточки в зависимости от статуса
  const getCardClasses = () => {
    let classes = "bg-white rounded-lg shadow-md overflow-hidden mb-4 border-l-4 ";
    
    if (appointment.status === AppointmentStatus.CONFIRMED) {
      classes += "border-green-500 ";
    } else if (appointment.status === AppointmentStatus.PENDING) {
      classes += "border-yellow-500 ";
    } else if (appointment.status === AppointmentStatus.COMPLETED) {
      classes += "border-blue-500 ";
    } else if (appointment.status === AppointmentStatus.CANCELLED || 
               appointment.status === AppointmentStatus.ARCHIVED) {
      classes += "border-red-500 ";
    } else {
      classes += "border-gray-300 ";
    }
    
    return classes;
  };
  
  // Получаем время для отображения
  const startTime = appointment.startTime || appointment.timeStart || "";
  const endTime = appointment.endTime || appointment.timeEnd || "";
  
  return (
    <div className={getCardClasses()}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg text-gray-800 mb-1 line-clamp-1">
              {getServiceName()}
            </h3>
            <div className="mb-1">
              <AppointmentStatusBadge status={appointment.status} />
            </div>
            <div className="text-sm text-gray-500">
              Номер записи: #{appointment.id.substring(0, 8)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#48a9a6]">
              {formatPrice(appointment.price)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center mb-4">
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
            <div className="font-medium line-clamp-1">
              {getSpecialistName()}
              </div>
            {appointment.specialistId && (
              <Link href={`/specialists/${appointment.specialistId}`} className="text-sm text-[#48a9a6] hover:underline inline-flex items-center">
                <FaInfoCircle className="mr-1" size={12} />
                Профиль специалиста
              </Link>
            )}
          </div>
          
          {isUpcoming() && appointment.status === AppointmentStatus.CONFIRMED && (
            <div className="ml-auto">
              <CountdownTimer date={appointment.date} startTime={startTime} />
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm mb-4">
          <div className="flex items-center text-gray-700">
            <FaCalendarAlt className="text-[#48a9a6] mr-2 flex-shrink-0" />
            <span className={isPastDate(appointment.date) ? "text-gray-500" : "font-medium"}>
              {formatDate(appointment.date)}
            </span>
          </div>
          <div className="flex items-center text-gray-700">
            <FaClock className="text-[#48a9a6] mr-2 flex-shrink-0" />
            <span>{startTime} - {endTime}</span>
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
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center text-sm"
              >
                <FaCalendarAlt className="mr-1" />
                <span>Перенести</span>
              </Link>
            )}
            <button
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center text-sm"
              onClick={() => setShowCancelConfirm(true)}
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
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center text-sm"
              onClick={() => onArchive(appointment.id)}
            >
              <FaTrash className="mr-1" />
              <span>Удалить</span>
            </button>
          </div>
        )}
      
      {/* Модальное окно подтверждения отмены */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-3">Подтверждение отмены</h3>
            <p className="text-gray-600 mb-4">
                Вы уверены, что хотите отменить запись на {formatDate(appointment.date)}, {startTime} - {endTime}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => setShowCancelConfirm(false)}
              >
                Отмена
              </button>
              <button
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  onClick={() => {
                    onCancel(appointment.id);
                    setShowCancelConfirm(false);
                  }}
                >
                  Подтвердить отмену
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AppointmentCard; 