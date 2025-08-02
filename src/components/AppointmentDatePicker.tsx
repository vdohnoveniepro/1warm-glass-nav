import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format, addDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-calendar/dist/Calendar.css';
import { FaClock } from 'react-icons/fa';

type TimeSlot = {
  start: string;
  end: string;
};

type CalendarValue = Date | Date[] | null;

interface AppointmentDatePickerProps {
  specialistId: string;
  serviceId?: string;
  onSelect: (date: string, timeSlot: TimeSlot | null) => void;
  selectedDate?: string;
  selectedTime?: TimeSlot;
}

export default function AppointmentDatePicker({
  specialistId,
  serviceId,
  onSelect,
  selectedDate,
  selectedTime,
}: AppointmentDatePickerProps) {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAvailableDates();
  }, [specialistId, serviceId]);

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailableDates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/availability/dates?specialistId=${specialistId}${
          serviceId ? `&serviceId=${serviceId}` : ''
        }`
      );
      const data = await response.json();
      if (data.success) {
        setAvailableDates(data.dates);
      }
    } catch (error) {
      console.error('Ошибка при загрузке доступных дат:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimeSlots = async (date: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/availability/time-slots?specialistId=${specialistId}&date=${date}${
          serviceId ? `&serviceId=${serviceId}` : ''
        }`
      );
      const data = await response.json();
      if (data.success) {
        setTimeSlots(data.timeSlots);
      }
    } catch (error) {
      console.error('Ошибка при загрузке временных слотов:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (value: any) => {
    if (value instanceof Date) {
      console.log('Выбранная дата (React Calendar):', value);
      console.log('День недели:', value.getDay(), '(0-вс, 1-пн, ..., 6-сб)');
      
      // Создаем новый объект Date, чтобы избежать проблем с часовым поясом
      const year = value.getFullYear();
      const month = value.getMonth();
      const day = value.getDate();
      const localDate = new Date(year, month, day);
      
      // Форматируем дату в YYYY-MM-DD
      const formattedDate = format(localDate, 'yyyy-MM-dd');
      console.log('Итоговая дата для API:', formattedDate);
      
      onSelect(formattedDate, null);
    }
  };

  const handleTimeSelect = (timeSlot: TimeSlot) => {
    onSelect(selectedDate!, timeSlot);
  };

  const tileDisabled = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const formattedDate = format(date, 'yyyy-MM-dd');
      return !availableDates.includes(formattedDate);
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg overflow-hidden">
        <Calendar
          onChange={handleDateChange}
          value={selectedDate ? new Date(selectedDate) : null}
          tileDisabled={tileDisabled}
          minDate={new Date()}
          locale="ru-RU"
          className="w-full border-none"
          calendarType="iso8601" // Используем ISO 8601, где понедельник - первый день недели
        />
      </div>

      {selectedDate && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">
            Доступное время
          </h3>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#48a9a6] border-t-transparent"></div>
            </div>
          ) : timeSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {timeSlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => handleTimeSelect(slot)}
                  className={`
                    flex items-center justify-center px-4 py-2 rounded-lg
                    ${
                      selectedTime?.start === slot.start
                        ? 'bg-[#48a9a6] text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }
                  `}
                >
                  <FaClock className="mr-2" />
                  <span>{slot.start}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Нет доступного времени на выбранную дату
            </p>
          )}
        </div>
      )}
    </div>
  );
}