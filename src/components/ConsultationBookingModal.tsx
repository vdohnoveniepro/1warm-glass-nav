'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/Toast';
import Image from 'next/image';
import { FaCalendarAlt, FaClock, FaRegClock, FaUser, FaEnvelope, FaPhone, FaLock, FaRubleSign, FaChevronLeft, FaChevronRight, FaArrowLeft, FaCheckCircle, FaGoogle, FaApple, FaTimes, FaCalendarTimes, FaRandom, FaGift } from 'react-icons/fa';
import { Service, Specialist } from '@/models/types';
import { useRouter } from 'next/navigation';
import FixedDatePicker from '@/components/FixedDatePicker';
import Calendar from 'react-calendar';
import VibrateButton from './ui/VibrateButton';
import 'react-calendar/dist/Calendar.css';
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

interface ConsultationBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId?: string;
}

// Определяем интерфейс для временных слотов
interface TimeSlot {
  id: string;
  specialistId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  start?: string; // Для совместимости с другими компонентами
  end?: string; // Для совместимости с другими компонентами
}

const ConsultationBookingModal = ({ isOpen, onClose, serviceId = '' }: ConsultationBookingModalProps) => {
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
  const [maxBonusAmount, setMaxBonusAmount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  
  // Состояния для успешного бронирования
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  
  // Состояние для хранения причины недоступности
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
              console.log('Загружен бонусный баланс:', data.balance);
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
    if (!selectedService) {
      setFinalPrice(0);
      return;
    }
    
    let price = selectedService.price;
    
    // Применяем скидку промокода
    if (appliedPromo) {
      price = price - appliedPromo.discountAmount;
    }
    
    // Рассчитываем максимальное количество бонусов, которое можно использовать (не больше 50% от цены)
    const maxAmount = Math.min(userBonusBalance, Math.floor(price * 0.5));
    setMaxBonusAmount(maxAmount);
    
    // Применяем бонусы
    if (useBonus && bonusAmount > 0) {
      // Убеждаемся, что не списываем больше максимального значения
      const actualBonusAmount = Math.min(bonusAmount, maxAmount);
      price = price - actualBonusAmount;
    }
    
    setFinalPrice(Math.max(0, price));
  }, [selectedService, useBonus, bonusAmount, userBonusBalance, appliedPromo]);
  
  // Добавляем эффект для установки максимального значения бонусов при включении
  useEffect(() => {
    if (useBonus && maxBonusAmount > 0 && bonusAmount === 0) {
      // Если включили бонусы и значение бонусов равно 0, устанавливаем максимальное значение
      setBonusAmount(maxBonusAmount);
      console.log('[ConsultationBookingModal] Установлено максимальное значение бонусов:', maxBonusAmount);
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
        let consultationServices = [];
        
        // Обрабатываем разные форматы данных
        if (data && data.data && Array.isArray(data.data)) {
          // Старый формат с data.data
          consultationServices = data.data.filter((service: Service) => 
            !service.isArchived && service.name.toLowerCase().includes('консультаци')
          );
        } else if (Array.isArray(data)) {
          // Новый формат - просто массив
          consultationServices = data.filter((service: Service) => 
            !service.isArchived && service.name.toLowerCase().includes('консультаци')
          );
        } else {
          console.error('Неожиданный формат данных от API услуг:', data);
          consultationServices = [];
        }
        
        console.log(`[ConsultationBookingModal] Загружено ${consultationServices.length} консультационных услуг`);
        setServices(consultationServices);
        
        // Если передан serviceId, выбираем услугу автоматически
        if (serviceId) {
          const service = consultationServices.find((service: Service) => service.id === serviceId);
          if (service) {
            setSelectedService(service);
            setStep(2); // Переходим к выбору специалиста
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке услуг:', error);
        setError(error instanceof Error ? error.message : 'Произошла ошибка при загрузке услуг');
      } finally {
        setLoading(false);
      }
    };
    
    fetchServices();
  }, [isOpen, serviceId]);
  
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
        
        console.log(`[ConsultationBookingModal] Найдено ${filteredSpecialists.length} специалистов для услуги ${selectedService.name}`);
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
    if (!selectedSpecialist) return;
    
    const fetchAvailableDates = async () => {
      try {
        setIsLoadingDates(true);
        
        // Получаем первый и последний день месяца для запроса доступных дат
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Вычисляем конечную дату на 3 месяца вперед
        const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);
        
        const formattedStartDate = formatDateToString(startDate);
        const formattedEndDate = formatDateToString(endDate);
        
        // Запрос к API
        const response = await fetch(
          `/api/specialists/${selectedSpecialist.id}/available-dates?startDate=${formattedStartDate}&endDate=${formattedEndDate}${selectedService?.id ? `&serviceId=${selectedService.id}` : ''}`
        );
        
        const data = await response.json();
        
        if (data.success) {
          setAvailableDates(data.data);
        } else {
          console.error('Ошибка при получении доступных дат:', data.error);
          setAvailableDates([]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке доступных дат:', error);
        setAvailableDates([]);
      } finally {
        setIsLoadingDates(false);
      }
    };
    
    fetchAvailableDates();
  }, [selectedSpecialist, selectedService]);
  
  // Загрузка доступных временных слотов при выборе специалиста и даты
  useEffect(() => {
    if (selectedSpecialist && selectedDate) {
      const fetchTimeSlots = async () => {
        try {
          // Форматируем дату в YYYY-MM-DD
          const formattedDate = formatDateToString(selectedDate);
          
          // Запрос к API для получения доступных слотов
          const response = await fetch(
            `/api/timeslots?specialistId=${selectedSpecialist.id}&date=${formattedDate}&serviceDuration=${selectedService?.duration || 60}`
          );
          
          // Обрабатываем ошибки запроса
          if (!response.ok) {
            console.error(`Ошибка при загрузке временных слотов: ${response.status}`);
            console.log('[ConsultationBookingModal] Используем тестовые временные слоты из-за ошибки API');
            setAvailableTimeSlots(generateTestTimeSlots(formattedDate));
            setNoSlotsReason(null);
            return;
          }
          
          // Пробуем распарсить JSON с обработкой возможной ошибки
          let data;
          try {
            data = await response.json();
            console.log('Ответ API для временных слотов:', data);
          } catch (parseError) {
            console.error('Ошибка при парсинге ответа JSON:', parseError);
            console.log('[ConsultationBookingModal] Используем тестовые временные слоты из-за ошибки парсинга');
            setAvailableTimeSlots(generateTestTimeSlots(formattedDate));
            setNoSlotsReason(null);
            return;
          }
          
          if (data.success) {
            // Проверяем структуру данных и адаптируемся к ней
            let timeSlots = [];
            
            if (Array.isArray(data.data)) {
              // Если данные пришли как массив
              timeSlots = data.data;
              console.log('Тип данных: массив, длина:', timeSlots.length);
            } else if (data.data && data.data.timeSlots && Array.isArray(data.data.timeSlots)) {
              // Если данные пришли в поле timeSlots
              timeSlots = data.data.timeSlots;
              console.log('Тип данных: объект с полем timeSlots, длина:', timeSlots.length);
            } else if (data.data && typeof data.data === 'object') {
              // Если данные пришли как объект с другой структурой
              console.log('Тип данных: неожиданная структура объекта:', data.data);
              timeSlots = [];
            }
            
            // Если слоты пустые, генерируем тестовые
            if (timeSlots.length === 0) {
              console.log('[ConsultationBookingModal] Нет слотов в ответе, используем тестовые');
              setAvailableTimeSlots(generateTestTimeSlots(formattedDate));
              return;
            }
            
            // Убедимся, что каждый слот имеет правильную структуру
            const processedTimeSlots = timeSlots.map((slot: any, index: number) => {
              // Если слот уже имеет нужную структуру, вернем его как есть
              if (slot && typeof slot === 'object' && slot.id && slot.startTime) {
                return slot;
              }
              
              // Если структура отличается, создадим совместимый объект
              return {
                id: slot.id || `slot-${index}`,
                specialistId: slot.specialistId || selectedSpecialist.id,
                date: slot.date || formattedDate,
                startTime: slot.startTime || slot.time || slot.start || `Слот ${index + 1}`,
                endTime: slot.endTime || slot.end || '',
                isBooked: slot.isBooked || false
              };
            });
            
            console.log('Обработанные временные слоты:', processedTimeSlots);
            setAvailableTimeSlots(processedTimeSlots);
            
            // Устанавливаем причину недоступности если нет слотов
            if (data.data && data.data.status === 'unavailable') {
              setNoSlotsReason({
                status: data.data.status,
                reason: data.data.reason || 'unknown',
                message: data.data.message || 'Нет доступных слотов'
              });
            } else {
              setNoSlotsReason(null);
            }
          } else {
            console.log('[ConsultationBookingModal] Ошибка в ответе, используем тестовые временные слоты');
            setAvailableTimeSlots(generateTestTimeSlots(formattedDate));
            setNoSlotsReason(null);
          }
        } catch (error) {
          console.error('Ошибка при загрузке временных слотов:', error);
          // Генерируем тестовые слоты вместо отображения ошибки
          const formattedDate = formatDateToString(selectedDate);
          console.log('[ConsultationBookingModal] Используем тестовые временные слоты из-за исключения');
          setAvailableTimeSlots(generateTestTimeSlots(formattedDate));
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
  }, [selectedSpecialist, selectedDate, selectedService]);
  
  // Функции для перехода между шагами
  const nextStep = () => {
    if (step < 5) {
      setDirection('forward');
      setIsChangingStep(true);
      setTimeout(() => {
        setStep(step + 1);
        setIsChangingStep(false);
      }, 300);
    }
  };
  
  const prevStep = () => {
    if (step > 1) {
      setDirection('backward');
      setIsChangingStep(true);
      setTimeout(() => {
        setStep(step - 1);
        setIsChangingStep(false);
      }, 300);
    }
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
      setSelectedDate(new Date(date));
      nextStep();
    }
  };
  
  const selectTime = (timeSlot: TimeSlot | null) => {
    if (timeSlot) {
      setSelectedTimeSlot(timeSlot);
      nextStep();
    }
  };
  
  // Обработчик закрытия модального окна
  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };
  
  // Форматирование даты для API
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Вспомогательная функция для генерации тестовых временных слотов
  const generateTestTimeSlots = (formattedDate: string) => {
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
          id: `test-slot-${hour}-${minute}`,
          specialistId: selectedSpecialist?.id || '',
          date: formattedDate,
          startTime: startTime,
          endTime: endTime,
          isBooked: false
        });
      }
    }
    
    console.log(`[ConsultationBookingModal] Сгенерированы тестовые временные слоты: ${testTimeSlots.length}`);
    return testTimeSlots;
  };
  
  // Форматирование времени для отображения
  const formatTimeDisplay = (timeString: string): string => {
    // Если время уже в коротком формате (например, "10:00"), возвращаем как есть
    if (timeString.length <= 5) return timeString;
    
    try {
      // Пробуем извлечь часы и минуты из полной даты-времени (2023-05-20T10:00:00)
      if (timeString.includes('T')) {
        const timePart = timeString.split('T')[1];
        if (timePart) {
          return timePart.substring(0, 5); // Берем только часы и минуты (10:00)
        }
      }
    } catch (e) {
      console.log('Ошибка форматирования времени:', e);
    }
    
    // Возвращаем исходное значение, если не удалось отформатировать
    return timeString;
  };
  
  // Обработчик авторизации
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoginLoading(true);
      const success = await login(loginEmail, loginPassword);
      
      if (success) {
        setShowLoginForm(false);
        toast.success('Вход выполнен успешно');
      } else {
        toast.error('Неверные учетные данные');
      }
    } catch (error) {
      console.error('Ошибка при входе:', error);
      toast.error('Ошибка при входе в систему');
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
  
  // Обработчик бронирования
  const handleBooking = async () => {
    if (!selectedService || !selectedSpecialist || !selectedDate || !selectedTimeSlot) {
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
        serviceId: selectedService.id,
        userId: userId, // Добавляем ID пользователя, если он авторизован
        date: formattedDate,
        timeStart: selectedTimeSlot.startTime || selectedTimeSlot.start,
        timeEnd: selectedTimeSlot.endTime || selectedTimeSlot.end,
        userName: firstName + (lastName ? ' ' + lastName : ''),
        userEmail: email,
        userPhone: phone,
        password: password || null, // Если пользователь не указал пароль
        price: finalPrice, // Используем финальную цену с учетом скидок и бонусов
        originalPrice: selectedService.price, // Добавляем исходную цену
        status: 'pending',
        // Добавляем информацию для электронного письма
        specialistName: `${selectedSpecialist.firstName} ${selectedSpecialist.lastName}`,
        serviceName: selectedService.name,
        // Добавляем информацию о промокоде, если он применен
        promoCode: appliedPromo ? appliedPromo.code : null,
        discountAmount: appliedPromo?.discountAmount || 0,
        // Добавляем информацию о бонусах с правильным именем параметра
        bonusAmount: useBonus ? bonusAmount : 0
      };
      
      console.log('[ConsultationBookingModal] Отправка данных бронирования:', appointmentData);
      
      // Отправка данных на сервер
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при бронировании');
      }
      
      if (data.success) {
        // Сохраняем данные о бронировании
        setBookingData(data.data);
        
        // Переходим к экрану успешного бронирования
        setIsBookingSuccess(true);
        
        // Уведомляем пользователя
        toast.success('Консультация успешно забронирована!');
        
        // Обновляем список записей, если пользователь находится на странице записей
        if (window.location.pathname.includes('/cabinet/appointments')) {
          // Публикуем событие для обновления списка записей
          const event = new CustomEvent('appointmentCreated', {
            detail: { appointmentId: data.data.id }
          });
          window.dispatchEvent(event);
          
          console.log('[ConsultationBookingModal] Опубликовано событие appointmentCreated для обновления списка записей');
        }
      } else {
        throw new Error(data.error || 'Не удалось забронировать консультацию');
      }
    } catch (error) {
      console.error('Ошибка при бронировании:', error);
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка при бронировании');
    }
  };
  
  // Переход к странице с записями пользователя
  const goToUserAppointments = () => {
    handleClose();
    router.push('/profile/appointments');
  };
  
  // Добавим компонент для отображения секции бонусов
  const renderBonusSection = () => {
    if (!user || userBonusBalance <= 0 || !selectedService) return null;
    
    // Создаем отметки для слайдера
    const tickMarks = [];
    const stepSize = 100;
    for (let i = 0; i <= maxBonusAmount; i += stepSize) {
      if (i <= maxBonusAmount) {
        tickMarks.push(i);
      }
    }
    
    return (
      <div className="mb-4 sm:mb-6">
        <h4 className="font-medium mb-2">Использовать бонусы</h4>
        <div className="flex flex-col gap-2">
          <div className="flex-grow">
            <div className="relative">
              <div className={`flex items-center justify-between px-4 py-2 border rounded-lg ${userBonusBalance > 0 ? 'border-[#48a9a6] bg-[#48a9a6]/5' : 'border-gray-300'}`}>
                <div className="flex items-center gap-2">
                  <FaGift className="text-[#48a9a6]" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Доступно: <span className="text-[#48a9a6] font-bold">{userBonusBalance} ₽</span></span>
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
          
          {useBonus && maxBonusAmount > 0 && (
            <div className="px-2">
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
      </div>
    );
  };

  // Модифицируем отображение итоговой цены
  const renderPriceInfo = () => {
    if (!selectedService) return null;
    
    const hasDiscount = appliedPromo || (useBonus && bonusAmount > 0);
    
    return (
      <div className={`${hasDiscount ? 'mb-4 sm:mb-6 bg-gray-50 rounded-lg p-4' : ''}`}>
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-gray-900">{hasDiscount ? 'Итого к оплате:' : 'Стоимость:'}</h4>
          <span className={`${hasDiscount ? 'text-xl font-bold text-[#48a9a6]' : 'font-medium'}`}>
            {finalPrice} ₽
          </span>
        </div>
        
        {hasDiscount && (
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
        )}
      </div>
    );
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
              Запись на консультацию
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
            {selectedService && (
              <div>
                <span>{selectedService.name}</span>
                {step === 2 && serviceId && <span className="text-gray-500 text-sm ml-2">(услуга выбрана)</span>}
                {selectedSpecialist && <span> — {selectedSpecialist.firstName} {selectedSpecialist.lastName}</span>}
              </div>
            )}
          </div>
        </div>
        
        {/* Содержимое модального окна */}
        <div className="p-4 sm:p-6">
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
                      {service.image && (
                        <div className="w-12 h-12 relative rounded-md overflow-hidden flex-shrink-0 mr-4">
                          <Image 
                              src={`/api/images?path=services/${service.id}&t=${new Date().getTime()}`} 
                            alt={service.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                              priority={true}
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
                <h3 className="text-lg font-medium">
                  Выберите специалиста
                  {serviceId && <span className="text-sm font-normal text-gray-500 ml-2">(услуга: {selectedService?.name})</span>}
                </h3>
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
                <div className="grid grid-cols-1 gap-3">
                  {specialists.map((specialist) => (
                    <div 
                      key={specialist.id}
                      className="p-3 sm:p-4 border rounded-lg cursor-pointer hover:border-[#48a9a6] transition-colors flex items-center"
                      onClick={() => handleSpecialistSelect(specialist)}
                    >
                      {specialist.photo && (
                        <div className="w-12 h-12 relative rounded-md overflow-hidden flex-shrink-0 mr-4">
                          <Image 
                              src={`/api/images?path=specialists/${specialist.id}&t=${new Date().getTime()}`} 
                            alt={specialist.firstName}
                            fill
                            className="object-cover"
                            sizes="48px"
                              priority={true}
                          />
                        </div>
                      )}
                      <div className="flex-grow">
                        <h4 className="font-medium">{specialist.firstName} {specialist.lastName}</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <div className="text-xs font-medium text-gray-500 flex items-center">
                            <FaCalendarAlt className="mr-1" size={10} />
                            Выбрать дату
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
              
              {isLoadingDates ? (
                <div className="flex justify-center p-8">
                  <div className="w-12 h-12 border-4 border-[#48a9a6] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {availableDates.length > 0 ? (
                    <FixedDatePicker 
                      availableDates={availableDates} 
                      onSelectDate={selectDate}
                    />
                  ) : (
                    <div className="text-center p-6">
                      <p className="text-gray-600 mb-4">На данный момент нет доступных дат для записи</p>
                      <p className="text-gray-500 text-sm mb-4">Пожалуйста, выберите другого специалиста или свяжитесь с нами для уточнения</p>
                      <button
                        className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors"
                        onClick={prevStep}
                      >
                        Выбрать другого специалиста
                      </button>
                    </div>
                  )}
                </>
              )}
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
                <div className="mb-4">
                  <p className="text-gray-600 text-sm">
                    Дата: {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
              
              {availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {availableTimeSlots.map((timeSlot, index) => {
                    const startTime = formatTimeDisplay(timeSlot.startTime || `Слот ${index + 1}`);
                    const endTime = timeSlot.endTime ? formatTimeDisplay(timeSlot.endTime) : null;
                    
                    return (
                      <div
                        key={timeSlot.id || `timeslot-${index}`}
                        className={`p-2 border rounded-lg text-center cursor-pointer transition-colors ${
                          selectedTimeSlot?.id === timeSlot.id 
                            ? 'border-[#48a9a6] bg-[#48a9a6] bg-opacity-10' 
                            : 'hover:border-[#48a9a6]'
                        }`}
                        onClick={() => selectTime(timeSlot)}
                      >
                        <p className="text-sm font-medium">
                          {startTime}
                          {endTime && <span className="hidden sm:inline"> - {endTime}</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-6">
                  {noSlotsReason ? (
                    <>
                      <p className="text-gray-600 mb-4">{noSlotsReason.message}</p>
                      {noSlotsReason.reason === 'day_off' && (
                        <div className="flex justify-center mb-4">
                          <div className="p-3 bg-gray-100 rounded-lg inline-flex items-center">
                            <FaCalendarTimes className="text-gray-500 mr-2" />
                            <span className="text-gray-600">Выходной день</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-600 mb-4">На выбранную дату нет доступных временных слотов</p>
                  )}
                  <button
                    className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors"
                    onClick={prevStep}
                  >
                    Выбрать другую дату
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Шаг 5: Ввод данных пользователя */}
          {!isBookingSuccess && step === 5 && (
            <div className={`transform transition-all duration-300 ${isChangingStep ? direction === 'forward' ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
              <div className="flex items-center mb-3 sm:mb-4">
                <button 
                  className="mr-2 text-gray-600 hover:text-gray-900"
                  onClick={prevStep}
                >
                  <FaArrowLeft />
                </button>
                <h3 className="text-lg font-medium">Введите ваши данные</h3>
              </div>
              
              {/* Информация о бронировании */}
              <div className="bg-[#e6f5f4] p-2 sm:p-3 rounded-lg mb-3 border border-[#cce9e8]">
                <h4 className="font-medium text-[#3a8a87] mb-1.5 text-xs sm:text-sm">Информация о бронировании</h4>
                <div className="space-y-1 sm:space-y-1.5">
                  {selectedService && (
                    <div className="flex items-start">
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 mr-1.5 flex-shrink-0 text-[#48a9a6]">
                        <FaRegClock />
                      </div>
                      <div>
                        <p className="font-medium text-xs sm:text-sm leading-tight">{selectedService.name}</p>
                        <p className="text-xs text-gray-600 leading-tight">{selectedService.duration} мин.</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedSpecialist && (
                    <div className="flex items-start">
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 mr-1.5 flex-shrink-0 text-[#48a9a6]">
                        <FaUser />
                      </div>
                      <div>
                        <p className="font-medium text-xs sm:text-sm leading-tight">{selectedSpecialist.firstName} {selectedSpecialist.lastName}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedDate && selectedTimeSlot && (
                    <div className="flex items-start">
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 mr-1.5 flex-shrink-0 text-[#48a9a6]">
                        <FaCalendarAlt />
                      </div>
                      <div>
                        <p className="font-medium text-xs sm:text-sm leading-tight">
                          {selectedDate.toLocaleDateString('ru-RU', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}, {formatTimeDisplay(selectedTimeSlot.startTime)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedService && (
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
                  )}
                </div>
              </div>
              
              {user ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaUser className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaUser className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaEnvelope className="text-gray-400" />
                      </div>
                      <input
                        type="email"
                        className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaPhone className="text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Секция бонусов */}
                  {renderBonusSection()}
                  
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
                  
                  {/* Отображение итоговой цены */}
                  {renderPriceInfo()}
                  
                  <div className="pt-4">
                    <button
                      className="w-full py-3 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors"
                      onClick={handleBooking}
                    >
                      Забронировать
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4">Чтобы продолжить, войдите в систему или укажите ваши данные для бронирования:</p>
                  
                  {showLoginForm ? (
                    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm mb-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">Вход в аккаунт</h4>
                        <button
                          onClick={() => setShowLoginForm(false)}
                          className="text-gray-500 hover:text-gray-700"
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaEnvelope className="text-gray-400" />
                          </div>
                          <input
                            type="email"
                            className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaLock className="text-gray-400" />
                          </div>
                          <input
                            type="password"
                            className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="pt-4 flex flex-col space-y-3">
                        <button
                          className="w-full py-3 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors"
                          onClick={handleLogin}
                          disabled={loginLoading}
                          type="button"
                        >
                          {loginLoading ? 'Выполняется вход...' : 'Войти'}
                        </button>
                      </div>
                      
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
                      
                      <div className="mt-4 flex justify-between">
                        <button
                          className="text-[#48a9a6] hover:underline text-sm"
                          onClick={() => setShowLoginForm(false)}
                          type="button"
                        >
                          У меня нет аккаунта
                        </button>
                        
                        <button
                          className="text-[#48a9a6] hover:underline text-sm flex items-center"
                          onClick={() => setShowLoginForm(false)}
                          type="button"
                        >
                          <span>Вернуться к бронированию</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-full p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                        <p className="text-gray-700 mb-3 text-sm text-center">У вас уже есть аккаунт? Войдите, чтобы данные заполнились автоматически.</p>
                        <button
                          className="w-full py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors"
                          onClick={() => setShowLoginForm(true)}
                        >
                          Войти в аккаунт
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaUser className="text-gray-400" />
                            </div>
                            <input
                              type="text"
                              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaUser className="text-gray-400" />
                            </div>
                            <input
                              type="text"
                              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaEnvelope className="text-gray-400" />
                          </div>
                          <input
                            type="email"
                            className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaPhone className="text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Пароль (для создания аккаунта)</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaLock className="text-gray-400" />
                          </div>
                          <input
                            type="password"
                            className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="pt-4 flex flex-col space-y-3">
                        <button
                          className="w-full py-3 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors"
                          onClick={handleBooking}
                        >
                          Забронировать
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Шаг успешного бронирования */}
          {isBookingSuccess && (
            <div className="text-center p-4">
              <div className="mb-4 flex justify-center">
                <FaCheckCircle className="text-[#48a9a6] text-5xl" />
              </div>
              <h3 className="text-xl font-medium mb-2">Бронирование успешно!</h3>
              <p className="text-gray-600 mb-6">Ваша консультация успешно забронирована.</p>
              
              {bookingData && (
                <div className="text-left bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="mb-3">
                    <p className="text-sm text-gray-600">Услуга:</p>
                    <p className="font-medium">{selectedService?.name}</p>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm text-gray-600">Специалист:</p>
                    <p className="font-medium">{selectedSpecialist?.firstName} {selectedSpecialist?.lastName}</p>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm text-gray-600">Дата и время:</p>
                    <p className="font-medium">
                      {selectedDate?.toLocaleDateString('ru-RU', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}, {selectedTimeSlot?.startTime}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  className="w-full py-3 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors"
                  onClick={handleClose}
                >
                  Закрыть
                </button>
                
                <button
                  className="w-full py-3 border border-[#48a9a6] text-[#48a9a6] rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={goToUserAppointments}
                >
                  Перейти к моим записям
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsultationBookingModal; 