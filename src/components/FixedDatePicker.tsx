import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaTimes, FaClock } from 'react-icons/fa';
import { TimeSlot } from '@/models/types';
import { format, parse, addMonths, subMonths, differenceInDays, startOfMonth, getDay, endOfMonth, isToday as isTodayFn, parseISO, isBefore } from 'date-fns';
import { ru } from 'date-fns/locale';

interface FixedDatePickerProps {
  specialistId?: string;
  serviceId?: string;
  onSelect?: (date: string, timeSlot: TimeSlot | null) => void;
  selectedDate?: string | null;
  selectedTime?: TimeSlot | null;
  // Добавляем новые пропсы, которые используются в BookingModal
  availableDates?: string[];
  onSelectDate?: (date: string) => void;
  onSelectTime?: (timeSlot: TimeSlot) => void;
  isLoading?: boolean;
  loadingMessage?: string;
  timeSlots?: TimeSlot[];
  noTimeSlotsMessage?: string;
  showTimeSlots?: boolean;
}

const FixedDatePicker: React.FC<FixedDatePickerProps> = ({
  specialistId,
  serviceId,
  onSelect,
  selectedDate,
  selectedTime,
  // Новые пропсы
  availableDates: propAvailableDates,
  onSelectDate,
  onSelectTime,
  isLoading: propIsLoading,
  loadingMessage,
  timeSlots: propTimeSlots,
  noTimeSlotsMessage,
  showTimeSlots = true,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  
  const [availableDates, setAvailableDates] = useState<string[]>(propAvailableDates || []);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(propTimeSlots || []);
  const [isLoadingDates, setIsLoadingDates] = useState(propIsLoading || false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [noSlotsReason, setNoSlotsReason] = useState<string | null>(null);

  // Обновляем состояние, когда меняются пропсы
  useEffect(() => {
    if (propAvailableDates) {
      console.log('[FixedDatePicker] Обновление доступных дат из props:', propAvailableDates);
      setAvailableDates(propAvailableDates);
    }
    if (propTimeSlots) {
      setTimeSlots(propTimeSlots);
    }
    if (propIsLoading !== undefined) {
      setIsLoadingDates(propIsLoading);
    }
  }, [propAvailableDates, propTimeSlots, propIsLoading]);

  // Загружаем доступные даты при первой загрузке и при изменении месяца
  useEffect(() => {
    // Если предоставлены доступные даты через пропсы, не загружаем их
    if (propAvailableDates || !specialistId) return;
    
    const fetchAvailableDates = async () => {
      setIsLoadingDates(true);
      
      try {
        const today = new Date();
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        
        // Получаем настройки расписания специалиста, чтобы узнать период бронирования
        let bookingPeriodMonths = 3; // По умолчанию 3 месяца
        
        try {
          const scheduleResponse = await fetch(`/api/specialists/${specialistId}/schedule`);
          if (scheduleResponse.ok) {
            const scheduleData = await scheduleResponse.json();
            if (scheduleData.success && scheduleData.data && scheduleData.data.bookingPeriodMonths) {
              bookingPeriodMonths = scheduleData.data.bookingPeriodMonths;
              console.log(`[FixedDatePicker] Получен период бронирования: ${bookingPeriodMonths} месяцев`);
            }
          }
        } catch (error) {
          console.error('[FixedDatePicker] Ошибка при получении настроек расписания:', error);
          // Используем значение по умолчанию
        }
        
        // Вычисляем конечную дату на основе периода бронирования
        const endDate = new Date(today.getFullYear(), today.getMonth() + bookingPeriodMonths, 0);
        
        // Используем UTC строки для устранения проблем с часовыми поясами
        const formattedStartDate = formatDateToString(startDate);
        const formattedEndDate = formatDateToString(endDate);
        
        console.log(`[FixedDatePicker] Запрос доступных дат: от ${formattedStartDate} до ${formattedEndDate} (период: ${bookingPeriodMonths} месяцев)`);
        
        // Запрашиваем доступные даты
        const response = await fetch(
          `/api/specialists/${specialistId}/available-dates?startDate=${formattedStartDate}&endDate=${formattedEndDate}${serviceId ? `&serviceId=${serviceId}` : ''}`
        );
        
        const data = await response.json();
        
        if (data.success && data.data) {
          console.log(`[FixedDatePicker] Получено ${data.data.length} доступных дат`);
          
          // Временно сохраняем даты
          const initialAvailableDates = data.data;
          setAvailableDates(initialAvailableDates);
          
          // Проверяем каждую дату на отпуск (только если есть даты 28, 29, 30 апреля)
          // Это временное решение для исправления конкретной проблемы с отпуском
          const problematicDates: string[] = ['2025-04-28', '2025-04-29', '2025-04-30'];
          const datesToCheck: string[] = [];
          initialAvailableDates.forEach((dateString: string) => {
            if (problematicDates.includes(dateString)) {
              datesToCheck.push(dateString);
            }
          });
          
          if (datesToCheck.length > 0) {
            console.log(`[FixedDatePicker] Дополнительная проверка потенциально проблемных дат: ${datesToCheck.join(', ')}`);
            
            const unavailableDates: string[] = [];
            
            // Проверяем каждую дату, чтобы убедиться, что специалист не в отпуске
            datesToCheck.forEach(async (date: string) => {
              try {
                const timeSlotsResponse = await fetch(
                  `/api/timeslots?specialistId=${specialistId}&date=${date}&serviceDuration=30`
                );
                
                const timeSlotsData = await timeSlotsResponse.json();
                
                if (timeSlotsData.success && timeSlotsData.data) {
                  // Если есть признак отпуска или выходного дня
                  if (
                    timeSlotsData.data.status === 'unavailable' || 
                    (timeSlotsData.data.reason && 
                     (timeSlotsData.data.reason.includes('отпуске') || 
                      timeSlotsData.data.reason.includes('Выходной день')))
                  ) {
                    console.log(`[FixedDatePicker] Дата ${date} помечена как недоступная: ${timeSlotsData.data.reason}`);
                    unavailableDates.push(date);
                  }
                }
              } catch (error) {
                console.error(`[FixedDatePicker] Ошибка при проверке доступности даты ${date}:`, error);
              }
            });
            
            // Удаляем недоступные даты из списка доступных
            if (unavailableDates.length > 0) {
              console.log(`[FixedDatePicker] Удаляем недоступные даты: ${unavailableDates.join(', ')}`);
              setAvailableDates(prev => prev.filter(date => !unavailableDates.includes(date)));
            }
          }
        } else {
          console.error('[FixedDatePicker] Ошибка при получении доступных дат:', data.error);
          setAvailableDates([]);
        }
      } catch (error) {
        console.error('[FixedDatePicker] Ошибка при загрузке доступных дат:', error);
        setAvailableDates([]);
      } finally {
        setIsLoadingDates(false);
      }
    };
    
    fetchAvailableDates();
  }, [currentMonth, specialistId, serviceId, propAvailableDates]);

  // Загружаем доступные временные слоты при выборе даты
  useEffect(() => {
    // Если предоставлены временные слоты через пропсы, не загружаем их
    if (propTimeSlots || !specialistId || !selectedDate) return;
    
    const fetchTimeSlots = async () => {
      setIsLoadingSlots(true);
      setNoSlotsReason(null);
      
      try {
        console.log(`[FixedDatePicker] Запрос временных слотов для даты: ${selectedDate}`);
        
        // Проверяем, что дата выбрана
        if (!selectedDate) {
          console.warn('[FixedDatePicker] Не выбрана дата для загрузки временных слотов');
          setTimeSlots([]);
          setNoSlotsReason('Сначала выберите дату');
          setIsLoadingSlots(false);
          return;
        }
        
        // Проверяем, что указан ID специалиста
        if (!specialistId) {
          console.warn('[FixedDatePicker] Не указан ID специалиста для загрузки временных слотов');
          setTimeSlots([]);
          setNoSlotsReason('Не указан специалист');
          setIsLoadingSlots(false);
          return;
        }
        
        // Формируем URL запроса и логируем его
        const url = `/api/availability/time-slots?specialistId=${specialistId}&date=${selectedDate}${serviceId ? `&serviceId=${serviceId}` : ''}`;
        console.log(`[FixedDatePicker] Запрос к API: ${url}`);
        
        const response = await fetch(url);
        
        // Проверяем статус ответа
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Ошибка при чтении ответа');
          console.error(`[FixedDatePicker] Ошибка от сервера: ${response.status} ${errorText}`);
          setTimeSlots([]);
          setNoSlotsReason(`Ошибка сервера: ${response.status}`);
          setIsLoadingSlots(false);
          return;
        }
        
        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.error('[FixedDatePicker] Ошибка при парсинге JSON:', e);
          setTimeSlots([]);
          setNoSlotsReason('Ошибка при обработке ответа сервера');
          setIsLoadingSlots(false);
          return;
        }
        
        if (data.success && data.data) {
          console.log(`[FixedDatePicker] Ответ API:`, data.data);
          
          // Проверяем, доступен ли вообще специалист в этот день
          if (data.data.status === 'unavailable' && data.data.reason) {
            console.warn(`[FixedDatePicker] Специалист недоступен: ${data.data.reason}`);
            setNoSlotsReason(data.data.reason);
            setTimeSlots([]);
            
            // Если специалист в отпуске или это выходной день, удаляем эту дату из списка доступных
            if (data.data.reason.includes('отпуске') || data.data.reason.includes('Выходной день')) {
              console.log(`[FixedDatePicker] Удаляем недоступную дату ${selectedDate} из списка доступных`);
              
              // Удаляем из локального состояния availableDates текущую дату
              setAvailableDates(prev => prev.filter(date => date !== selectedDate));
              
              // Сбрасываем выбранную дату
              if (onSelectDate) {
                onSelectDate('');
              } else if (onSelect) {
                onSelect('', null);
              }
              
              // Если есть коллбэк для временных слотов
              if (onSelectTime && selectedTime) {
                onSelectTime({ start: '', end: '', isAvailable: false });
              }
            }
            
            setIsLoadingSlots(false);
            return;
          }
          
          // Проверяем, есть ли временные слоты
          if (data.data.timeSlots && data.data.timeSlots.length === 0) {
            console.warn('[FixedDatePicker] Для выбранной даты нет доступных временных слотов');
            
            // Проверяем, не находится ли дата в отпуске
            if (data.data.reason && (data.data.reason.includes('отпуске') || data.data.reason.includes('Выходной день'))) {
              console.log(`[FixedDatePicker] Дата ${selectedDate} недоступна: ${data.data.reason}, удаляем из доступных`);
              
              // Удаляем из локального состояния availableDates текущую дату
              setAvailableDates(prev => prev.filter(date => date !== selectedDate));
              
              // Сбрасываем выбранную дату
              if (onSelectDate) {
                onSelectDate('');
              } else if (onSelect) {
                onSelect('', null);
              }
            }
            
            // Запомним причину недоступности, если она есть в ответе
            if (data.data.reason) {
              setNoSlotsReason(data.data.reason);
            } else if (data.data.message) {
              setNoSlotsReason(data.data.message);
            } else {
              setNoSlotsReason('На эту дату нет доступного времени');
            }
          }
          
          // Устанавливаем слоты, даже если их 0, чтобы показать соответствующее сообщение
          setTimeSlots(data.data.timeSlots || []);
        } else {
          // Расширяем логи для отладки
          console.error('[FixedDatePicker] Ошибка при получении временных слотов:', 
            data.error || 'Неизвестная ошибка',
            'Полный ответ:', JSON.stringify(data)
          );
          setTimeSlots([]);
          setNoSlotsReason(data.error || 'Не удалось загрузить временные слоты');
        }
      } catch (error) {
        console.error('[FixedDatePicker] Ошибка при загрузке временных слотов:', error);
        setTimeSlots([]);
        setNoSlotsReason('Ошибка при загрузке временных слотов');
      } finally {
        setIsLoadingSlots(false);
      }
    };
    
    fetchTimeSlots();
  }, [selectedDate, specialistId, serviceId, propTimeSlots, onSelectDate, onSelectTime, onSelect, selectedTime]);

  // Получить локализованное название месяца и год
  const getMonthYearLabel = (date: Date): string => {
    return format(date, 'LLLL yyyy', { locale: ru }).charAt(0).toUpperCase() + format(date, 'LLLL yyyy', { locale: ru }).slice(1);
  };

  // Получить смещение дней для первого дня месяца (0 - понедельник, 6 - воскресенье)
  const getFirstDayOffset = (date: Date): number => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // day: 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
    const day = firstDay.getDay();
    // Преобразуем в формат 0 = понедельник, ..., 6 = воскресенье
    return day === 0 ? 6 : day - 1;
  };

  // Получить количество дней в месяце
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Перейти к предыдущему месяцу
  const goToPreviousMonth = (): void => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(prevMonth.getMonth() - 1);
      return newMonth;
    });
  };

  // Перейти к следующему месяцу
  const goToNextMonth = (): void => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(prevMonth.getMonth() + 1);
      return newMonth;
    });
  };

  // Форматировать дату в строку формата YYYY-MM-DD
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Обработка клика по дате
  const handleDateClick = (day: number): void => {
    // Создаем новую дату для выбранного дня, без изменения часового пояса
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Создаем новый объект даты, сохраняя локальное время
    const selectedDay = new Date(year, month, day);
    const formattedDate = formatDateToString(selectedDay);
    
    console.log('[FixedDatePicker] Клик по дате:', {
      day,
      selectedDay: selectedDay.toString(),
      formattedDate,
      dayOfWeek: selectedDay.getDay(), // 0 - воскресенье, 1 - понедельник, ..., 6 - суббота
      isAvailable: availableDates.includes(formattedDate)
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isPast = selectedDay < today;
    const isAvailable = availableDates.includes(formattedDate);
    
    if (isAvailable && !isPast) {
      console.log('[FixedDatePicker] Вызов onSelectDate/onSelect с датой:', formattedDate);
      // Используем onSelectDate, если он предоставлен, иначе onSelect
      if (onSelectDate) {
        onSelectDate(formattedDate);
      } else if (onSelect) {
        onSelect(formattedDate, null);
      }
    } else {
      console.log('[FixedDatePicker] Дата недоступна или в прошлом:', {
        isPast,
        isAvailable,
        formattedDate
      });
    }
  };

  // Обработка выбора временного слота
  const handleTimeSelect = (timeSlot: TimeSlot): void => {
    if (!selectedDate) return;
    
    console.log('[FixedDatePicker] Выбор временного слота:', {
      date: selectedDate,
      timeSlot
    });
    
    // Используем onSelectTime, если он предоставлен, иначе onSelect
    if (onSelectTime) {
      onSelectTime(timeSlot);
    } else if (onSelect) {
      onSelect(selectedDate, timeSlot);
    }
  };

  // Построить сетку календаря
  const renderCalendarGrid = () => {
    // Дни недели (сокращенные названия)
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Заголовки дней недели */}
        {weekDays.map(day => (
          <div key={`header-${day}`} className="text-xs text-gray-500 font-medium py-1 text-center">
            {day}
          </div>
        ))}
        
        {/* Пустые ячейки для выравнивания по дням недели */}
        {Array(getFirstDayOffset(currentMonth))
          .fill(null)
          .map((_, index) => (
            <div key={`empty-${index}`} className="h-10 py-2"></div>
          ))}
        
        {/* Дни месяца */}
        {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const formattedDate = formatDateToString(date);
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const isToday = date.toDateString() === today.toDateString();
          const isPast = date < today;
          const isAvailable = availableDates.includes(formattedDate);
          const isSelected = selectedDate === formattedDate;
          
          // Определяем стили ячейки
          let buttonClasses = 'h-10 py-1 rounded-lg border text-center relative ';
          
          if (isSelected) {
            buttonClasses += 'bg-[#48a9a6] text-white border-[#48a9a6]';
          } else if (isToday) {
            if (isAvailable) {
              buttonClasses += 'bg-[#48a9a6]/20 border-[#48a9a6] text-[#48a9a6] font-medium';
            } else {
              buttonClasses += 'bg-gray-100 border-gray-300 text-gray-400';
            }
          } else if (isPast) {
            buttonClasses += 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed';
          } else if (!isAvailable) {
            buttonClasses += 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed';
          } else {
            buttonClasses += 'border-gray-200 hover:border-[#48a9a6] text-gray-700';
          }
          
          return (
            <button
              key={`day-${day}`}
              onClick={() => handleDateClick(day)}
              disabled={isPast || !isAvailable}
              className={buttonClasses}
              title={!isAvailable && !isPast ? "Недоступно для записи" : ""}
            >
              {day}
              {!isAvailable && !isPast && !isToday && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center">
                  <FaTimes className="text-gray-500 text-[8px]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Отрисовка временных слотов
  const renderTimeSlots = () => {
    if (!selectedDate) return null;
    
    return (
      <div className="space-y-4 mt-6">
        <h3 className="font-medium text-gray-900">
          Доступное время
        </h3>
        
        {isLoadingSlots || (propIsLoading && !timeSlots.length) ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#48a9a6] border-t-transparent"></div>
            {loadingMessage && <p className="text-sm text-gray-500 mt-2">{loadingMessage}</p>}
          </div>
        ) : timeSlots.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {timeSlots.map((slot, index) => (
              <button
                key={index}
                onClick={() => handleTimeSelect(slot)}
                disabled={!slot.isAvailable}
                className={`
                  flex items-center justify-center px-4 py-2 rounded-lg
                  ${
                    (selectedTime?.start === slot.start)
                      ? 'bg-[#48a9a6] text-white'
                      : slot.isAvailable
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <FaClock className="mr-2" />
                <span>{slot.start}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-yellow-700">
              {noTimeSlotsMessage || noSlotsReason || 'Нет доступного времени на выбранную дату'}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Проверка даты на доступность в массиве availableDates
  const isDateAvailable = (date: Date): boolean => {
    if (!availableDates || !availableDates.length) {
      return false;
    }

    const dateString = format(date, 'yyyy-MM-dd');
    const datesToCheck: string[] = availableDates;
    
    for (const dateStr of datesToCheck) {
      if (dateStr === dateString) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg overflow-hidden">
        {/* Заголовок календаря с навигацией */}
        <div className="flex justify-between items-center mb-4 px-2 py-2">
          <label className="block text-sm font-medium text-gray-700">
            {getMonthYearLabel(currentMonth)}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <FaChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <FaChevronRight size={16} />
            </button>
          </div>
        </div>
        
        {/* Сетка календаря */}
        {isLoadingDates ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#48a9a6]"></div>
            {loadingMessage && <p className="text-sm text-gray-500 ml-2">{loadingMessage}</p>}
          </div>
        ) : (
          renderCalendarGrid()
        )}
      </div>
      
      {/* Временные слоты */}
      {showTimeSlots && renderTimeSlots()}
    </div>
  );
};

export default FixedDatePicker; 