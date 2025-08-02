'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/Toast';
import Image from 'next/image';
import { FaCalendarAlt, FaClock, FaRandom, FaRegClock, FaUser, FaEnvelope, FaPhone, FaLock, FaRubleSign, FaChevronLeft, FaChevronRight, FaArrowLeft, FaCheckCircle, FaGoogle, FaApple, FaTimes, FaCalendarTimes } from 'react-icons/fa';
import { Specialist, Service, AppointmentStatus, TimeSlot } from '@/models/types';
import { useRouter } from 'next/navigation';
import FixedDatePicker from './FixedDatePicker';
import { signIn } from 'next-auth/react';

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

interface SpecialistBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  specialistId: string;
}

const SpecialistBookingModal = ({ isOpen, onClose, specialistId }: SpecialistBookingModalProps) => {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  
  // Состояния для данных специалиста и услуг
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для анимации всплывающего окна
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Состояния для шагов бронирования
  const [step, setStep] = useState(1); // 1-выбор услуги, 2-выбор даты, 3-выбор времени, 4-ввод данных
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isChangingStep, setIsChangingStep] = useState(false);
  
  // Состояния для авторизации
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Состояния для бронирования
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  
  // Данные формы для неавторизованных пользователей
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Состояния для промокода
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeStatus, setPromoCodeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [promoCodeMessage, setPromoCodeMessage] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
  } | null>(null);
  
  // Состояния для успешного бронирования
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  
  // Добавляем состояние для хранения причины недоступности
  const [noSlotsReason, setNoSlotsReason] = useState<{
    status: string;
    reason: string;
    message: string;
  } | null>(null);
  
  // Обрабатываем открытие и закрытие модального окна с анимацией
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      
      // Сбрасываем состояние при повторном открытии окна
      if (!isBookingSuccess) {
        setStep(1);
        setSelectedService(null);
        setSelectedDate(null);
        setSelectedTimeSlot(null);
      }
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, isBookingSuccess]);
  
  // Загрузка данных пользователя, если он авторизован
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);
  
  // Шаг 1: Загружаем специалиста и его услуги
  useEffect(() => {
    const fetchSpecialistAndServices = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Загружаем информацию о специалисте
        const specialistResponse = await fetch(`/api/specialists/${specialistId}`);
        if (!specialistResponse.ok) {
          throw new Error('Не удалось загрузить информацию о специалисте');
        }
        
        const specialistData = await specialistResponse.json();
        // Проверяем структуру ответа API
        const specialistInfo = specialistData.data || specialistData;
        console.log('Получены данные специалиста:', specialistInfo);
        
        // Добавляем параметр времени к фото для предотвращения кеширования
        if (specialistInfo && specialistInfo.photo) {
          const photoPath = specialistInfo.photo.startsWith('/') ? specialistInfo.photo.substring(1) : specialistInfo.photo;
          specialistInfo.photoUrl = `/api/images?path=${encodeURIComponent(photoPath)}&t=${Date.now()}`;
        }
        
        setSpecialist(specialistInfo);
        
        // Загружаем все услуги
        const servicesResponse = await fetch('/api/services');
        if (!servicesResponse.ok) {
          throw new Error('Не удалось загрузить услуги');
        }
        
        const servicesData = await servicesResponse.json();
        console.log('Получен список услуг:', servicesData);
        
        // Фильтруем услуги специалиста
        let filteredServices: Service[] = [];
        if (specialistInfo && specialistInfo.services) {
          const specialistServiceIds = specialistInfo.services.map((s: { id: string }) => s.id);
          console.log('ID услуг специалиста:', specialistServiceIds);
          
          filteredServices = servicesData.filter(
            (service: Service) => specialistServiceIds.includes(service.id)
          );
        }
        
        console.log('Отфильтрованные услуги специалиста:', filteredServices);
        setServices(filteredServices);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError(error instanceof Error ? error.message : 'Произошла ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSpecialistAndServices();
  }, [specialistId, isOpen]);
  
  // Загрузка доступных дат при выборе услуги
  useEffect(() => {
    if (!specialist || !selectedService) return;
    
    const fetchAvailableDates = async () => {
      setIsLoadingDates(true);
      
      try {
        // Получаем первый и последний день месяца для запроса доступных дат
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Получаем настройки расписания специалиста, чтобы узнать период бронирования
        let bookingPeriodMonths = 3; // По умолчанию 3 месяца
        
        try {
          const scheduleResponse = await fetch(`/api/specialists/${specialist.id}/schedule`);
          if (scheduleResponse.ok) {
            const scheduleData = await scheduleResponse.json();
            if (scheduleData.success && scheduleData.data && scheduleData.data.bookingPeriodMonths) {
              bookingPeriodMonths = scheduleData.data.bookingPeriodMonths;
              console.log(`[SpecialistBookingModal] Получен период бронирования: ${bookingPeriodMonths} месяцев`);
            }
          }
        } catch (error) {
          console.error('[SpecialistBookingModal] Ошибка при получении настроек расписания:', error);
          // Используем значение по умолчанию
        }
        
        // Вычисляем конечную дату на основе периода бронирования
        const endDate = new Date(today.getFullYear(), today.getMonth() + bookingPeriodMonths, 0);
        
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        console.log('[SpecialistBookingModal] Запрос доступных дат:', {
          specialistId: specialist.id,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          bookingPeriodMonths
        });
        
        // Запрос к API
        const response = await fetch(
          `/api/specialists/${specialist.id}/available-dates?startDate=${formattedStartDate}&endDate=${formattedEndDate}${selectedService.id ? `&serviceId=${selectedService.id}` : ''}`
        );
        
        const data = await response.json();
        
        if (data.success) {
          console.log(`[SpecialistBookingModal] Получено ${data.data.length} доступных дат:`, data.data);
          setAvailableDates(data.data);
        } else {
          console.error('[SpecialistBookingModal] Ошибка при получении доступных дат:', data.error);
          setAvailableDates([]);
        }
      } catch (error) {
        console.error('[SpecialistBookingModal] Ошибка при загрузке доступных дат:', error);
        setAvailableDates([]);
      } finally {
        setIsLoadingDates(false);
      }
    };
    
    fetchAvailableDates();
  }, [specialist, selectedService]);
  
  // Загрузка доступных временных слотов при выборе специалиста и даты
  useEffect(() => {
    if (specialist && selectedService && selectedDate) {
      const fetchTimeSlots = async () => {
        try {
          console.log('[SpecialistBookingModal] Запрос временных слотов:', {
            specialistId: specialist.id,
            date: selectedDate.toISOString().split('T')[0],
            serviceDuration: selectedService.duration
          });

          // Форматируем дату в YYYY-MM-DD
          const formattedDate = selectedDate.toISOString().split('T')[0];
          
          // Запрос к API для получения доступных слотов
          const response = await fetch(
            `/api/timeslots?specialistId=${specialist.id}&date=${formattedDate}&serviceDuration=${selectedService.duration}`
          );
          
          const data = await response.json();
          console.log('[SpecialistBookingModal] Ответ API:', data);
          
          if (!response.ok) {
            throw new Error(data.error || 'Ошибка сервера');
          }
          
          if (data.success) {
            setAvailableTimeSlots(data.data.timeSlots);
            
            // Устанавливаем причину недоступности если нет слотов
            if (data.data.status === 'unavailable') {
              setNoSlotsReason({
                status: data.data.status,
                reason: data.data.reason,
                message: data.data.message
              });
            } else {
              setNoSlotsReason(null);
            }
          } else {
            throw new Error(data.error || 'Не удалось получить доступные временные слоты');
          }
        } catch (error) {
          console.error('[SpecialistBookingModal] Ошибка при загрузке временных слотов:', error);
          toast.error('Не удалось загрузить доступные временные слоты');
          setAvailableTimeSlots([]);
          setNoSlotsReason(null);
        }
      };
      
      fetchTimeSlots();
    } else {
      // Сбрасываем временные слоты при изменении специалиста или даты
      setAvailableTimeSlots([]);
      setSelectedTimeSlot(null);
      setNoSlotsReason(null);
    }
  }, [specialist, selectedService, selectedDate]);
  
  // Переход к следующему шагу
  const nextStep = () => {
    setDirection('forward');
    setIsChangingStep(true);
    
    setTimeout(() => {
      setStep(prev => prev + 1);
      setIsChangingStep(false);
    }, 300);
  };
  
  // Вернуться к предыдущему шагу
  const prevStep = () => {
    setDirection('backward');
    setIsChangingStep(true);
    
    setTimeout(() => {
      setStep(prev => prev - 1);
      setIsChangingStep(false);
    }, 300);
  };
  
  // Функция для выбора услуги и перехода к выбору даты
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    nextStep(); // Переход к шагу 2 - выбор даты
  };
  
  // Функция для выбора даты и перехода к выбору времени
  const selectDate = (date: string | null) => {
    if (date) {
      setSelectedDate(new Date(date));
      nextStep(); // Переход к шагу 3 - выбор времени
    } else {
      setSelectedDate(null);
    }
  };
  
  // Функция для выбора времени и перехода к вводу данных
  const selectTime = (timeSlot: TimeSlot | null) => {
    setSelectedTimeSlot(timeSlot);
    if (timeSlot) {
      nextStep(); // Переход к шагу 4 - ввод данных
    }
  };
  
  // Обработчик для закрытия с анимацией
  const handleClose = () => {
    setIsAnimating(false);
    // Задержка для анимации
    setTimeout(() => {
      onClose();
    }, 300);
  };
  
  // Обработчик авторизации
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoginLoading(true);
      await login(loginEmail, loginPassword);
      setShowLoginForm(false);
      toast.success('Вход выполнен успешно');
    } catch (error) {
      toast.error('Ошибка при входе в систему. Проверьте email и пароль.');
    } finally {
      setLoginLoading(false);
    }
  };
  
  // Функция для проверки и применения промокода
  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeStatus('error');
      setPromoCodeMessage('Введите промокод');
      return;
    }
    
    if (!selectedService) {
      setPromoCodeStatus('error');
      setPromoCodeMessage('Сначала выберите услугу');
      return;
    }
    
    try {
      setPromoCodeStatus('loading');
      setPromoCodeMessage('Проверка промокода...');

      const response = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: promoCode,
          serviceId: selectedService.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Расчет скидки
        let discountAmount = 0;
        
        if (data.data.discountType === 'percentage') {
          discountAmount = (selectedService.price * data.data.discountValue) / 100;
        } else {
          discountAmount = data.data.discountValue;
      }
      
        // Ограничиваем скидку ценой услуги
        discountAmount = Math.min(discountAmount, selectedService.price);
        
        setAppliedPromo({
          ...data.data,
          discountAmount
        });
        
        setPromoCodeStatus('success');
        setPromoCodeMessage(
          data.data.discountType === 'percentage'
            ? `Скидка ${data.data.discountValue}% (${discountAmount} ₽)`
            : `Скидка ${discountAmount} ₽`
        );
      } else {
        setPromoCodeStatus('error');
        setPromoCodeMessage(data.message || 'Промокод недействителен');
        setAppliedPromo(null);
      }
    } catch (error) {
      console.error('Ошибка при проверке промокода:', error);
      setPromoCodeStatus('error');
      setPromoCodeMessage('Ошибка при проверке промокода');
      setAppliedPromo(null);
    }
  };

  // Функция для отмены применения промокода
  const handleCancelPromoCode = () => {
    setPromoCode('');
    setPromoCodeStatus('idle');
    setPromoCodeMessage('');
    setAppliedPromo(null);
  };
  
  // Отправка формы бронирования
  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTimeSlot || !specialist) {
      toast.error('Не все данные выбраны для бронирования');
      return;
    }
    
    try {
      // Получаем ID пользователя, если он авторизован
      const userId = user?.id || null;
      
      // Форматируем дату в строку YYYY-MM-DD
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // Подготовка данных для бронирования
      const appointmentData = {
        specialistId: specialist.id,
        serviceId: selectedService.id,
        userId: userId, // Добавляем ID пользователя, если он авторизован
        date: formattedDate,
        timeStart: selectedTimeSlot.start,
        timeEnd: selectedTimeSlot.end,
        userName: firstName + (lastName ? ' ' + lastName : ''),
        userEmail: email,
        userPhone: phone,
        password: password || null, // Если пользователь не указал пароль
        price: selectedService.price,
        status: 'pending',
        // Добавляем информацию для электронного письма
        specialistName: `${specialist.firstName} ${specialist.lastName}`,
        serviceName: selectedService.name,
        // Добавляем информацию о промокоде, если он применен
        promoCode: appliedPromo ? appliedPromo.code : null
      };
      
      console.log('[SpecialistBookingModal] Отправка данных бронирования:', appointmentData);
      
      // Отправка данных на сервер
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
        // Добавляем credentials для отправки куки с запросом
        credentials: 'include'
      });
      
      // Логируем статус ответа и заголовки
      console.log('[SpecialistBookingModal] Статус ответа API:', response.status, response.statusText);
      console.log('[SpecialistBookingModal] Тип контента:', response.headers.get('content-type'));
      
      // Обработка ошибок сервера
      if (!response.ok) {
        try {
          // Пробуем получить JSON
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('[SpecialistBookingModal] Ошибка API при бронировании (JSON):', errorData);
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
          } else {
            // Если ответ не JSON, пробуем получить текст
            const errorText = await response.text();
            console.error('[SpecialistBookingModal] Ошибка API при бронировании (текст):', errorText || `Ошибка сервера: ${response.status}`);
            throw new Error(errorText || `Ошибка сервера: ${response.status}`);
          }
        } catch (jsonError) {
          console.error('[SpecialistBookingModal] Ошибка при парсинге ответа:', jsonError);
          throw new Error(`Ошибка сервера: ${response.status}. Проверьте консоль для деталей.`);
        }
      }
      
      // Если ответ успешный, продолжаем
      let data;
      try {
        data = await response.json();
        console.log('[SpecialistBookingModal] Ответ API бронирования:', data);
      } catch (jsonError) {
        console.error('[SpecialistBookingModal] Ошибка при парсинге успешного ответа:', jsonError);
        toast.error('Получен некорректный ответ от сервера. Пожалуйста, проверьте, была ли создана запись.');
        onClose(); // Закрываем модальное окно
        return;
      }
      
      if (data.success) {
        const bookedData = {
          ...appointmentData,
          specialist: {
            id: specialist.id,
            firstName: specialist.firstName,
            lastName: specialist.lastName,
            photo: specialist.photo
          },
          // Исправляем названия полей для согласованности
          startTime: appointmentData.timeStart,
          endTime: appointmentData.timeEnd,
          id: data.data.id // Сохраняем ID созданной записи
        };
        setBookingData(bookedData);
        setIsBookingSuccess(true);
        
        // Обновляем данные пользователя, если необходимо
        if (!user && data.data.user) {
          console.log('[SpecialistBookingModal] Новый пользователь создан, перезагрузка страницы');
          // Если новый пользователь был создан, обновляем авторизацию
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        throw new Error(data.error || 'Произошла ошибка при бронировании');
      }
    } catch (error) {
      console.error('[SpecialistBookingModal] Ошибка при бронировании:', error);
      
      // Улучшенная обработка ошибок
      let errorMessage = 'Произошла ошибка при бронировании';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'error' in error) {
        errorMessage = String(error.error);
      }
      
      toast.error(errorMessage);
    }
  };
  
  // Создание URL для добавления события в календарь Google
  const generateGoogleCalendarUrl = () => {
    if (!bookingData) return '';
    
    const { date, startTime, endTime, serviceName, specialist } = bookingData;
    
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);
    
    const formattedStart = startDateTime.toISOString().replace(/-|:|\.\d+/g, '');
    const formattedEnd = endDateTime.toISOString().replace(/-|:|\.\d+/g, '');
    
    const eventTitle = encodeURIComponent(`Запись на услугу: ${serviceName}`);
    const eventDescription = encodeURIComponent(`Специалист: ${specialist.firstName} ${specialist.lastName}\nЦентр "Вдохновение"`);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${formattedStart}/${formattedEnd}&details=${eventDescription}`;
  };
  
  // Создание URL для добавления события в календарь iCalendar (Apple)
  const generateICalendarUrl = () => {
    if (!bookingData) return '';
    
    const { date, startTime, endTime, serviceName, specialist } = bookingData;
    
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);
    
    const formattedStart = startDateTime.toISOString();
    const formattedEnd = endDateTime.toISOString();
    
    const eventTitle = encodeURIComponent(`Запись на услугу: ${serviceName}`);
    const eventDescription = encodeURIComponent(`Специалист: ${specialist.firstName} ${specialist.lastName}\nЦентр "Вдохновение"`);
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formattedStart.replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${formattedEnd.replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${eventDescription}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    return URL.createObjectURL(blob);
  };
  
  // Переход в личный кабинет
  const goToUserAppointments = () => {
    // Добавляем небольшую задержку, чтобы запись успела сохраниться
    console.log('[SpecialistBookingModal] Переход в личный кабинет...');
    setTimeout(() => {
      router.push('/cabinet/appointments');
      onClose();
    }, 1000); // Увеличиваем задержку до 1 секунды
  };
  
  // Если модальное окно не открыто, не рендерим ничего
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out"
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-t-2xl sm:rounded-xl shadow-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full sm:translate-y-24 sm:opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Полоска для перетаскивания в мобильной версии */}
        <div className="h-1.5 w-16 bg-gray-300 rounded-full mx-auto my-2 sm:hidden"></div>
        
        {/* Заголовок */}
        <div className="p-4 sm:p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-[#4B4B4B]">
              {step === 1 ? 'Запись к специалисту' : 'Запись на услугу'}
            </h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>
          {specialist && (
            <div className="text-[#48a9a6] font-medium mt-1">
              {specialist.firstName} {specialist.lastName}
              {step > 1 && selectedService && <span> — {selectedService.name}</span>}
            </div>
          )}
        </div>
        
        {/* Успешное бронирование */}
        {isBookingSuccess && bookingData && (
          <div className="p-4 sm:p-6">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full mb-3 sm:mb-4">
                <FaCheckCircle className="text-green-500" size={32} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Запись успешно создана!</h3>
              <p className="text-gray-600">
                Подтверждение было отправлено на ваш email
              </p>
            </div>
            
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-5 sm:mb-6">
              <h4 className="font-medium mb-2">Детали записи</h4>
              <div className="grid grid-cols-1 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <FaUser className="text-[#48a9a6] w-4 flex-shrink-0" />
                  <span className="truncate">Специалист: {bookingData.specialist.firstName} {bookingData.specialist.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-[#48a9a6] w-4 flex-shrink-0" />
                  <span>Дата: {new Date(bookingData.date).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaClock className="text-[#48a9a6] w-4 flex-shrink-0" />
                  <span>Время: {bookingData.startTime} - {bookingData.endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaRubleSign className="text-[#48a9a6] w-4 flex-shrink-0" />
                  {appliedPromo ? (
                    <div className="flex flex-col">
                      <p className="line-through text-gray-500">Стоимость: {selectedService?.price} ₽</p>
                      <p className="font-medium text-green-600">
                        Итого со скидкой: {selectedService ? selectedService.price - appliedPromo.discountAmount : 0} ₽ 
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          -{appliedPromo.discountAmount} ₽
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p>Стоимость: {selectedService?.price} ₽</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mb-5 sm:mb-6">
              <h4 className="font-medium mb-2">Добавить запись в календарь</h4>
              <div className="flex flex-wrap gap-2">
                <a 
                  href={generateGoogleCalendarUrl()} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <FaGoogle />
                  <span>Google Календарь</span>
                </a>
                <a 
                  href={generateICalendarUrl()} 
                  download="appointment.ics"
                  className="px-3 sm:px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 text-sm"
                >
                  <FaApple />
                  <span>Apple Календарь</span>
                </a>
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button 
                className="sm:flex-1 px-4 sm:px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={handleClose}
              >
                Закрыть
              </button>
              <button 
                className="sm:flex-1 px-4 sm:px-6 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors"
                onClick={goToUserAppointments}
              >
                Перейти к моим записям
              </button>
            </div>
          </div>
        )}
        
        {/* Шаги бронирования */}
        {!isBookingSuccess && !showLoginForm && (
          <div className="p-4 sm:p-6 overflow-hidden">
            {/* Контейнер с анимацией перехода между шагами */}
            <div 
              className={`transition-all duration-300 ease-in-out transform ${
                isChangingStep 
                  ? (direction === 'forward' ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0') 
                  : 'translate-x-0 opacity-100'
              }`}
            >
              {/* Шаг 1: Выбор услуги */}
              {step === 1 && (
                <div>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2 mb-4"></div>
                      <p className="text-gray-500">Загружаем данные специалиста...</p>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 p-4 rounded-md text-red-700 mb-4">
                      <p>{error}</p>
                    </div>
                  ) : services.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <FaCheckCircle className="text-gray-400" size={28} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">У данного специалиста нет доступных услуг</h3>
                      <p className="text-gray-500 mb-6">Пожалуйста, выберите другого специалиста или свяжитесь с нами для уточнения информации</p>
                      <button 
                        className="px-6 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors"
                        onClick={handleClose}
                      >
                        Закрыть
                      </button>
                    </div>
                  ) : (
                    <>
                      {specialist && (
                        <div className="flex items-center mb-6 bg-gray-50 p-4 rounded-lg">
                          {/* Фото специалиста */}
                          <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                            {specialist.photo ? (
                              <Image
                                src={getImageUrl(specialist.photo)}
                              alt={`${specialist.firstName} ${specialist.lastName}`}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  console.error(`Ошибка загрузки изображения в модальном окне: ${target.src}`);
                                    target.src = '/images/photoPreview.jpg';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <FaUser className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {specialist.firstName} {specialist.lastName}
                            </h4>
                            <p className="text-[#48a9a6]">{specialist.position || 'Специалист'}</p>
                          </div>
                        </div>
                      )}
                      
                      <h4 className="text-lg font-medium mb-4">Выберите услугу</h4>
                      
                      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                        {services.map(service => (
                          <div 
                            key={service.id}
                            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-[#48a9a6] transition-colors cursor-pointer"
                            onClick={() => handleServiceSelect(service)}
                          >
                            <div className="flex items-center">
                              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                                  <Image 
                                   src={getImageUrl(service.image)}
                                  alt={service.name}
                                    fill
                                    className="object-cover"
                                    unoptimized={true}
                                    priority={true}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/images/photoPreview.jpg';
                                    }}
                                />
                              </div>
                              <div className="ml-4 flex-grow">
                                <h5 className="text-lg font-semibold text-gray-900">{service.name}</h5>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[#48a9a6] font-medium">{service.price.toLocaleString('ru-RU')} ₽</span>
                                  <span className="text-gray-500">{service.duration} мин</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Шаг 2: Выбор даты */}
              {step === 2 && (
                <div>
                  <h3 className="text-lg font-medium mb-3 sm:mb-4">Выберите дату</h3>
                  <p className="text-sm text-gray-500 mb-4">При выборе даты вы автоматически перейдете к выбору времени</p>
                  
                  {isLoadingDates ? (
                    <div className="text-center p-4 border border-gray-200 bg-gray-50 rounded-lg">
                      <div className="animate-spin mx-auto h-8 w-8 border-2 border-[#48a9a6] border-t-transparent rounded-full mb-2"></div>
                      <p className="text-gray-500">Загрузка доступных дат...</p>
                    </div>
                  ) : (
                    <FixedDatePicker
                      availableDates={availableDates}
                      onSelectDate={selectDate}
                      onSelectTime={() => {}} // Игнорируем выбор времени на этом шаге
                      selectedDate={selectedDate ? selectedDate.toISOString().split('T')[0] : null}
                      selectedTime={selectedTimeSlot}
                      isLoading={isLoadingDates}
                      loadingMessage="Загрузка доступных дат..."
                      timeSlots={[]}
                      noTimeSlotsMessage=""
                      showTimeSlots={false} // Не показываем слоты времени
                    />
                  )}
                  
                  <div className="mt-6 flex justify-start">
                    <button 
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      onClick={prevStep}
                    >
                      Назад
                    </button>
                  </div>
                </div>
              )}
              
              {/* Шаг 3: Выбор времени */}
              {step === 3 && selectedDate && (
                <div>
                  <h3 className="text-lg font-medium mb-3 sm:mb-4">Выберите время</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Дата: {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  
                  {isLoadingDates ? (
                    <div className="text-center p-4 border border-gray-200 bg-gray-50 rounded-lg mb-6">
                      <div className="animate-spin mx-auto h-8 w-8 border-2 border-[#48a9a6] border-t-transparent rounded-full mb-2"></div>
                      <p className="text-gray-500">Загрузка доступного времени...</p>
                    </div>
                  ) : availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6">
                      {availableTimeSlots.map((slot, index) => (
                        <div
                          key={index}
                          className={`px-3 py-2 text-center text-sm rounded-lg cursor-pointer border ${
                            selectedTimeSlot?.start === slot.start
                              ? 'bg-[#48a9a6] text-white border-[#48a9a6]'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-[#48a9a6]'
                          }`}
                          onClick={() => selectTime(slot)}
                        >
                          {slot.start}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 border border-gray-200 bg-gray-50 rounded-lg mb-6">
                      <FaRegClock className="mx-auto text-gray-400 mb-2" size={24} />
                      <p className="text-gray-500">
                        {noSlotsReason?.message || "Нет доступных слотов на выбранную дату"}
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-start">
                    <button 
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      onClick={prevStep}
                    >
                      Назад
                    </button>
                  </div>
                </div>
              )}
              
              {/* Шаг 4: Данные пользователя */}
              {step === 4 && (
                <div>
                  <h3 className="text-lg font-medium mb-3 sm:mb-4">Оформление записи</h3>
                  
                  {/* Информация о выбранной дате и времени */}
                  {selectedDate && selectedTimeSlot && (
                    <div className="mb-4 sm:mb-6">
                      <div className="bg-[#48a9a6]/10 p-3 sm:p-4 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-2">Ваш выбор</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <FaUser className="text-[#48a9a6] w-4 flex-shrink-0" />
                            <p>Специалист: {specialist?.firstName} {specialist?.lastName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaCalendarTimes size={14} className="text-[#48a9a6]" />
                            <p>Дата: {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaRegClock size={14} className="text-[#48a9a6]" />
                            <p>Время: {selectedTimeSlot.start} - {selectedTimeSlot.end}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaRubleSign className="text-[#48a9a6] w-4 flex-shrink-0" />
                            {appliedPromo ? (
                              <div className="flex flex-col">
                                <p className="line-through text-gray-500">Стоимость: {selectedService?.price} ₽</p>
                                <p className="font-medium text-green-600">
                                  Итого со скидкой: {selectedService ? selectedService.price - appliedPromo.discountAmount : 0} ₽ 
                                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                    -{appliedPromo.discountAmount} ₽
                                  </span>
                                </p>
                              </div>
                            ) : (
                            <p>Стоимость: {selectedService?.price} ₽</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Промокод */}
                  <div className="mb-4 sm:mb-6">
                    <h4 className="font-medium mb-2">Промокод</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-grow">
                        <div className="relative">
                          <input
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                            placeholder="Введите промокод"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                              promoCodeStatus === 'error' ? 'border-red-300 focus:ring-red-500' :
                              promoCodeStatus === 'success' ? 'border-green-300 focus:ring-green-500' :
                              'border-gray-300 focus:ring-[#48a9a6]'
                            }`}
                            disabled={promoCodeStatus === 'success' || promoCodeStatus === 'loading'}
                          />
                          {promoCodeStatus === 'success' && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500">
                              <FaCheckCircle />
                            </div>
                          )}
                        </div>
                        {promoCodeMessage && (
                          <p className={`mt-1 text-xs ${
                            promoCodeStatus === 'error' ? 'text-red-500' :
                            promoCodeStatus === 'success' ? 'text-green-600' :
                            'text-gray-500'
                          }`}>
                            {promoCodeMessage}
                          </p>
                        )}
                      </div>
                      
                      {promoCodeStatus === 'success' ? (
                        <button
                          type="button"
                          onClick={handleCancelPromoCode}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Отменить
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleApplyPromoCode}
                          disabled={promoCodeStatus === 'loading' || !promoCode.trim()}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            promoCodeStatus === 'loading' || !promoCode.trim()
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-[#48a9a6] text-white hover:bg-[#48a9a6]/90'
                          }`}
                        >
                          {promoCodeStatus === 'loading' ? 'Проверка...' : 'Применить'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Кнопка входа в аккаунт (для неавторизованных пользователей) */}
                  {!user && (
                    <div className="w-full mb-5 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-gray-700 mb-3 text-sm">У вас уже есть аккаунт? Войдите, чтобы данные заполнились автоматически.</p>
                      <button 
                        className="w-full px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors flex justify-center items-center gap-2"
                        onClick={() => setShowLoginForm(true)}
                      >
                        <FaUser size={14} />
                        <span>Войти в аккаунт</span>
                      </button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 sm:mb-6">
                    {/* Имя */}
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-lg">
                          <FaUser size={16} />
                        </span>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="flex-grow px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                          placeholder="Введите имя"
                          required
                          autoComplete="given-name"
                        />
                      </div>
                    </div>
                    
                    {/* Фамилия */}
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-lg">
                          <FaUser size={16} />
                        </span>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="flex-grow px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                          placeholder="Введите фамилию"
                          autoComplete="family-name"
                        />
                      </div>
                    </div>
                    
                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-lg">
                          <FaEnvelope size={16} />
                        </span>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="flex-grow px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                          placeholder="email@example.com"
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    
                    {/* Телефон */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Телефон *</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-lg">
                          <FaPhone size={16} />
                        </span>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="flex-grow px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                          placeholder="+7 (xxx) xxx-xx-xx"
                          required
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                    
                    {/* Пароль (только для неавторизованных пользователей) */}
                    {!user && (
                      <div className="sm:col-span-2">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Пароль (для создания аккаунта)</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-lg">
                            <FaLock size={16} />
                          </span>
                          <input
                            id="password"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="flex-grow px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                            placeholder="Придумайте пароль"
                            autoComplete="new-password"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Если вы не укажете пароль, он будет отправлен на указанный email
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
                    <button 
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      onClick={prevStep}
                    >
                      Назад
                    </button>
                    <button 
                      className="px-6 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors"
                      onClick={handleBooking}
                    >
                      Забронировать
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecialistBookingModal; 