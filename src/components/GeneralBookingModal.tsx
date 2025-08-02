'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/Toast';
import Image from 'next/image';
import { FaCalendarAlt, FaClock, FaRandom, FaRegClock, FaUser, FaEnvelope, FaPhone, FaLock, FaRubleSign, FaChevronLeft, FaArrowLeft, FaCheckCircle, FaGoogle, FaApple, FaTimes, FaCalendarTimes, FaGift } from 'react-icons/fa';
import { AppointmentStatus, TimeSlot } from '@/models/types';
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

interface GeneralBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GeneralBookingModal = ({ isOpen, onClose }: GeneralBookingModalProps) => {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  
  // Состояния для анимации всплывающего окна
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Состояния для шагов бронирования
  // 1-выбор услуги, 2-выбор специалиста, 3-выбор даты, 4-выбор времени, 5-ввод данных
  const [step, setStep] = useState(1); 
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isChangingStep, setIsChangingStep] = useState(false);
  
  // Состояния для данных
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [noSlotsReason, setNoSlotsReason] = useState<{status: string; reason?: string; message: string} | null>(null);
  
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
  const [finalPrice, setFinalPrice] = useState(0);
  const [isFetchingBonuses, setIsFetchingBonuses] = useState(false); // Добавляем флаг для отслеживания запроса
  
  // Добавляем состояние для максимального количества бонусов
  const [maxBonusAmount, setMaxBonusAmount] = useState(0);
  
  // Данные формы для неавторизованных пользователей
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Состояния для успешного бронирования
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  
  // Обрабатываем открытие и закрытие модального окна с анимацией
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      
      // Сбрасываем состояние при повторном открытии окна
      if (!isBookingSuccess) {
        setStep(1);
        setSelectedService(null);
        setSelectedSpecialist(null);
        setSelectedDate(null);
        setSelectedTimeSlot(null);
      }
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, isBookingSuccess]);
  
  // Загрузка данных пользователя, если он авторизован
  useEffect(() => {
    if (!user) return; // Выходим, если пользователь не авторизован
    
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    
    // Загрузка баланса бонусов пользователя
    const fetchBonusBalance = async () => {
      // Если запрос уже выполняется, не начинаем новый
      if (isFetchingBonuses) return;
      
      // Проверяем, есть ли кешированные данные о бонусах в локальном хранилище
      if (typeof window !== 'undefined') {
        const cachedBonusData = localStorage.getItem(`bonus_data_${user.id}`);
        const cachedTimestamp = localStorage.getItem(`bonus_timestamp_${user.id}`);
        
        if (cachedBonusData && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          
          // Используем кешированные данные, если они не старше 5 минут
          if (now - timestamp < 5 * 60 * 1000) {
            try {
              const balance = parseInt(cachedBonusData, 10);
              setUserBonusBalance(balance);
              console.log('[GeneralBookingModal] Использованы кешированные данные о бонусах:', balance);
              return; // Выходим, используя кешированные данные
            } catch (e) {
              console.error('[GeneralBookingModal] Ошибка при разборе кешированных данных о бонусах:', e);
              // Продолжаем выполнение запроса
            }
          }
        }
      }
      
      // Генерируем уникальный идентификатор запроса
      const requestId = `bonus_request_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log(`[GeneralBookingModal] Запрос бонусов (ID: ${requestId}) для пользователя:`, user.id);
      
      try {
        setIsFetchingBonuses(true); // Устанавливаем флаг начала запроса
        
        // Добавляем предотвращение кеширования и уникальный идентификатор запроса
        const response = await fetch(`/api/bonus/user/${user.id}?_=${Date.now()}&requestId=${requestId}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache',
            'X-Request-ID': requestId
          }
        });
        console.log(`[GeneralBookingModal] Статус ответа (ID: ${requestId}):`, response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[GeneralBookingModal] Получены данные о бонусах (ID: ${requestId}):`, data);
          if (data.success) {
            const balance = data.balance || 0;
            setUserBonusBalance(balance);
            console.log(`[GeneralBookingModal] Установлен баланс бонусов (ID: ${requestId}):`, balance);
            
            // Кешируем данные в localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem(`bonus_data_${user.id}`, String(balance));
              localStorage.setItem(`bonus_timestamp_${user.id}`, String(Date.now()));
            }
          } else {
            console.error(`[GeneralBookingModal] Ошибка в ответе API бонусов (ID: ${requestId}):`, data.error || 'Неизвестная ошибка');
            // Устанавливаем баланс в 0, чтобы избежать проблем с обновлением
            setUserBonusBalance(0);
          }
        } else {
          console.error(`[GeneralBookingModal] Ошибка запроса бонусов (ID: ${requestId}):`, response.statusText);
          // Устанавливаем баланс в 0, чтобы избежать проблем с обновлением
          setUserBonusBalance(0);
        }
      } catch (error) {
        console.error(`[GeneralBookingModal] Ошибка при загрузке баланса бонусов (ID: ${requestId}):`, error);
        // Устанавливаем баланс в 0, чтобы избежать проблем с обновлением
        setUserBonusBalance(0);
      } finally {
        setIsFetchingBonuses(false); // Сбрасываем флаг в любом случае
        console.log(`[GeneralBookingModal] Завершен запрос бонусов (ID: ${requestId})`);
      }
    };
    
    // Используем ключ для уникальной идентификации пользователя (userId),
    // чтобы эффект выполнялся только при смене пользователя
    fetchBonusBalance();
  }, [user?.id]); // Зависимость ТОЛЬКО от идентификатора пользователя
  
  // Обновление финальной цены при изменении бонусов или промокода
  useEffect(() => {
    if (!selectedService) {
      setFinalPrice(0);
      return;
    }
    
    console.log('[GeneralBookingModal] Обновление цены, данные:', {
      price: selectedService.price,
      promo: appliedPromo ? `${appliedPromo.code} (скидка ${appliedPromo.discountAmount})` : 'нет',
      bonus: {
        use: useBonus,
        balance: userBonusBalance,
        authorized: !!user,
        bonusAmount
      }
    });
    
    let price = selectedService.price;
    
    // Применяем скидку промокода
    if (appliedPromo) {
      price = price - appliedPromo.discountAmount;
    }
    
    // Применяем бонусы
    if (useBonus && user) {
      // Эффективное количество бонусов для применения (не изменяем bonusAmount напрямую)
      const effectiveBonusAmount = Math.min(bonusAmount, maxBonusAmount);
      
      // Применяем фактическое количество бонусов
      price = price - effectiveBonusAmount;
    }
    
    setFinalPrice(Math.max(0, price));
    console.log('[GeneralBookingModal] Итоговая цена:', Math.max(0, price));
  }, [useBonus, selectedService, userBonusBalance, appliedPromo, user, bonusAmount, maxBonusAmount]);
  
  // Отдельный эффект для корректировки значения бонусов и максимальной суммы
  useEffect(() => {
    if (!selectedService) return;
    
    if (useBonus && user) {
      const price = selectedService.price - (appliedPromo?.discountAmount || 0);
      const newMaxBonusAmount = Math.min(userBonusBalance, Math.floor(price * 0.5));
      
      // Обновляем максимальное значение бонусов
      setMaxBonusAmount(newMaxBonusAmount);
      
      // Если текущее значение бонусов больше максимального, корректируем его
      if (bonusAmount > newMaxBonusAmount) {
        setBonusAmount(newMaxBonusAmount);
      }
    } else {
      // Сбрасываем бонусы, если они отключены
      setBonusAmount(0);
      setMaxBonusAmount(0);
    }
  }, [useBonus, selectedService, userBonusBalance, appliedPromo, user]);
  
  // Добавляем эффект для установки максимального значения бонусов при включении
  useEffect(() => {
    if (useBonus && maxBonusAmount > 0 && bonusAmount === 0) {
      // Если включили бонусы и значение бонусов равно 0, устанавливаем максимальное значение
      setBonusAmount(maxBonusAmount);
      console.log('[GeneralBookingModal] Установлено максимальное значение бонусов:', maxBonusAmount);
    }
  }, [useBonus, maxBonusAmount]);
  
  // Загрузка всех услуг при открытии модального окна
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/services');
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить услуги');
        }
        
        const data = await response.json();
        
        // Проверяем формат данных (может быть как data.data, так и просто массив)
        let activeServices = [];
        
        // Если данные в старом формате с полем data
        if (data && data.data && Array.isArray(data.data)) {
          activeServices = data.data.filter((service: Service) => !service.isArchived);
        } 
        // Если данные в новом формате (просто массив)
        else if (Array.isArray(data)) {
          activeServices = data.filter((service: Service) => !service.isArchived);
        }
        // Если неожиданный формат
        else {
          console.error('Неожиданный формат данных от API услуг:', data);
          activeServices = [];
        }
        
        console.log(`[GeneralBookingModal] Загружено ${activeServices.length} активных услуг`);
        setServices(activeServices);
      } catch (error) {
        console.error('Ошибка при загрузке услуг:', error);
        setError(error instanceof Error ? error.message : 'Произошла ошибка при загрузке услуг');
      } finally {
        setLoading(false);
      }
    };
    
    fetchServices();
  }, [isOpen]);
  
  // Загрузка специалистов по выбранной услуге
  useEffect(() => {
    if (!selectedService) return;
    
    const fetchSpecialists = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/specialists');
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить специалистов');
        }
        
        const data = await response.json();
        
        // Проверяем формат данных (может быть как data.data, так и просто массив)
        let specialistsData = [];
        
        // Если данные в старом формате с полем data
        if (data && data.data && Array.isArray(data.data)) {
          specialistsData = data.data;
        } 
        // Если данные в новом формате (просто массив)
        else if (Array.isArray(data)) {
          specialistsData = data;
        }
        // Если неожиданный формат
        else {
          console.error('Неожиданный формат данных от API специалистов:', data);
          setSpecialists([]);
          return;
        }
        
        // Фильтруем специалистов, которые предоставляют выбранную услугу
        const filteredSpecialists = specialistsData.filter((specialist: Specialist) => 
          specialist.services && specialist.services.some(service => service.id === selectedService.id)
        );
        
        console.log(`[GeneralBookingModal] Найдено ${filteredSpecialists.length} специалистов для услуги ${selectedService.name}`);
        setSpecialists(filteredSpecialists);
      } catch (error) {
        console.error('Ошибка при загрузке специалистов:', error);
        setError(error instanceof Error ? error.message : 'Произошла ошибка при загрузке специалистов');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSpecialists();
  }, [selectedService]);
  
  // Загрузка доступных дат при выборе специалиста
  useEffect(() => {
    if (!selectedSpecialist || !selectedService) return;
    
    const fetchAvailableDates = async () => {
      setIsLoadingDates(true);
      
      try {
        // Получаем текущую дату
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Получаем настройки расписания специалиста для периода бронирования
        let bookingPeriodMonths = 3; // По умолчанию 3 месяца
        
        try {
          const scheduleResponse = await fetch(`/api/specialists/${selectedSpecialist.id}/schedule`);
          if (scheduleResponse.ok) {
            const scheduleData = await scheduleResponse.json();
            if (scheduleData.success && scheduleData.data && scheduleData.data.bookingPeriodMonths) {
              bookingPeriodMonths = scheduleData.data.bookingPeriodMonths;
              console.log(`[GeneralBookingModal] Получен период бронирования: ${bookingPeriodMonths} месяцев`);
            }
          }
        } catch (error) {
          console.error('[GeneralBookingModal] Ошибка при получении настроек расписания:', error);
          // Используем значение по умолчанию
        }
        
        // Вычисляем конечную дату на основе периода бронирования
        const endDate = new Date(today.getFullYear(), today.getMonth() + bookingPeriodMonths, 0);
        
        const formattedStartDate = formatDateToString(startDate);
        const formattedEndDate = formatDateToString(endDate);
        
        console.log(`[GeneralBookingModal] Запрос доступных дат: от ${formattedStartDate} до ${formattedEndDate}`);
        
        // Запрос к API
        const response = await fetch(
          `/api/specialists/${selectedSpecialist.id}/available-dates?startDate=${formattedStartDate}&endDate=${formattedEndDate}&serviceId=${selectedService.id}`
        );
        
        console.log(`[GeneralBookingModal] Статус ответа API: ${response.status}`);
        
        // Если API вернул ошибку, создаем фиктивные даты для тестирования
        if (!response.ok) {
          console.error(`[GeneralBookingModal] Ошибка API: ${response.status}`);
          
          // Генерируем тестовые даты на текущий месяц
          const testDates = [];
          const currentMonth = new Date();
          const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
          
          for (let i = 1; i <= daysInMonth; i++) {
            // Добавляем только будущие даты (начиная с сегодня)
            if (i >= currentMonth.getDate()) {
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
              // Добавляем только рабочие дни (пн-пт)
              if (date.getDay() !== 0 && date.getDay() !== 6) {
                testDates.push(formatDateToString(date));
              }
            }
          }
          
          console.log(`[GeneralBookingModal] Сгенерированы тестовые даты: ${testDates.length}`);
          setAvailableDates(testDates);
          setIsLoadingDates(false);
          return;
        }
        
        const data = await response.json();
        console.log(`[GeneralBookingModal] Полученные данные:`, data);
        
        if (data.success) {
          console.log(`[GeneralBookingModal] Получено ${data.data.length} доступных дат:`, data.data);
          
          // Проверяем, что data.data является массивом
          if (Array.isArray(data.data)) {
            setAvailableDates(data.data);
          } else {
            console.error('[GeneralBookingModal] Ошибка: data.data не является массивом:', data.data);
            setAvailableDates([]);
          }
        } else {
          console.error('[GeneralBookingModal] Ошибка при получении доступных дат:', data.error);
          setAvailableDates([]);
        }
      } catch (error) {
        console.error('[GeneralBookingModal] Ошибка при загрузке доступных дат:', error);
        setAvailableDates([]);
      } finally {
        setIsLoadingDates(false);
      }
    };
    
    fetchAvailableDates();
  }, [selectedSpecialist, selectedService]);
  
  // Вспомогательная функция для форматирования даты в строку YYYY-MM-DD
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Вспомогательная функция для генерации тестовых временных слотов
  const generateTestTimeSlots = () => {
    const testTimeSlots = [];
    const startHour = 9; // Начало рабочего дня
    const endHour = 18;  // Конец рабочего дня
    
    for (let hour = startHour; hour < endHour; hour++) {
      // Добавляем слоты каждые 30 минут
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endHourStr = (minute === 30 && hour === endHour - 1) ? endHour.toString().padStart(2, '0') : (minute === 30) ? (hour + 1).toString().padStart(2, '0') : hour.toString().padStart(2, '0');
        const endMinuteStr = (minute === 30) ? '00' : '30';
        const endTime = `${endHourStr}:${endMinuteStr}`;
        
        testTimeSlots.push({
          start: startTime,
          end: endTime,
          isAvailable: true
        });
      }
    }
    
    console.log(`[GeneralBookingModal] Сгенерированы тестовые временные слоты: ${testTimeSlots.length}`);
    setAvailableTimeSlots(testTimeSlots);
    setNoSlotsReason(null);
    setLoading(false);
  };
  
  // Загрузка доступных временных слотов при выборе даты
  useEffect(() => {
    if (!selectedSpecialist || !selectedService || !selectedDate) {
      console.log('[GeneralBookingModal] Не все данные для загрузки временных слотов:', {
        selectedSpecialist: !!selectedSpecialist,
        selectedService: !!selectedService,
        selectedDate: selectedDate ? selectedDate.toString() : null
      });
      return;
    }
    
    // Проверяем, что дата валидна
    if (isNaN(selectedDate.getTime())) {
      console.error('[GeneralBookingModal] Невалидная дата для загрузки временных слотов:', selectedDate);
      return;
    }
    
    const fetchTimeSlots = async () => {
      try {
        setLoading(true);
        
        // Форматируем дату в YYYY-MM-DD
        const formattedDate = selectedDate.toISOString().split('T')[0];
        
        console.log(`[GeneralBookingModal] Запрос временных слотов для даты ${formattedDate}`);
        
        // Запрос к API для получения доступных слотов
        const response = await fetch(
          `/api/timeslots?specialistId=${selectedSpecialist.id}&date=${formattedDate}&serviceDuration=${selectedService.duration}`
        );
        
        console.log(`[GeneralBookingModal] Статус ответа API временных слотов: ${response.status}`);
        
        // Если API вернул ошибку, создаем фиктивные временные слоты для тестирования
        if (!response.ok) {
          console.error(`[GeneralBookingModal] Ошибка API временных слотов: ${response.status}`);
          generateTestTimeSlots();
          return;
        }
        
        // Пробуем распарсить JSON с обработкой возможной ошибки
        let data;
        try {
          data = await response.json();
          console.log(`[GeneralBookingModal] Полученные данные временных слотов:`, data);
        } catch (parseError) {
          console.error('[GeneralBookingModal] Ошибка при парсинге JSON:', parseError);
          generateTestTimeSlots();
          return;
        }
        
        if (data.success) {
          console.log('[GeneralBookingModal] Получены временные слоты:', data.data);
          
          // Проверяем структуру данных
          if (data.data && data.data.timeSlots) {
            if (Array.isArray(data.data.timeSlots)) {
              setAvailableTimeSlots(data.data.timeSlots);
            } else {
              console.error('[GeneralBookingModal] Ошибка: data.data.timeSlots не является массивом:', data.data.timeSlots);
              setAvailableTimeSlots([]);
            }
          } else {
            console.error('[GeneralBookingModal] Ошибка: data.data.timeSlots отсутствует:', data.data);
            setAvailableTimeSlots([]);
          }
          
          // Устанавливаем причину недоступности если нет слотов
          if (data.data.status === 'unavailable') {
            setNoSlotsReason({
              status: data.data.status,
              reason: data.data.reason,
              message: data.data.message || 'На этот день нет доступных слотов времени'
            });
          } else {
            setNoSlotsReason(null);
          }
        } else {
          console.error('[GeneralBookingModal] Ошибка в ответе API:', data.error);
          generateTestTimeSlots();
        }
      } catch (error) {
        console.error('Ошибка при загрузке временных слотов:', error);
        setAvailableTimeSlots([]);
        setNoSlotsReason({
          status: 'error',
          reason: 'error',
          message: 'Произошла ошибка при загрузке доступного времени'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimeSlots();
  }, [selectedSpecialist, selectedService, selectedDate]);
  
  // Обработчики для шагов бронирования
  const nextStep = () => {
    setDirection('forward');
    setIsChangingStep(true);
    
    setTimeout(() => {
      setStep(prevStep => prevStep + 1);
      setIsChangingStep(false);
    }, 300);
  };
  
  const prevStep = () => {
    setDirection('backward');
    setIsChangingStep(true);
    
    setTimeout(() => {
      setStep(prevStep => prevStep - 1);
      setIsChangingStep(false);
    }, 300);
  };
  
  // Обработчики выбора
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    nextStep();
  };
  
  const handleSpecialistSelect = (specialist: Specialist) => {
    setSelectedSpecialist(specialist);
    nextStep();
  };
  
  const selectDate = (date: string | null) => {
    if (date) {
      console.log('[GeneralBookingModal] Выбрана дата:', date);
      try {
        // Преобразуем строку в объект Date
        const selectedDay = new Date(date);
        // Проверяем, что дата валидна
        if (isNaN(selectedDay.getTime())) {
          console.error('[GeneralBookingModal] Ошибка: невалидная дата', date);
          return;
        }
        setSelectedDate(selectedDay);
        nextStep();
      } catch (error) {
        console.error('[GeneralBookingModal] Ошибка при обработке даты:', error);
      }
    } else {
      console.warn('[GeneralBookingModal] Попытка выбрать пустую дату');
    }
  };
  
  const selectTime = (timeSlot: TimeSlot | null) => {
    setSelectedTimeSlot(timeSlot);
    nextStep();
  };
  
  // Обработчик закрытия модального окна
  const handleClose = () => {
    if (isBookingSuccess) {
      setIsBookingSuccess(false);
    }
    onClose();
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
      // Вызываем функцию входа через Google из next-auth
      await signIn('google', { callbackUrl: window.location.href });
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
  
  // Обработчик создания записи
  const handleBooking = async () => {
    if (!selectedService || !selectedSpecialist || !selectedDate || !selectedTimeSlot) {
      toast.error('Не все данные выбраны для бронирования');
      return;
    }
    
    try {
      // Получаем ID пользователя, если он авторизован
      const userId = user?.id || null;
      
      // Форматируем дату в строку YYYY-MM-DD
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // Создаем данные для бронирования
      const appointmentData = {
        specialistId: selectedSpecialist.id,
        serviceId: selectedService.id,
        userId: userId,
        date: formattedDate,
        timeStart: selectedTimeSlot.start,
        timeEnd: selectedTimeSlot.end,
        userName: firstName + (lastName ? ' ' + lastName : ''),
        userEmail: email,
        userPhone: phone,
        password: password,
        // Включаем информацию о сервисе и специалисте для письма
        serviceName: selectedService.name,
        specialistName: `${selectedSpecialist.firstName} ${selectedSpecialist.lastName}`,
        // Включаем информацию о ценах
        price: selectedService.price,
        promoCode: appliedPromo?.code || null,
        discountAmount: appliedPromo?.discountAmount || 0,
        // Добавляем информацию о бонусах с правильным именем параметра
        bonusAmount: useBonus ? bonusAmount : 0,
        finalPrice: finalPrice
      };
      
      console.log('[GeneralBookingModal] Отправка данных бронирования:', appointmentData);
      
      // Если пользователь авторизован и у него не заполнен телефон или он изменился, обновляем его в профиле
      if (user && userId && phone && (!user.phone || user.phone !== phone)) {
        try {
          console.log('[GeneralBookingModal] Обновление телефона в профиле пользователя:', phone);
          const updateProfileResponse = await fetch('/api/auth/me', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone }),
            credentials: 'include'
          });
          
          if (updateProfileResponse.ok) {
            console.log('[GeneralBookingModal] Телефон успешно обновлен в профиле');
            toast.success('Номер телефона сохранен в вашем профиле');
          } else {
            console.error('[GeneralBookingModal] Ошибка при обновлении телефона:', await updateProfileResponse.text());
          }
        } catch (profileError) {
          console.error('[GeneralBookingModal] Ошибка при обновлении профиля:', profileError);
        }
      }
      
      // Отправка данных на сервер
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
        credentials: 'include' // Добавляем credentials для отправки куки с запросом
      });
      
      // Логируем статус ответа и заголовки
      console.log('[GeneralBookingModal] Статус ответа API:', response.status, response.statusText);
      
      // Обработка ошибок сервера
      if (!response.ok) {
        try {
          // Пробуем получить JSON
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('[GeneralBookingModal] Ошибка API при бронировании (JSON):', errorData);
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
          } else {
            // Если ответ не JSON, пробуем получить текст
            const errorText = await response.text();
            console.error('[GeneralBookingModal] Ошибка API при бронировании (текст):', errorText);
            throw new Error(errorText || `Ошибка сервера: ${response.status}`);
          }
        } catch (jsonError) {
          console.error('[GeneralBookingModal] Ошибка при парсинге ответа:', jsonError);
          throw new Error(`Ошибка сервера: ${response.status}. Проверьте консоль для деталей.`);
        }
      }
      
      // Если ответ успешный, продолжаем
      let data;
      try {
        data = await response.json();
        console.log('[GeneralBookingModal] Ответ API бронирования:', data);
      } catch (jsonError) {
        console.error('[GeneralBookingModal] Ошибка при парсинге успешного ответа:', jsonError);
        toast.error('Получен некорректный ответ от сервера. Пожалуйста, проверьте, была ли создана запись.');
        onClose(); // Закрываем модальное окно
        return;
      }
      
      if (data.success) {
        // Подготавливаем данные для отображения в успешном сообщении
        const bookedData = {
          ...appointmentData,
          specialist: {
            id: selectedSpecialist.id,
            firstName: selectedSpecialist.firstName,
            lastName: selectedSpecialist.lastName,
            photo: selectedSpecialist.photo
          },
          // Исправляем названия полей для согласованности
          startTime: appointmentData.timeStart,
          endTime: appointmentData.timeEnd,
          id: data.data.id // Сохраняем ID созданной записи
        };
        
        // Успешное бронирование
        setIsBookingSuccess(true);
        setBookingData(bookedData);
        toast.success('Запись успешно создана!');
        
        // Обновляем данные пользователя, если необходимо
        if (!user && data.data.user) {
          console.log('[GeneralBookingModal] Новый пользователь создан, перезагрузка страницы');
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
          
          console.log('[GeneralBookingModal] Опубликовано событие appointmentCreated для обновления списка записей');
        }
      } else {
        // Ошибка при бронировании
        toast.error(data.error || 'Произошла ошибка при создании записи');
      }
    } catch (error) {
      console.error('[GeneralBookingModal] Ошибка при создании записи:', error);
      
      // Улучшенная обработка ошибок
      let errorMessage = 'Произошла ошибка при создании записи';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'error' in error) {
        errorMessage = String(error.error);
      }
      
      toast.error(errorMessage);
    }
  };
  
  // Функция для перехода в личный кабинет
  const goToUserAppointments = () => {
    router.push('/cabinet/appointments');
    onClose();
  };
  
  // Функция для создания URL Google Calendar
  const generateGoogleCalendarUrl = () => {
    if (!bookingData || !selectedService || !selectedSpecialist) return '';
    
    const startTime = new Date(`${bookingData.date}T${bookingData.timeStart}`);
    const endTime = new Date(`${bookingData.date}T${bookingData.timeEnd}`);
    
    const eventDetails = {
      action: 'TEMPLATE',
      text: `Запись на ${selectedService.name}`,
      dates: `${startTime.toISOString().replace(/-|:|\.\d+/g, '')}/${endTime.toISOString().replace(/-|:|\.\d+/g, '')}`,
      details: `Запись на услугу "${selectedService.name}" к специалисту ${selectedSpecialist.firstName} ${selectedSpecialist.lastName}`,
      location: 'Салон "Вдохновение"'
    };
    
    const params = new URLSearchParams(eventDetails).toString();
    return `https://calendar.google.com/calendar/render?${params}`;
  };
  
  // Добавляем функцию для обработки изменения слайдера бонусов
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
  
  // Если модальное окно закрыто, не рендерим его содержимое вообще
  if (!isOpen) {
    return null;
  }
  
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
              Запись на услуги
            </h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>
          {/* Подзаголовок с информацией о выбранных данных */}
          <div className="text-[#48a9a6] font-medium mt-1">
            {selectedService && <span>{selectedService.name}</span>}
            {selectedService && selectedSpecialist && <span> — {selectedSpecialist.firstName} {selectedSpecialist.lastName}</span>}
          </div>
        </div>
        
        {/* Содержимое модального окна */}
        <div className="p-4 sm:p-6">
          {/* Успешное бронирование */}
          {isBookingSuccess && (
            <div>
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
                    <span className="truncate">Специалист: {selectedSpecialist?.firstName} {selectedSpecialist?.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-[#48a9a6] w-4 flex-shrink-0" />
                    <span>Дата: {bookingData?.date ? new Date(bookingData.date).toLocaleDateString('ru-RU') : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaClock className="text-[#48a9a6] w-4 flex-shrink-0" />
                    <span>Время: {bookingData?.timeStart} - {bookingData?.timeEnd}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaRubleSign className="text-[#48a9a6] w-4 flex-shrink-0" />
                    {bookingData.discountAmount > 0 || bookingData.bonusAmount > 0 ? (
                      <div className="flex flex-col">
                        <p className="line-through text-gray-500">Стоимость: {bookingData.price} ₽</p>
                        <p className="font-medium text-green-600">
                          Итого к оплате: {bookingData.finalPrice} ₽ 
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            {bookingData.discountAmount > 0 && bookingData.bonusAmount > 0 
                              ? `Скидка: ${bookingData.discountAmount + bookingData.bonusAmount} ₽`
                              : bookingData.discountAmount > 0 
                                ? `Скидка: ${bookingData.discountAmount} ₽` 
                                : `Бонусы: ${bookingData.bonusAmount} ₽`}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p>Стоимость: {bookingData.price} ₽</p>
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
          
          {/* Шаг 1: Выбор услуги */}
          {!isBookingSuccess && step === 1 && (
            <div className={`transform transition-all duration-300 ${isChangingStep ? direction === 'forward' ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
              <h3 className="text-lg font-medium mb-3 sm:mb-4">Выберите услугу</h3>
              
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="w-12 h-12 border-4 border-[#48a9a6] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : error ? (
                <div className="text-red-600 p-4 text-center">
                  {error}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {services.map((service) => (
                    <div 
                      key={service.id}
                      className="p-3 sm:p-4 border rounded-lg cursor-pointer hover:border-[#48a9a6] transition-colors flex items-center"
                      onClick={() => handleServiceSelect(service)}
                    >
                      {service.id && (
                        <div className="w-12 h-12 relative rounded-md overflow-hidden flex-shrink-0 mr-4">
                          <Image 
                            src={service.image && service.image.length > 0 
                              ? `/api/images?path=${encodeURIComponent(service.image.startsWith('/') ? service.image.substring(1) : service.image)}&t=${new Date().getTime()}`
                              : `/api/images?path=services/${service.id}&t=${new Date().getTime()}`}
                            alt={service.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                            priority={true}
                            loading="eager"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              console.error(`[GeneralBookingModal] Ошибка загрузки изображения услуги: ${target.src}`);
                              // Пробуем загрузить изображение еще раз с новым timestamp
                              const newTimestamp = new Date().getTime();
                              target.src = `/api/images?path=services/${service.id}&t=${newTimestamp}`;
                              // Если повторная попытка не удалась, используем заглушку
                              target.onerror = () => {
                                console.error(`[GeneralBookingModal] Повторная попытка загрузки изображения услуги не удалась`);
                                target.src = '/images/photoPreview.jpg';
                                target.onerror = null; // Предотвращаем бесконечный цикл
                              };
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-grow">
                        <h4 className="font-medium">{service.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <div className="text-xs font-medium text-gray-500 flex items-center">
                            <FaRubleSign className="mr-1" size={10} />
                            {service.price} ₽
                          </div>
                          <div className="text-xs font-medium text-gray-500 flex items-center">
                            <FaClock className="mr-1" size={10} />
                            {service.duration} мин.
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {services.length === 0 && !loading && !error && (
                <div className="text-center p-6">
                  <p className="text-gray-600 mb-4">На данный момент нет доступных услуг</p>
                </div>
              )}
            </div>
          )}
          
          {/* Шаг 2: Выбор специалиста */}
          {!isBookingSuccess && step === 2 && (
            <div className={`transform transition-all duration-300 ${isChangingStep ? direction === 'forward' ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
              <div className="flex items-center mb-3 sm:mb-4">
                <button 
                  className="mr-2 text-gray-600 hover:text-gray-900"
                  onClick={prevStep}
                >
                  <FaArrowLeft />
                </button>
                <h3 className="text-lg font-medium">Выберите специалиста</h3>
              </div>
              
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="w-12 h-12 border-4 border-[#48a9a6] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : error ? (
                <div className="text-red-600 p-4 text-center">
                  {error}
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <button 
                      className="w-full p-3 sm:p-4 border border-[#48a9a6]/30 bg-[#48a9a6]/5 rounded-lg hover:bg-[#48a9a6]/10 transition-colors flex items-center justify-center gap-2"
                      onClick={() => {
                        // Выбираем случайного специалиста из доступных
                        if (specialists.length > 0) {
                          const randomIndex = Math.floor(Math.random() * specialists.length);
                          handleSpecialistSelect(specialists[randomIndex]);
                        }
                      }}
                    >
                      <FaRandom className="text-[#48a9a6]" />
                      <span className="font-medium text-[#48a9a6]">Случайный специалист</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {specialists.map((specialist) => (
                      <div 
                        key={specialist.id}
                        className="p-3 sm:p-4 border rounded-lg cursor-pointer hover:border-[#48a9a6] transition-colors flex items-center gap-3"
                        onClick={() => handleSpecialistSelect(specialist)}
                      >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          {specialist.id ? (
                            <Image 
                              src={specialist.photo && specialist.photo.length > 0
                                ? `/api/images?path=${encodeURIComponent(specialist.photo.startsWith('/') ? specialist.photo.substring(1) : specialist.photo)}&t=${new Date().getTime()}`
                                : `/api/images?path=specialists/${specialist.id}&t=${new Date().getTime()}`} 
                              alt={`${specialist.firstName} ${specialist.lastName}`}
                              fill
                              className="object-cover"
                              sizes="48px"
                              priority={true}
                              loading="eager"
                                                            onError={(e) => {
                                 const target = e.target as HTMLImageElement;
                                 console.error(`[GeneralBookingModal] Ошибка загрузки изображения специалиста: ${target.src}`);
                                 // Пробуем загрузить изображение еще раз с новым timestamp
                                 const newTimestamp = new Date().getTime();
                                 target.src = `/api/images?path=specialists/${specialist.id}&t=${newTimestamp}`;
                                 // Если повторная попытка не удалась, используем заглушку
                                 target.onerror = () => {
                                   console.error(`[GeneralBookingModal] Повторная попытка загрузки изображения специалиста не удалась`);
                                   target.src = '/images/photoPreview.jpg';
                                   target.onerror = null; // Предотвращаем бесконечный цикл
                                 };
                               }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#48a9a6]/20 text-[#48a9a6]">
                              <FaUser />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{specialist.firstName} {specialist.lastName}</div>
                          {specialist.position && (
                            <div className="text-sm text-gray-600">{specialist.position}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {specialists.length === 0 && !loading && !error && (
                <div className="text-center p-6">
                  <p className="text-gray-600 mb-4">К сожалению, нет специалистов, предоставляющих эту услугу</p>
                  <button
                    className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors"
                    onClick={prevStep}
                  >
                    Выбрать другую услугу
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Шаг 3: Выбор даты */}
          {!isBookingSuccess && step === 3 && (
            <div className={`transform transition-all duration-300 ${isChangingStep ? direction === 'forward' ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
              <div className="flex items-center mb-3 sm:mb-4">
                <button 
                  className="mr-2 text-gray-600 hover:text-gray-900"
                  onClick={prevStep}
                >
                  <FaArrowLeft />
                </button>
                <h3 className="text-lg font-medium">Выберите дату</h3>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">При выборе даты вы автоматически перейдете к выбору времени</p>
              
              {isLoadingDates ? (
                <div className="text-center p-4 border border-gray-200 bg-gray-50 rounded-lg">
                  <div className="animate-spin mx-auto h-8 w-8 border-2 border-[#48a9a6] border-t-transparent rounded-full mb-2"></div>
                  <p className="text-gray-500">Загрузка доступных дат...</p>
                </div>
              ) : availableDates.length === 0 ? (
                <div className="bg-red-50 p-4 rounded-lg mb-4">
                  <p className="text-center text-red-600 mb-2">
                    К сожалению, у специалиста нет доступных дат для записи
                  </p>
                  <div className="flex justify-center">
                    <button
                      onClick={prevStep}
                      className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors"
                    >
                      Выбрать другого специалиста
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <FixedDatePicker
                    specialistId={selectedSpecialist?.id}
                    serviceId={selectedService?.id}
                    availableDates={availableDates}
                    onSelectDate={(date) => {
                      console.log('[GeneralBookingModal] FixedDatePicker выбрана дата:', date);
                      selectDate(date);
                    }}
                    selectedDate={selectedDate ? selectedDate.toISOString().split('T')[0] : null}
                    isLoading={isLoadingDates}
                    loadingMessage="Загрузка доступных дат..."
                    showTimeSlots={false}
                  />
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
          
          {/* Шаг 4: Выбор времени */}
          {!isBookingSuccess && step === 4 && (
            <div className={`transform transition-all duration-300 ${isChangingStep ? direction === 'forward' ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
              <div className="flex items-center mb-3 sm:mb-4">
                <button 
                  className="mr-2 text-gray-600 hover:text-gray-900"
                  onClick={prevStep}
                >
                  <FaArrowLeft />
                </button>
                <h3 className="text-lg font-medium">Выберите время</h3>
              </div>
              
              {selectedDate && (
                <p className="text-sm text-gray-500 mb-4">
                  Дата: {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
              
              {loading ? (
                <div className="text-center p-4 border border-gray-200 bg-gray-50 rounded-lg mb-6">
                  <div className="animate-spin mx-auto h-8 w-8 border-2 border-[#48a9a6] border-t-transparent rounded-full mb-2"></div>
                  <p className="text-gray-500">Загрузка доступного времени...</p>
                </div>
              ) : availableTimeSlots.length === 0 ? (
                <div className="bg-orange-50 p-4 rounded-lg mb-6">
                  <p className="text-center text-orange-700 mb-2">
                    {noSlotsReason?.message || 'На этот день нет доступных слотов времени.'}
                  </p>
                  <div className="flex justify-center">
                    <button
                      onClick={prevStep}
                      className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors"
                    >
                      Выбрать другую дату
                    </button>
                  </div>
                </div>
              ) : (
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
          
          {/* Шаг 5: Ввод данных */}
          {!isBookingSuccess && step === 5 && (
            <div className={`transform transition-all duration-300 ${isChangingStep ? direction === 'forward' ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
              <div className="flex items-center mb-3 sm:mb-4">
                <button 
                  className="mr-2 text-gray-600 hover:text-gray-900"
                  onClick={prevStep}
                >
                  <FaArrowLeft />
                </button>
                <h3 className="text-lg font-medium">Оформление записи</h3>
              </div>
              
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
                        <p>Дата: {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaRegClock size={14} className="text-[#48a9a6]" />
                        <p>Время: {selectedTimeSlot.start} - {selectedTimeSlot.end}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaRubleSign className="text-[#48a9a6] w-4 flex-shrink-0" />
                        {appliedPromo || (useBonus && bonusAmount > 0) ? (
                          <div className="flex flex-col">
                            <p className="line-through text-gray-500">Стоимость: {selectedService?.price} ₽</p>
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
                        <p>Стоимость: {selectedService?.price} ₽</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Промокод и бонусы */}
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
                  {user && (
                    <div>
                      <h4 className="font-medium mb-2">Использовать бонусы</h4>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-grow">
                          <div className="relative">
                            <div className={`flex items-center justify-between px-4 py-2 border rounded-lg ${userBonusBalance > 0 ? 'border-[#48a9a6] bg-[#48a9a6]/5' : 'border-gray-300'}`}>
                              <div className="flex items-center gap-2">
                                <FaGift className={`${userBonusBalance > 0 ? 'text-[#48a9a6]' : 'text-gray-400'}`} />
                                <div className="flex flex-col">
                                  {userBonusBalance > 0 ? (
                                    <span className="text-sm font-medium">Доступно: <span className="text-[#48a9a6] font-bold">{userBonusBalance} ₽</span></span>
                                  ) : (
                                    <span className="text-sm text-gray-500">У вас пока нет бонусов</span>
                                  )}
                                  {useBonus && bonusAmount > 0 && (
                                    <span className="text-xs text-green-600 font-medium">Будет списано: {bonusAmount} ₽</span>
                                  )}
                                </div>
                              </div>
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={useBonus}
                                  onChange={() => setUseBonus(!useBonus)}
                                  disabled={userBonusBalance <= 0}
                                  className="sr-only peer"
                                />
                                <div className={`relative w-11 h-6 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${userBonusBalance <= 0 ? 'bg-gray-200 peer-checked:bg-gray-300' : 'bg-gray-200 peer-checked:bg-[#48a9a6]'}`}></div>
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
                          {/* Создаем отметки для слайдера */}
                          {(() => {
                            const tickMarks = [];
                            const stepSize = 100;
                            for (let i = 0; i <= maxBonusAmount; i += stepSize) {
                              if (i <= maxBonusAmount) {
                                tickMarks.push(i);
                              }
                            }
                            return (
                              <>
                                <input
                                  type="range"
                                  min="0"
                                  max={maxBonusAmount}
                                  step="1"
                                  value={bonusAmount}
                                  onChange={handleBonusSliderChange}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#48a9a6]"
                                  list="bonus-ticks-general"
                                />
                                <datalist id="bonus-ticks-general" className="flex justify-between w-full">
                                  {tickMarks.map(mark => (
                                    <option key={mark} value={mark} />
                                  ))}
                                </datalist>
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>0 ₽</span>
                                  <span>{maxBonusAmount} ₽</span>
                                </div>
                                {/* Удаляем кнопки с фиксированными значениями */}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Блок для неавторизованных пользователей */}
              {!user && !showLoginForm && (
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
              
              {/* Форма входа */}
              {!user && showLoginForm ? (
                <div className="mb-4 bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Вход в аккаунт</h4>
                    <button
                      onClick={() => setShowLoginForm(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleLogin}>
                    <div className="space-y-3">
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
                            placeholder="Ваш email"
                            required
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
                            placeholder="Ваш пароль"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors"
                        disabled={loginLoading}
                      >
                        {loginLoading ? 'Вход...' : 'Войти'}
                      </button>
                    </div>
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
                    >
                      <FaGoogle className="text-red-500" />
                      Войти через Google
                    </button>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      className="text-[#48a9a6] text-sm hover:underline"
                      onClick={() => setShowLoginForm(false)}
                    >
                      Вернуться к бронированию
                    </button>
                  </div>
                </div>
              ) : (
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
                    {/* Уведомление для авторизованных пользователей без телефона */}
                    {user && (!user.phone || user.phone === '') && (
                      <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Телефон будет сохранен в вашем профиле</span>
                      </div>
                    )}
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
              )}
              
              {/* Итоговая стоимость */}
              {(appliedPromo || (useBonus && bonusAmount > 0)) && selectedService && (
                <div className="mb-4 sm:mb-6 bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900">Итого к оплате:</h4>
                    <span className="text-xl font-bold text-[#48a9a6]">{finalPrice} ₽</span>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    <div className="flex justify-between">
                      <span>Стоимость услуги:</span>
                      <span>{selectedService.price} ₽</span>
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
              
              <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
                <button 
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={prevStep}
                >
                  Назад
                </button>
                {!showLoginForm && (
                  <button 
                    className="px-6 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors"
                    onClick={handleBooking}
                  >
                    Забронировать
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralBookingModal; 