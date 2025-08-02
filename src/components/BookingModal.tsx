'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/Toast';
import Image from 'next/image';
import { FaCalendarAlt, FaClock, FaRandom, FaRegClock, FaUser, FaEnvelope, FaPhone, FaLock, FaRubleSign, FaChevronLeft, FaChevronRight, FaArrowLeft, FaCheckCircle, FaGoogle, FaApple, FaTimes, FaCalendarTimes, FaGift } from 'react-icons/fa';
import { AppointmentStatus, TimeSlot } from '@/models/types';
import { useRouter } from 'next/navigation';
import FixedDatePicker from './FixedDatePicker';
import { signIn } from 'next-auth/react';

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  specialists: Specialist[];
  image?: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service;
}

// Функция для генерации URL изображения через API
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

const BookingModal = ({ isOpen, onClose, service }: BookingModalProps) => {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  
  // Состояние для хранения URL изображения услуги
  const [serviceSrc, setServiceSrc] = useState('/images/photoPreview.jpg');
  
  // Устанавливаем путь к изображению услуги при загрузке компонента
  useEffect(() => {
    if (service) {
      const timestamp = new Date().getTime();
      if (service.image && service.image.length > 0) {
        // Если у услуги есть путь к изображению в базе данных, используем его
        const imagePath = service.image.startsWith('/') ? service.image.substring(1) : service.image;
        setServiceSrc(`/api/images?path=${encodeURIComponent(imagePath)}&t=${timestamp}`);
        console.log(`[BookingModal] Установлен путь к изображению услуги из БД: /api/images?path=${encodeURIComponent(imagePath)}&t=${timestamp}`);
      } else {
        // Если нет пути в базе данных, используем ID услуги
        setServiceSrc(`/api/images?path=services/${service.id}&t=${timestamp}`);
        console.log(`[BookingModal] Установлен путь к изображению услуги по ID: /api/images?path=services/${service.id}&t=${timestamp}`);
      }
    } else {
      setServiceSrc('/images/photoPreview.jpg');
    }
  }, [service]);
  
  // Состояния для анимации всплывающего окна
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Состояния для авторизации
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Добавим состояния для анимации перехода между шагами
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isChangingStep, setIsChangingStep] = useState(false);
  
  // Добавим шаг для выбора времени отдельно от выбора даты
  // 1 - выбор специалиста, 2 - выбор даты, 3 - выбор времени, 4 - ввод данных
  const [step, setStep] = useState(1);
  
  // Состояния для бронирования
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]); // Изменяем тип на строки вместо Date
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
  
  // Состояния для бонусов
  const [useBonus, setUseBonus] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [userBonusBalance, setUserBonusBalance] = useState(0);
  const [finalPrice, setFinalPrice] = useState(service.price);
  
  // Состояния для успешного бронирования
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  
  // Добавляем состояние для хранения причины недоступности
  const [noSlotsReason, setNoSlotsReason] = useState<{
    status: string;
    reason: string;
    message: string;
  } | null>(null);
  
  // Добавим состояние для максимального количества бонусов
  const [maxBonusAmount, setMaxBonusAmount] = useState(0);
  
  // Состояние для хранения URL изображений специалистов
  const [specialistImages, setSpecialistImages] = useState<{[key: string]: string}>({});
  
  // Устанавливаем пути к изображениям специалистов при загрузке компонента
  useEffect(() => {
    const imageUrls: {[key: string]: string} = {};
    
    if (service && service.specialists) {
      service.specialists.forEach(specialist => {
        if (specialist.photo) {
          const timestamp = new Date().getTime();
          const photoPath = specialist.photo.startsWith('/') ? specialist.photo.substring(1) : specialist.photo;
          imageUrls[specialist.id] = `/api/images?path=${encodeURIComponent(photoPath)}&t=${timestamp}`;
          console.log(`[BookingModal] Установлен путь к фото специалиста через API: /api/images?path=${encodeURIComponent(photoPath)}&t=${timestamp}`);
        } else {
          imageUrls[specialist.id] = '/images/photoPreview.jpg';
          console.log('[BookingModal] Фото специалиста отсутствует, используется заглушка');
        }
      });
    }
    
    setSpecialistImages(imageUrls);
  }, [service?.specialists]);
  
  // Обрабатываем открытие и закрытие модального окна с анимацией
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);
  
  // Загрузка данных пользователя, если он авторизован
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      
      // Загружаем бонусный баланс пользователя
      const fetchBonusBalance = async () => {
        try {
          const response = await fetch(`/api/bonus/user/${user.id}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setUserBonusBalance(data.balance);
            }
          }
        } catch (error) {
          console.error('Ошибка при загрузке баланса бонусов:', error);
        }
      };
      
      fetchBonusBalance();
    }
  }, [user]);
  
  // Обновление финальной цены при изменении бонусов или промокода
  useEffect(() => {
    let price = service.price;
    
    // Применяем скидку промокода
    if (appliedPromo) {
      price = price - appliedPromo.discountAmount;
    }
    
    // Применяем бонусы
    if (useBonus && user) {
      // Максимальное количество бонусов, которое можно использовать (не больше 50% от цены)
      const maxBonusAmount = Math.min(userBonusBalance, Math.floor(price * 0.5));
      setMaxBonusAmount(maxBonusAmount);
      
      // Если текущее значение бонусов больше максимального, корректируем его
      if (bonusAmount > maxBonusAmount) {
        setBonusAmount(maxBonusAmount);
      }
      
      // Применяем фактическое количество бонусов
      price = price - bonusAmount;
    } else {
      setBonusAmount(0);
      setMaxBonusAmount(0);
    }
    
    setFinalPrice(Math.max(0, price));
  }, [useBonus, service.price, userBonusBalance, appliedPromo, user, bonusAmount]);
  
  // Добавляем эффект для установки максимального значения бонусов при включении
  useEffect(() => {
    if (useBonus && maxBonusAmount > 0 && bonusAmount === 0) {
      // Если включили бонусы и значение бонусов равно 0, устанавливаем максимальное значение
      setBonusAmount(maxBonusAmount);
      console.log('[BookingModal] Установлено максимальное значение бонусов:', maxBonusAmount);
    }
  }, [useBonus, maxBonusAmount]);
  
  // Загрузка доступных дат при выборе специалиста
  useEffect(() => {
    if (!selectedSpecialist) return;
    
    const fetchAvailableDates = async () => {
      setIsLoadingDates(true);
      
      try {
        // Получаем первый и последний день месяца для запроса доступных дат
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Получаем настройки расписания специалиста, чтобы узнать период бронирования
        let bookingPeriodMonths = 3; // По умолчанию 3 месяца
        
        try {
          const scheduleResponse = await fetch(`/api/specialists/${selectedSpecialist.id}/schedule`);
          if (scheduleResponse.ok) {
            const scheduleData = await scheduleResponse.json();
            if (scheduleData.success && scheduleData.data && scheduleData.data.bookingPeriodMonths) {
              bookingPeriodMonths = scheduleData.data.bookingPeriodMonths;
              console.log(`[BookingModal] Получен период бронирования: ${bookingPeriodMonths} месяцев`);
            }
          }
        } catch (error) {
          console.error('[BookingModal] Ошибка при получении настроек расписания:', error);
          // Используем значение по умолчанию
        }
        
        // Вычисляем конечную дату на основе периода бронирования
        const endDate = new Date(today.getFullYear(), today.getMonth() + bookingPeriodMonths, 0);
        
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        console.log('[BookingModal] Запрос доступных дат:', {
          specialistId: selectedSpecialist.id,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          bookingPeriodMonths
        });
        
        // Запрос к API
        const response = await fetch(
          `/api/specialists/${selectedSpecialist.id}/available-dates?startDate=${formattedStartDate}&endDate=${formattedEndDate}${service.id ? `&serviceId=${service.id}` : ''}`
        );
        
        const data = await response.json();
        
        if (data.success) {
          console.log(`[BookingModal] Получено ${data.data.length} доступных дат:`, data.data);
          setAvailableDates(data.data);
        } else {
          console.error('[BookingModal] Ошибка при получении доступных дат:', data.error);
          setAvailableDates([]);
        }
      } catch (error) {
        console.error('[BookingModal] Ошибка при загрузке доступных дат:', error);
        setAvailableDates([]);
      } finally {
        setIsLoadingDates(false);
      }
    };
    
    fetchAvailableDates();
  }, [selectedSpecialist, service.id]);
  
  // Загрузка доступных временных слотов при выборе специалиста и даты
  useEffect(() => {
    if (selectedSpecialist && selectedDate) {
      const fetchTimeSlots = async () => {
        try {
          console.log('[BookingModal] Запрос временных слотов:', {
            specialistId: selectedSpecialist.id,
            date: selectedDate.toISOString().split('T')[0],
            serviceDuration: service.duration
          });

          // Форматируем дату в YYYY-MM-DD
          const formattedDate = selectedDate.toISOString().split('T')[0];
          
          // Запрос к API для получения доступных слотов
          const response = await fetch(
            `/api/timeslots?specialistId=${selectedSpecialist.id}&date=${formattedDate}&serviceDuration=${service.duration}`
          );
          
          const data = await response.json();
          console.log('[BookingModal] Ответ API:', data);
          
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
          console.error('[BookingModal] Ошибка при загрузке временных слотов:', error);
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
  }, [selectedSpecialist, selectedDate, service.duration]);
  
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
  
  // Модифицируем функции для перехода между шагами
  const selectSpecialist = (specialist: Specialist) => {
    setSelectedSpecialist(specialist);
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    // Автоматически переходим к выбору даты
    setDirection('forward');
    setIsChangingStep(true);
    setTimeout(() => {
      setStep(2);
      setIsChangingStep(false);
    }, 300);
  };
  
  // Добавим функцию для выбора даты
  const selectDate = (date: string | null) => {
    if (date) {
      setSelectedDate(new Date(date));
      // Автоматически переходим к выбору времени
      setDirection('forward');
      setIsChangingStep(true);
      setTimeout(() => {
        setStep(3);
        setIsChangingStep(false);
      }, 300);
    } else {
      setSelectedDate(null);
    }
  };
  
  // Функция для выбора времени
  const selectTime = (timeSlot: TimeSlot | null) => {
    setSelectedTimeSlot(timeSlot);
    if (timeSlot) {
      // Автоматически переходим к вводу данных
      setDirection('forward');
      setIsChangingStep(true);
      setTimeout(() => {
        setStep(4);
        setIsChangingStep(false);
      }, 300);
    }
  };
  
  // Выбор случайного специалиста
  const selectRandomSpecialist = () => {
    if (service.specialists && service.specialists.length > 0) {
      const randomIndex = Math.floor(Math.random() * service.specialists.length);
      selectSpecialist(service.specialists[randomIndex]);
    }
  };
  
  // Отправка формы бронирования
  const handleBooking = async () => {
    if (!selectedSpecialist || !selectedDate || !selectedTimeSlot) {
      toast.error('Не все данные выбраны для бронирования');
      return;
    }
    
    if (!firstName || !email || !phone) {
      toast.error('Пожалуйста, заполните обязательные поля');
      return;
    }
    
    try {
      // Получаем ID пользователя, если он авторизован
      const userId = user?.id || null;
      
      // Форматируем дату в строку YYYY-MM-DD
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // Подготовка данных для бронирования
      const appointmentData = {
        specialistId: selectedSpecialist.id,
        serviceId: service.id,
        userId: userId, // Добавляем ID пользователя, если он авторизован
        date: formattedDate,
        timeStart: selectedTimeSlot.start,
        timeEnd: selectedTimeSlot.end,
        userName: firstName + (lastName ? ' ' + lastName : ''),
        userEmail: email,
        userPhone: phone,
        password: password || null, // Если пользователь не указал пароль
        price: service.price,
        status: 'pending',
        // Добавляем информацию для электронного письма
        specialistName: `${selectedSpecialist.firstName} ${selectedSpecialist.lastName}`,
        serviceName: service.name,
        // Добавляем информацию о промокоде, если он применен
        promoCode: appliedPromo ? appliedPromo.code : null,
        discountAmount: appliedPromo?.discountAmount || 0,
        // Добавляем информацию о бонусах с правильным именем параметра
        bonusAmount: useBonus ? bonusAmount : 0,
        finalPrice: finalPrice
      };
      
      console.log('[BookingModal] Отправка данных бронирования:', appointmentData);
      
      // Получаем актуальный статус авторизации перед отправкой
      const authCheckResponse = await fetch('/api/auth/me');
      const authData = await authCheckResponse.json();
      
      // Если пользователь был авторизован, но сессия истекла, показываем форму авторизации
      if (user && !authData.success) {
        console.log('[BookingModal] Сессия пользователя истекла, показываем форму авторизации');
        setShowLoginForm(true);
        toast.error('Ваша сессия истекла. Пожалуйста, авторизуйтесь снова.');
        return;
      }
      
      // Проверка структуры директорий на сервере
      const checkDirsResponse = await fetch('/api/check-dirs');
      if (!checkDirsResponse.ok) {
        console.error('[BookingModal] Ошибка при проверке директорий:', await checkDirsResponse.text());
      } else {
        console.log('[BookingModal] Проверка директорий успешно выполнена');
      }
      
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
      console.log('[BookingModal] Статус ответа API:', response.status, response.statusText);
      console.log('[BookingModal] Тип контента:', response.headers.get('content-type'));
      
      // Обработка ошибок сервера
      if (!response.ok) {
        try {
          // Пробуем получить JSON
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('[BookingModal] Ошибка API при бронировании (JSON):', errorData);
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
          } else {
            // Если ответ не JSON, пробуем получить текст
            const errorText = await response.text();
            console.error('[BookingModal] Ошибка API при бронировании (текст):', errorText || `Ошибка сервера: ${response.status}`);
            throw new Error(errorText || `Ошибка сервера: ${response.status}`);
          }
        } catch (jsonError) {
          console.error('[BookingModal] Ошибка при парсинге ответа:', jsonError);
          throw new Error(`Ошибка сервера: ${response.status}. Проверьте консоль для деталей.`);
        }
      }
      
      // Если ответ успешный, продолжаем
      let data;
      try {
        data = await response.json();
        console.log('[BookingModal] Ответ API бронирования:', data);
      } catch (jsonError) {
        console.error('[BookingModal] Ошибка при парсинге успешного ответа:', jsonError);
        toast.error('Получен некорректный ответ от сервера. Пожалуйста, проверьте, была ли создана запись.');
        onClose(); // Закрываем модальное окно
        return;
      }
      
      if (data.success) {
        const bookedData = {
          ...appointmentData,
          specialist: selectedSpecialist,
          serviceName: service.name,
          // Исправляем названия полей для согласованности
          startTime: appointmentData.timeStart,
          endTime: appointmentData.timeEnd,
          id: data.data.id // Сохраняем ID созданной записи
        };
        setBookingData(bookedData);
        setIsBookingSuccess(true);
        
        // Обновляем данные пользователя, если необходимо
        if (!user && data.data.user) {
          console.log('[BookingModal] Новый пользователь создан, перезагрузка страницы');
          // Если новый пользователь был создан, обновляем авторизацию
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
        
        // Обновляем список записей, если пользователь находится на странице записей
        if (window.location.pathname.includes('/cabinet/appointments')) {
          // Публикуем событие для обновления списка записей
          const event = new CustomEvent('appointmentCreated', {
            detail: { appointmentId: data.data.id }
          });
          window.dispatchEvent(event);
          
          console.log('[BookingModal] Опубликовано событие appointmentCreated для обновления списка записей');
        }
      } else {
        throw new Error(data.error || 'Произошла ошибка при бронировании');
      }
    } catch (error) {
      console.error('[BookingModal] Ошибка при бронировании:', error);
      
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
    console.log('[BookingModal] Переход в личный кабинет...');
    setTimeout(() => {
      router.push('/cabinet/appointments');
      onClose();
    }, 1000); // Увеличиваем задержку до 1 секунды
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
  
  // Функция для входа через Google
  const handleGoogleLogin = async () => {
    try {
      await signIn('google', { callbackUrl: '/cabinet' });
    } catch (error) {
      toast.error('Ошибка при входе через Google');
      console.error('Google login error:', error);
    }
  };

  // Функция для проверки и применения промокода
  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeStatus('error');
      setPromoCodeMessage('Введите промокод');
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
          serviceId: service.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Расчет скидки
        let discountAmount = 0;
        
        if (data.data.discountType === 'percentage') {
          discountAmount = (service.price * data.data.discountValue) / 100;
        } else {
          discountAmount = data.data.discountValue;
        }
        
        // Ограничиваем скидку ценой услуги
        discountAmount = Math.min(discountAmount, service.price);
        
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
  
  // Обработчик для закрытия с анимацией
  const handleClose = () => {
    setIsAnimating(false);
    // Задержка для анимации
    setTimeout(() => {
      onClose();
    }, 300);
  };
  
  // Функция для обработки изменения слайдера бонусов
  const handleBonusSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    
    // Примагничиваем значение к ближайшим 100 рублям
    // если пользователь близок к круглой сумме (в пределах 20 рублей)
    const roundedValue = Math.round(value / 100) * 100;
    if (Math.abs(value - roundedValue) <= 20) {
      setBonusAmount(roundedValue);
    } else {
      setBonusAmount(value);
    }
  };
  
  // Добавьте секцию с бонусами в компонент, где пользователь может выбрать использование бонусов
  const renderBonusSection = () => {
    if (!user || userBonusBalance <= 0 || step !== 4) return null;
    
    // Создаем отметки для слайдера
    const tickMarks = [];
    const stepSize = 100;
    for (let i = 0; i <= maxBonusAmount; i += stepSize) {
      if (i <= maxBonusAmount) {
        tickMarks.push(i);
      }
    }
    
    return (
      <div>
        <h4 className="font-medium mb-2">Использовать бонусы</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-grow">
            <div className="relative">
              <div className="flex items-center justify-between px-4 py-2 border rounded-lg border-gray-300">
                <div className="flex items-center gap-2">
                  <FaGift className="text-[#48a9a6]" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Доступно: {userBonusBalance} ₽</span>
                    {useBonus && bonusAmount > 0 && (
                      <span className="text-xs text-green-600">Будет списано: {bonusAmount} ₽</span>
                    )}
                  </div>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBonus}
                    onChange={() => setUseBonus(!useBonus)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#48a9a6]"></div>
                  <span className="ms-2 text-xs text-gray-500">{useBonus ? 'Вкл' : 'Выкл'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Слайдер для выбора количества бонусов */}
        {useBonus && maxBonusAmount > 0 && (
          <div className="px-2 mt-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Списать бонусов:</span>
              <span className="font-medium text-[#48a9a6]">{bonusAmount} ₽</span>
            </div>
            <input
              type="range"
              min="0"
              max={maxBonusAmount}
              step="1"
              value={bonusAmount}
              onChange={handleBonusSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#48a9a6]"
              list="bonus-ticks"
            />
            <datalist id="bonus-ticks" className="flex justify-between w-full">
              {tickMarks.map(mark => (
                <option key={mark} value={mark} />
              ))}
            </datalist>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0 ₽</span>
              <span>{maxBonusAmount} ₽</span>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Если модальное окно закрыто, не рендерим содержимое
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out"
         onClick={handleClose}>
      <div className={`bg-white rounded-t-2xl sm:rounded-xl shadow-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full sm:translate-y-24 sm:opacity-0'}`}
           onClick={(e) => e.stopPropagation()}>
        {/* Полоска для перетаскивания в мобильной версии */}
        <div className="h-1.5 w-16 bg-gray-300 rounded-full mx-auto my-2 sm:hidden"></div>
        
        {/* Заголовок */}
        <div className="p-4 sm:p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-[#4B4B4B]">Запись на услугу</h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                              <Image 
                src={serviceSrc} 
                alt={service.name}
                fill
                className="object-cover"
                unoptimized={true}
                priority={true}
                loading="eager"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.error(`[BookingModal] Ошибка загрузки изображения услуги: ${target.src}`);
                  // Пробуем загрузить изображение еще раз с новым timestamp
                  const newTimestamp = new Date().getTime();
                  if (service && service.id) {
                    target.src = `/api/images?path=services/${service.id}&t=${newTimestamp}`;
                  } else {
                    target.src = '/images/photoPreview.jpg';
                  }
                  // Если повторная попытка не удалась, используем заглушку
                  target.onerror = () => {
                    console.error(`[BookingModal] Повторная попытка загрузки изображения услуги не удалась`);
                    target.src = '/images/photoPreview.jpg';
                    target.onerror = null; // Предотвращаем бесконечный цикл
                  };
                }}
                onLoad={() => {
                  console.log(`[BookingModal] Изображение услуги успешно загружено: ${service?.name}`);
                }}
              />
            </div>
            <div className="text-[#48a9a6] font-medium">{service.name}</div>
          </div>
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
                  {appliedPromo || (useBonus && bonusAmount > 0) ? (
                    <div className="flex flex-col">
                      <p className="line-through text-gray-500">Стоимость: {service.price} ₽</p>
                      <p className="font-medium text-green-600">
                        Итого к оплате: {finalPrice} ₽ 
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          {appliedPromo && useBonus && bonusAmount > 0 
                            ? `Скидка: ${appliedPromo.discountAmount + bonusAmount} ₽`
                            : appliedPromo 
                              ? `Скидка: ${appliedPromo.discountAmount} ₽` 
                              : `Бонусы: ${bonusAmount} ₽`}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p>Стоимость: {service.price} ₽</p>
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
        
        {/* Форма авторизации */}
        {!isBookingSuccess && showLoginForm && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Вход в аккаунт</h3>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowLoginForm(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-lg">
                    <FaEnvelope size={16} />
                  </span>
                  <input
                    id="loginEmail"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="flex-grow px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                    placeholder="email@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-lg">
                    <FaLock size={16} />
                  </span>
                  <input
                    id="loginPassword"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="flex-grow px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                    placeholder="Введите пароль"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full px-6 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loginLoading}
              >
                {loginLoading ? 'Вход...' : 'Войти'}
              </button>
            </form>
            
            {/* Разделитель */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Или войдите через</span>
              </div>
            </div>
            
            {/* Кнопки соцсетей */}
            <div className="mt-4 space-y-3">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#48a9a6] transition-colors"
                type="button"
              >
                <FaGoogle className="text-red-500" />
                Войти через Google
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-[#48a9a6] text-sm hover:underline flex items-center justify-center gap-2 mx-auto"
                onClick={() => setShowLoginForm(false)}
              >
                <FaArrowLeft size={12} />
                <span>Вернуться к бронированию</span>
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
              {/* Шаг 1: Выбор специалиста */}
              {step === 1 && (
                <div>
                  <h3 className="text-lg font-medium mb-3 sm:mb-4">Выберите специалиста</h3>
                  <p className="text-sm text-gray-500 mb-4">При выборе специалиста вы автоматически перейдете к выбору даты</p>
                  
                  {/* Кнопка случайного специалиста */}
                  <button 
                    className="w-full mb-4 px-4 py-2 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-[#4B4B4B] rounded-lg transition-colors"
                    onClick={selectRandomSpecialist}
                  >
                    <FaRandom size={14} />
                    <span>Случайный специалист</span>
                  </button>
                  
                  {/* Список специалистов */}
                  <div className="grid grid-cols-1 gap-3">
                    {service.specialists.map((specialist) => (
                      <div 
                        key={specialist.id}
                        className={`p-3 sm:p-4 border rounded-lg cursor-pointer hover:border-[#48a9a6] transition-colors flex items-center gap-3 ${
                          selectedSpecialist?.id === specialist.id ? 'border-[#48a9a6] bg-[#48a9a6]/5' : 'border-gray-200'
                        }`}
                        onClick={() => selectSpecialist(specialist)}
                      >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          {specialistImages[specialist.id] ? (
                            <Image 
                              src={specialistImages[specialist.id]} 
                              alt={`${specialist.firstName} ${specialist.lastName}`}
                              fill
                              className="object-cover"
                              unoptimized={true}
                              priority={true}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#48a9a6]/20 text-[#48a9a6]">
                              <FaUser size={24} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{specialist.firstName} {specialist.lastName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Шаг 2: Выбор даты */}
              {step === 2 && (
                <div>
                  <h3 className="text-lg font-medium mb-3 sm:mb-4">Выберите дату</h3>
                  <p className="text-sm text-gray-500 mb-4">При выборе даты вы автоматически перейдете к выбору времени</p>
                  
                  {!selectedSpecialist ? (
                    <div className="text-center p-4 sm:p-8 border border-gray-200 bg-gray-50 rounded-lg">
                      <FaUser className="mx-auto text-gray-400 mb-2" size={24} />
                      <p className="text-gray-500">Выберите специалиста, чтобы увидеть доступные даты</p>
                    </div>
                  ) : isLoadingDates ? (
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
                            <p>Специалист: {selectedSpecialist?.firstName} {selectedSpecialist?.lastName}</p>
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
                            {appliedPromo || (useBonus && bonusAmount > 0) ? (
                              <div className="flex flex-col">
                                <p className="line-through text-gray-500">Стоимость: {service.price} ₽</p>
                                <p className="font-medium text-green-600">
                                  Итого к оплате: {finalPrice} ₽ 
                                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                    {appliedPromo && useBonus && bonusAmount > 0 
                                      ? `Скидка: ${appliedPromo.discountAmount + bonusAmount} ₽`
                                      : appliedPromo 
                                        ? `Скидка: ${appliedPromo.discountAmount} ₽` 
                                        : `Бонусы: ${bonusAmount} ₽`}
                                  </span>
                                </p>
                              </div>
                            ) : (
                              <p>Стоимость: {service.price} ₽</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Промокод */}
                  <div className="mb-4 sm:mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
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
                      
                      {/* Бонусы */}
                      {renderBonusSection()}
                    </div>
                  </div>
                  
                  {/* Итоговая стоимость */}
                  {(appliedPromo || (useBonus && bonusAmount > 0)) && (
                    <div className="mb-4 sm:mb-6 bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-900">Итого к оплате:</h4>
                        <span className="text-xl font-bold text-[#48a9a6]">{finalPrice} ₽</span>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-500">
                        <div className="flex justify-between">
                          <span>Стоимость услуги:</span>
                          <span>{service.price} ₽</span>
                        </div>
                        {appliedPromo && (
                          <div className="flex justify-between">
                            <span>Скидка по промокоду:</span>
                            <span>-{appliedPromo.discountAmount} ₽</span>
                          </div>
                        )}
                        {useBonus && bonusAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Списание бонусов:</span>
                            <span>-{bonusAmount} ₽</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Проверяем наличие кнопки входа для неавторизованных пользователей в шаге 4 */}
                  {!user && step === 4 && !showLoginForm && (
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

export default BookingModal;