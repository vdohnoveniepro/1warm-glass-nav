import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa';

interface ImprovedCalendarProps {
  availableDates: string[];
  onSelectDate: (date: Date) => void;
  isLoadingDates?: boolean;
  selectedDate?: Date | null;
}

const ImprovedCalendar: React.FC<ImprovedCalendarProps> = ({
  availableDates,
  onSelectDate,
  isLoadingDates = false,
  selectedDate = null,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Получить локализованное название месяца и год
  const getMonthYearLabel = (date: Date): string => {
    return date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
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
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const formattedDate = formatDateToString(date);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isPast = date < today;
    const isAvailable = availableDates.includes(formattedDate);
    
    if (isAvailable && !isPast) {
      onSelectDate(date);
      console.log('Выбрана дата:', formatDateToString(date), 'День недели:', date.getDay());
    }
  };

  // Построить массив дней для отображения календаря
  const buildCalendarDays = (): React.ReactNode => {
    // Массив для хранения всех элементов календаря
    const calendarItems: React.ReactNode[] = [];
    
    // Дни недели (сокращенные названия)
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    // Добавляем названия дней недели
    weekDays.forEach(day => {
      calendarItems.push(
        <div key={`header-${day}`} className="text-xs text-gray-500 font-medium py-1 text-center">
          {day}
        </div>
      );
    });
    
    // Вычисляем отступ для первого дня месяца
    const firstDayOffset = getFirstDayOffset(currentMonth);
    
    // Добавляем пустые ячейки для выравнивания
    for (let i = 0; i < firstDayOffset; i++) {
      calendarItems.push(
        <div key={`empty-${i}`} className="h-10 py-2"></div>
      );
    }
    
    // Получаем количество дней в текущем месяце
    const daysInMonth = getDaysInMonth(currentMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Добавляем дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const formattedDate = formatDateToString(date);
      
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today;
      const isAvailable = availableDates.includes(formattedDate);
      const isSelected = selectedDate ? date.toDateString() === selectedDate.toDateString() : false;
      
      // Определяем стили для ячейки календаря
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
      
      calendarItems.push(
        <button
          key={`day-${day}`}
          className={buttonClasses}
          onClick={() => handleDateClick(day)}
          disabled={!isAvailable || isPast}
          title={!isAvailable && !isPast ? "Нет свободного времени для записи" : ""}
        >
          <div className="text-sm">{day}</div>
          {!isAvailable && !isPast && !isToday && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center">
              <FaTimes className="text-gray-500 text-[8px]" />
            </div>
          )}
        </button>
      );
    }
    
    return calendarItems;
  };

  return (
    <div className="mb-6">
      {/* Заголовок с навигацией по месяцам */}
      <div className="flex justify-between items-center mb-2">
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
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {buildCalendarDays()}
        </div>
      )}
    </div>
  );
};

export default ImprovedCalendar; 