import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaCalendarAlt, FaClock, FaUser, FaGift, FaMoneyBillWave } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import FixedDatePicker from '../FixedDatePicker';
import LoadingSpinner from '../LoadingSpinner';
import { TimeSlot } from '@/models/types';
import { useAuth } from '@/lib/AuthContext';

interface BookingFormProps {
  specialistId: string;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
}

export default function BookingForm({ specialistId, serviceId, serviceName, servicePrice = 0 }: BookingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedTime, setSelectedTime] = useState<TimeSlot>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useBonus, setUseBonus] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [userBonusBalance, setUserBonusBalance] = useState(0);
  const [finalPrice, setFinalPrice] = useState(servicePrice);
  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);

  // Загрузка баланса бонусов пользователя
  useEffect(() => {
    const fetchBonusBalance = async () => {
      if (!user) return;
      
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
  }, [user]);

  // Обновление финальной цены при изменении бонусов
  useEffect(() => {
    let price = servicePrice - discountAmount;
    
    if (useBonus) {
      // Максимальное количество бонусов, которое можно использовать (не больше 50% от цены)
      const maxBonusAmount = Math.min(userBonusBalance, Math.floor(price * 0.5));
      setBonusAmount(maxBonusAmount);
      price = price - maxBonusAmount;
    } else {
      setBonusAmount(0);
    }
    
    setFinalPrice(Math.max(0, price));
  }, [useBonus, servicePrice, userBonusBalance, discountAmount]);

  const handleDateTimeSelect = (date: string, timeSlot: TimeSlot | null) => {
    setSelectedDate(date);
    if (timeSlot) {
      setSelectedTime(timeSlot);
    }
  };

  // Применение промокода
  const applyPromoCode = async () => {
    if (!promoCode.trim() || !serviceId) return;
    
    try {
      const response = await fetch(`/api/promos/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: promoCode,
          serviceId,
          price: servicePrice
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDiscountAmount(data.discountAmount);
        setPromoApplied(true);
        toast.success('Промокод успешно применен');
      } else {
        toast.error(data.message || 'Недействительный промокод');
      }
    } catch (error) {
      console.error('Ошибка при применении промокода:', error);
      toast.error('Ошибка при применении промокода');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast.error('Пожалуйста, выберите дату и время');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specialistId,
          serviceId,
          serviceName,
          date: selectedDate,
          timeStart: selectedTime.start,
          timeEnd: selectedTime.end,
          price: servicePrice,
          promoCode: promoApplied ? promoCode : undefined,
          discountAmount: discountAmount,
          bonusAmount: useBonus ? bonusAmount : 0,
          finalPrice: finalPrice
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Запись успешно создана');
        router.push('/cabinet/appointments');
      } else {
        toast.error(data.error || 'Произошла ошибка при создании записи');
      }
    } catch (error) {
      console.error('Ошибка при создании записи:', error);
      toast.error('Произошла ошибка при создании записи');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Запись на услугу {serviceName && `"${serviceName}"`}
        </h2>

        <div className="space-y-6">
          <FixedDatePicker
            specialistId={specialistId}
            serviceId={serviceId}
            onSelect={handleDateTimeSelect}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />

          {selectedDate && selectedTime && (
            <div className="space-y-4">
              <div className="bg-[#48a9a6]/10 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">
                  Подтверждение записи
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <FaCalendarAlt className="mr-2" />
                    <span>Дата: {format(parseISO(selectedDate), 'd MMMM yyyy', { locale: ru })}</span>
                  </div>
                  <div className="flex items-center">
                    <FaClock className="mr-2" />
                    <span>Время: {selectedTime.start} - {selectedTime.end}</span>
                  </div>
                  {servicePrice > 0 && (
                    <div className="flex items-center">
                      <FaMoneyBillWave className="mr-2" />
                      <span>Стоимость: {servicePrice} ₽</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Промокод и бонусы */}
              {servicePrice > 0 && serviceId && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Промокод */}
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">
                        Промокод
                      </h3>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          disabled={promoApplied}
                          placeholder="Введите промокод"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                        />
                        <button
                          type="button"
                          onClick={applyPromoCode}
                          disabled={promoApplied || !promoCode.trim()}
                          className={`px-4 py-2 rounded-md ${
                            promoApplied
                              ? 'bg-green-500 text-white'
                              : !promoCode.trim()
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-[#48a9a6] text-white hover:bg-[#3d908d]'
                          }`}
                        >
                          {promoApplied ? 'Применен' : 'Применить'}
                        </button>
                      </div>
                      {promoApplied && discountAmount > 0 && (
                        <div className="mt-2 text-sm text-green-600">
                          Скидка: {discountAmount} ₽
                        </div>
                      )}
                    </div>
                    
                    {/* Бонусы */}
                    {user && userBonusBalance > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 flex items-center">
                            <FaGift className="mr-2 text-[#48a9a6]" />
                            Использовать бонусы
                          </h3>
                          <div className="text-sm text-gray-500">
                            Доступно: {userBonusBalance} ₽
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useBonus}
                              onChange={() => setUseBonus(!useBonus)}
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#48a9a6]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#48a9a6]"></div>
                            <span className="ms-3 text-sm font-medium text-gray-900">
                              {useBonus ? 'Да' : 'Нет'}
                            </span>
                          </label>
                        </div>
                        
                        {useBonus && bonusAmount > 0 && (
                          <div className="mt-2 text-sm text-[#48a9a6]">
                            Будет списано: {bonusAmount} бонусов
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Итоговая стоимость */}
              {servicePrice > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-900">Итого к оплате:</h3>
                    <span className="text-xl font-bold text-[#48a9a6]">{finalPrice} ₽</span>
                  </div>
                  
                  {(discountAmount > 0 || bonusAmount > 0) && (
                    <div className="mt-2 text-sm text-gray-500">
                      <div className="flex justify-between">
                        <span>Стоимость услуги:</span>
                        <span>{servicePrice} ₽</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between">
                          <span>Скидка по промокоду:</span>
                          <span>-{discountAmount} ₽</span>
                        </div>
                      )}
                      {bonusAmount > 0 && (
                        <div className="flex justify-between">
                          <span>Списание бонусов:</span>
                          <span>-{bonusAmount} ₽</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !selectedDate || !selectedTime}
            className={`
              w-full py-3 px-4 rounded-lg text-white font-medium
              ${isSubmitting || !selectedDate || !selectedTime
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-[#48a9a6] hover:bg-[#3d908d]'
              }
            `}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="text-white" />
                <span className="ml-2">Создание записи...</span>
              </div>
            ) : (
              'Записаться'
            )}
          </button>
        </div>
      </div>
    </form>
  );
} 