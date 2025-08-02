import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaUser, FaEnvelope, FaPhone, FaComments, FaCalendarCheck } from 'react-icons/fa';
import DateTimePicker from './DateTimePicker';
import { toast } from '../ui/Toast';
import { useForm } from 'react-hook-form';

interface BookingFormProps {
  specialistId: string;
  specialistName: string;
  serviceId?: string;
  serviceName?: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

const BookingForm: React.FC<BookingFormProps> = ({
  specialistId,
  specialistName,
  serviceId,
  serviceName
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: string; end: string } | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      notes: ''
    }
  });

  // Загрузка данных о пользователе, если он авторизован
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.success && userData.data) {
            setUser(userData.data);
            setValue('name', `${userData.data.firstName} ${userData.data.lastName}`.trim());
            setValue('email', userData.data.email || '');
            setValue('phone', userData.data.phone || '');
          }
        }
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
      }
    };

    fetchUserData();
  }, [setValue]);

  // Загрузка данных об услуге, если указан serviceId
  useEffect(() => {
    if (!serviceId) return;

    const fetchServiceData = async () => {
      try {
        const response = await fetch(`/api/services/${serviceId}`);
        if (response.ok) {
          const serviceData = await response.json();
          if (serviceData.price) {
            setPrice(serviceData.price);
          }
        }
      } catch (error) {
        console.error('Ошибка при получении данных услуги:', error);
      }
    };

    fetchServiceData();
  }, [serviceId]);

  const handleDateTimeSelect = (date: Date, timeSlot: { start: string; end: string }) => {
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedDate || !selectedTimeSlot) {
      toast.error('Пожалуйста, выберите дату и время записи');
      return;
    }

    setIsSubmitting(true);

    try {
      // Форматируем дату для API
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const appointmentData = {
        specialistId,
        specialistName,
        serviceId: serviceId || null,
        serviceName: serviceName || 'Консультация',
        userId: user?.id || null,
        userName: data.name,
        userEmail: data.email,
        userPhone: data.phone,
        date: formattedDate,
        timeStart: selectedTimeSlot.start,
        timeEnd: selectedTimeSlot.end,
        price: price || 0,
        notes: data.notes,
        bonusAmount: 0
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Запись успешно создана! Мы свяжемся с вами для подтверждения.');
        
        // Если пользователь авторизован, перенаправляем его в личный кабинет
        if (user) {
          router.push('/cabinet/appointments');
        } else {
          // Иначе перенаправляем на страницу благодарности
          router.push('/booking/thank-you');
        }
      } else {
        throw new Error(result.error || 'Не удалось создать запись');
      }
    } catch (error) {
      console.error('Ошибка при создании записи:', error);
      toast.error('Произошла ошибка при создании записи. Пожалуйста, попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
        Запись на прием
      </h2>
      
      {/* Информация о специалисте и услуге */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
        <p className="font-medium text-gray-800 dark:text-white">
          Специалист: <span className="font-bold">{specialistName}</span>
        </p>
        {serviceName && (
          <p className="font-medium text-gray-800 dark:text-white">
            Услуга: <span className="font-bold">{serviceName}</span>
          </p>
        )}
        {price !== null && (
          <p className="font-medium text-gray-800 dark:text-white">
            Стоимость: <span className="font-bold">{price} ₽</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Выбор даты и времени */}
        <DateTimePicker
          specialistId={specialistId}
          serviceId={serviceId}
          onSelect={handleDateTimeSelect}
        />

        {/* Контактные данные */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FaUser className="inline mr-2" />
              Ваше имя
            </label>
            <input
              type="text"
              {...register('name', { required: 'Имя обязательно для заполнения' })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FaEnvelope className="inline mr-2" />
              Email
            </label>
            <input
              type="email"
              {...register('email', { 
                required: 'Email обязателен для заполнения',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Некорректный email адрес'
                }
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FaPhone className="inline mr-2" />
              Телефон
            </label>
            <input
              type="tel"
              {...register('phone', { 
                required: 'Телефон обязателен для заполнения',
                pattern: {
                  value: /^(\+7|8)[0-9]{10}$/,
                  message: 'Введите телефон в формате +79XXXXXXXXX или 89XXXXXXXXX'
                }
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="+79XXXXXXXXX"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FaComments className="inline mr-2" />
              Комментарий (необязательно)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Дополнительная информация или вопросы..."
            />
          </div>
        </div>

        {/* Кнопка отправки */}
        <button
          type="submit"
          disabled={isSubmitting || !selectedDate || !selectedTimeSlot}
          className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⟳</span> Отправка...
            </>
          ) : (
            <>
              <FaCalendarCheck className="mr-2" /> Записаться на прием
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default BookingForm; 