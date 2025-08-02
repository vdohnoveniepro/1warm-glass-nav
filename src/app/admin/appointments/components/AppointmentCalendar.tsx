'use client';

import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaStickyNote } from 'react-icons/fa';
import { AppointmentStatus } from '@/models/types';

// Типы для компонента
interface Appointment {
  id: string;
  specialistId: string;
  serviceId: string;
  userId?: string;
  date: string;
  startTime: string;
  endTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  price: number;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  service?: {
    name: string;
  };
  specialist?: {
    firstName: string;
    lastName: string;
    photo: string;
  };
  notes?: string;
}

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
}

type CalendarView = 'month' | 'week' | 'day' | 'list';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  appointments: Appointment[];
}

interface AppointmentWithNotes extends Appointment {
  hasNotes?: boolean;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
  specialists: Specialist[];
  view: CalendarView;
  selectedSpecialistId: string | 'all';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAppointmentSelect: (appointment: Appointment) => void;
}

// Цвета статусов записей
const statusColors = {
  pending: 'bg-yellow-100 border-yellow-300',
  confirmed: 'bg-green-100 border-green-300',
  completed: 'bg-blue-100 border-blue-300',
  cancelled: 'bg-red-100 border-red-300',
  archived: 'bg-gray-100 border-gray-300',
};

// Функция для определения, является ли запись прошедшей
const isPastAppointment = (appointment: Appointment): boolean => {
  const now = new Date();
  const appointmentDate = new Date(`${appointment.date}T${appointment.endTime}`);
  return appointmentDate < now;
};

// Получение стиля для записи в зависимости от статуса и времени
const getAppointmentStyle = (appointment: Appointment): string => {
  // Базовый стиль по статусу
  const baseStyle = statusColors[appointment.status] || 'bg-gray-100 border-gray-300';
  
  // Если запись прошедшая, добавляем затемнение
  if (isPastAppointment(appointment)) {
    return `${baseStyle} opacity-50`;
  }
  
  return baseStyle;
};

const AppointmentCalendar = ({
  appointments,
  specialists,
  view,
  selectedSpecialistId,
  currentDate,
  onDateChange,
  onAppointmentSelect,
}: AppointmentCalendarProps) => {
  const [calendar, setCalendar] = useState<CalendarDay[][]>([]);
  const [weekDays, setWeekDays] = useState<CalendarDay[]>([]);
  const [dayHours, setDayHours] = useState<string[]>([]);
  const [appointmentsWithNotes, setAppointmentsWithNotes] = useState<Record<string, boolean>>({});
  const [notesLoading, setNotesLoading] = useState(false);

  // Отладочная информация при монтировании компонента
  useEffect(() => {
    console.log('[AppointmentCalendar] Компонент монтирован');
    console.log('[AppointmentCalendar] Appointments:', appointments);
    console.log('[AppointmentCalendar] Specialists:', specialists);
    console.log('[AppointmentCalendar] Selected Specialist ID:', selectedSpecialistId);
    console.log('[AppointmentCalendar] Current Date:', currentDate);
    console.log('[AppointmentCalendar] View:', view);
    
    // Загружаем информацию о заметках
    fetchNotesInfo();
  }, []);
  
  // Загрузка информации о заметках при изменении списка записей
  useEffect(() => {
    fetchNotesInfo();
  }, [appointments]);
  
  // Функция для загрузки информации о заметках
  const fetchNotesInfo = async () => {
    try {
      setNotesLoading(true);
      
      // Получаем список специалистов для запроса
      const specialistIds = selectedSpecialistId !== 'all' 
        ? [selectedSpecialistId]
        : [...new Set(appointments.map(a => a.specialistId))];
      
      // Если нет специалистов, выходим
      if (specialistIds.length === 0) {
        setNotesLoading(false);
        return;
      }
      
      // Загружаем информацию о заметках для каждого специалиста
      const notesMap: Record<string, boolean> = {};
      
      for (const specialistId of specialistIds) {
        const response = await fetch(`/api/admin/appointments/notes?specialistId=${specialistId}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.data) {
            // Обрабатываем полученные данные
            Object.keys(data.data).forEach(key => {
              // Ключ теперь содержит specialistId_clientId_serviceId
              const [specId, clientId, serviceId] = key.split('_');
              
              // Находим записи для этого специалиста, клиента и услуги
              const matchingAppointments = appointments.filter(a => 
                a.specialistId === specId && 
                (clientId ? a.userId === clientId : true) &&
                (serviceId ? a.serviceId === serviceId : true)
              );
              
              // Отмечаем записи как имеющие заметки
              matchingAppointments.forEach(appointment => {
                notesMap[appointment.id] = true;
              });
            });
          }
        }
      }
      
      setAppointmentsWithNotes(notesMap);
    } catch (error) {
      console.error('[AppointmentCalendar] Ошибка при загрузке информации о заметках:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  // Получаем название месяца и год
  const monthName = currentDate.toLocaleString('ru-RU', { month: 'long' });
  const year = currentDate.getFullYear();

  // Генерация календаря месяца
  useEffect(() => {
    if (view === 'month') {
      // Календарь месяца
      generateMonthCalendar();
    } else if (view === 'week') {
      // Календарь недели
      generateWeekCalendar();
    } else if (view === 'day') {
      // Часы дня
      generateDayHours();
    }
  }, [view, currentDate, appointments, selectedSpecialistId]);

  // Генерация календаря месяца
  const generateMonthCalendar = () => {
    console.log('[AppointmentCalendar] Генерация календаря месяца');
    
    // Получаем первый день месяца
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // Получаем последний день месяца
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Определяем начальную дату для отображения (предыдущий понедельник или первый день месяца)
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay() || 7; // Преобразуем 0 (воскресенье) в 7
    startDate.setDate(startDate.getDate() - dayOfWeek + 1); // Начинаем с понедельника
    
    console.log(`[AppointmentCalendar] Первый день месяца: ${firstDay.toISOString().split('T')[0]}`);
    console.log(`[AppointmentCalendar] Последний день месяца: ${lastDay.toISOString().split('T')[0]}`);
    console.log(`[AppointmentCalendar] Начальная дата календаря: ${startDate.toISOString().split('T')[0]}`);
    
    const weeks: CalendarDay[][] = [];
    let days: CalendarDay[] = [];
    
    // Создаем дни календаря на 6 недель вперед (максимальное отображение месяца)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Фильтрация записей для текущего дня
      const dayAppointments = filterAppointmentsForDay(date);
      
      // Добавляем день в массив
      days.push({
        date,
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        appointments: dayAppointments,
      });
      
      // Если собрали неделю, добавляем в массив недель
      if (days.length === 7) {
        weeks.push([...days]);
        days = [];
      }
    }
    
    console.log(`[AppointmentCalendar] Создано ${weeks.length} недель календаря`);
    
    // Проверяем, есть ли записи в календаре
    const totalAppointments = weeks.flat().reduce((sum, day) => sum + day.appointments.length, 0);
    console.log(`[AppointmentCalendar] Всего записей в календаре: ${totalAppointments}`);
    
    setCalendar(weeks);
  };

  // Генерация календаря недели
  const generateWeekCalendar = () => {
    const startOfWeek = new Date(currentDate);
    const day = currentDate.getDay() || 7; // Воскресенье в JS - 0, делаем его 7
    startOfWeek.setDate(currentDate.getDate() - day + 1); // Начинаем с понедельника
    
    const days: CalendarDay[] = [];
    
    // Создаем 7 дней недели
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      // Фильтрация записей для текущего дня
      const dayAppointments = filterAppointmentsForDay(date);
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        appointments: dayAppointments,
      });
    }
    
    setWeekDays(days);
    generateDayHours(); // Для отображения времени в недельном представлении
  };

  // Генерация часов дня
  const generateDayHours = () => {
    const hours = [];
    for (let i = 9; i < 18; i++) { // С 9:00 до 18:00
      hours.push(`${i.toString().padStart(2, '0')}:00`);
    }
    setDayHours(hours);
  };

  // Фильтрация записей для конкретного дня
  const filterAppointmentsForDay = (date: Date): Appointment[] => {
    // Форматируем дату календаря в строку YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Если нет записей, сразу возвращаем пустой массив
    if (!appointments || appointments.length === 0) {
      return [];
    }
    
    // Фильтруем записи для текущего дня
    const result = appointments.filter(appointment => {
      // Проверяем наличие даты
      if (!appointment.date) {
        return false;
      }
      
      // Извлекаем только дату (без времени) из записи
      const appointmentDateStr = String(appointment.date).split('T')[0];
      
      // Простое сравнение строк дат
      const dateMatches = appointmentDateStr === dateStr;
      
      // Проверка по специалисту (если выбран конкретный)
      if (dateMatches && selectedSpecialistId !== 'all' && appointment.specialistId !== selectedSpecialistId) {
        return false;
      }
      
      return dateMatches;
    });
    
    // Для отладки, если нашли записи на этот день
    if (result.length > 0) {
      console.log(`[AppointmentCalendar] Найдено ${result.length} записей на ${dateStr}:`, 
        result.map(a => ({ id: a.id, date: a.date, time: a.startTime }))
      );
    }
    
    return result;
  };

  // Переход к предыдущему месяцу/неделе/дню
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    }
    
    onDateChange(newDate);
  };

  // Переход к следующему месяцу/неделе/дню
  const handleNext = () => {
    const newDate = new Date(currentDate);
    
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    }
    
    onDateChange(newDate);
  };

  // Переход к текущей дате
  const handleToday = () => {
    onDateChange(new Date());
  };

  // Получение времени из строки часов и минут
  const getTimeFromString = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Вычисление позиции и высоты записи на основе времени
  const calculateAppointmentPosition = (startTime: string, endTime: string): { top: number, height: number } => {
    const dayStartMinutes = 9 * 60; // 9:00
    const startMinutes = getTimeFromString(startTime) - dayStartMinutes;
    const endMinutes = getTimeFromString(endTime) - dayStartMinutes;
    const totalDayMinutes = 9 * 60; // 9 часов (9:00 - 18:00)
    
    const top = (startMinutes / totalDayMinutes) * 100;
    const height = ((endMinutes - startMinutes) / totalDayMinutes) * 100;
    
    return { top, height };
  };

  // Отображение имени специалиста
  const getSpecialistName = (specialistId: string): string => {
    const specialist = specialists.find(s => s.id === specialistId);
    if (specialist) {
      return `${specialist.firstName} ${specialist.lastName}`;
    }
    return 'Специалист';
  };

  // Функция для извлечения имени клиента из поля notes
  const getClientNameFromNotes = (appointment: Appointment): string => {
    if (!appointment.notes) return "Клиент";
    
    try {
      const notesData = JSON.parse(appointment.notes);
      if (notesData.name) {
        const nameParts = notesData.name.split(' ');
        if (nameParts.length > 0) {
          return `${nameParts[0]} ${nameParts[1]?.charAt(0) || ''}.`;
        }
      }
      return "Клиент";
    } catch (e) {
      console.error('[AppointmentCalendar] Ошибка при разборе notes:', e);
      return "Клиент";
    }
  };

  // Рендеринг календаря месяца
  const renderMonthCalendar = () => {
    console.log('[AppointmentCalendar] Рендеринг календаря месяца');
    console.log('[AppointmentCalendar] Календарь:', calendar);
    
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-7 gap-px border-b">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => (
            <div key={index} className="p-2 text-center font-medium">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {calendar.flat().map((day, index) => {
            const isToday = day.date.toDateString() === new Date().toDateString();
            
            // Отладка - выводим информацию о записях в этот день
            if (day.appointments.length > 0) {
              console.log(`[AppointmentCalendar] День ${day.date.toISOString().split('T')[0]} имеет ${day.appointments.length} записей:`, 
                day.appointments.map(a => ({ id: a.id, date: a.date, time: a.startTime }))
              );
            }
            
            return (
              <div 
                key={index} 
                className={`min-h-24 p-1 border-b border-r ${
                  day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                }`}
              >
                <div className={`text-right p-1 ${
                  isToday ? 'bg-[#48a9a6] text-white font-bold rounded-full w-8 h-8 flex items-center justify-center ml-auto' : ''
                }`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {day.appointments.length > 0 ? (
                    <>
                      {day.appointments.slice(0, 3).map(appointment => {
                        // Получаем имя и инициал фамилии клиента, либо запасное значение, если данных нет
                        const clientName = appointment.firstName 
                          ? `${appointment.firstName} ${appointment.lastName?.charAt(0) || ''}.` 
                          : getClientNameFromNotes(appointment);
                          
                        // Определяем стиль записи
                        const appointmentStyle = getAppointmentStyle(appointment);
                        
                        return (
                          <div
                            key={appointment.id}
                            className={`px-1 py-0.5 text-xs rounded border ${appointmentStyle} cursor-pointer`}
                            onClick={() => onAppointmentSelect(appointment)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium truncate">{clientName}</span>
                            </div>
                            <div className="text-xs opacity-75">{appointment.startTime}</div>
                          </div>
                        );
                      })}
                      {day.appointments.length > 3 && (
                        <div className="text-xs text-center text-gray-500">
                          + еще {day.appointments.length - 3}
                        </div>
                      )}
                    </>
                  ) : day.isCurrentMonth ? (
                    <div className="text-xs text-center text-gray-300 py-1">Нет записей</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Рендеринг календаря недели
  const renderWeekCalendar = () => {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-8 gap-px border-b">
          <div className="p-2"></div>
          {weekDays.map((day, index) => {
            const isToday = day.date.toDateString() === new Date().toDateString();
            return (
              <div 
                key={index} 
                className="p-2 text-center"
              >
                <div>{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][index]}</div>
                <div className={`${
                  isToday 
                    ? 'bg-[#48a9a6] text-white font-bold rounded-full w-8 h-8 flex items-center justify-center mx-auto' 
                    : ''
                }`}>
                  {day.date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-8 gap-px">
          {dayHours.map((hour, hourIndex) => (
            <React.Fragment key={hourIndex}>
              <div className="p-2 text-center text-sm text-gray-500 border-r">
                {hour}
              </div>
              {weekDays.map((day, dayIndex) => (
                <div 
                  key={`${hourIndex}-${dayIndex}`} 
                  className="h-16 border-b border-r relative"
                >
                  {day.appointments
                    .filter(appointment => {
                      const startHour = appointment.startTime.split(':')[0];
                      return startHour === hour.split(':')[0];
                    })
                    .map(appointment => {
                      const { top, height } = calculateAppointmentPosition(
                        appointment.startTime,
                        appointment.endTime
                      );
                      
                      // Определяем стиль записи
                      const appointmentStyle = getAppointmentStyle(appointment);
                      const baseClass = `absolute left-0 right-0 mx-1 px-1 py-0.5 text-xs overflow-hidden rounded border cursor-pointer`;
                      
                      return (
                        <div
                          key={appointment.id}
                          className={`${baseClass} ${appointmentStyle}`}
                          style={{ top: '0%', height: '95%' }}
                          onClick={() => onAppointmentSelect(appointment)}
                        >
                          <div className="font-semibold truncate">
                            {appointment.startTime} - {appointment.endTime}
                          </div>
                          <div className="truncate">
                            {appointment.firstName} {appointment.lastName}
                          </div>
                          {appointment.service?.name && (
                            <div className="truncate text-gray-600">
                              {appointment.service.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // Рендеринг календаря дня
  const renderDayCalendar = () => {
    // Фильтруем записи для выбранной даты
    const dayAppointments = filterAppointmentsForDay(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();
    
    return (
      <div className="bg-white rounded-lg shadow">
        <div className={`p-4 border-b ${isToday ? 'bg-[#48a9a6] text-white' : ''}`}>
          <h3 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            {isToday && <span className="ml-2 text-sm bg-white text-[#48a9a6] px-2 py-0.5 rounded-full">Сегодня</span>}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
          <div className="space-y-4">
            <h4 className="font-medium">Расписание дня</h4>
            <div className="space-y-2">
              {dayHours.map((hour, index) => (
                <div key={index} className="flex">
                  <div className="w-16 text-right pr-4 text-gray-500">
                    {hour}
                  </div>
                  <div className="flex-1 h-12 border-l border-b relative">
                    {dayAppointments
                      .filter(appointment => {
                        const startHour = appointment.startTime.split(':')[0];
                        return startHour === hour.split(':')[0];
                      })
                      .map(appointment => {
                        const { top, height } = calculateAppointmentPosition(
                          appointment.startTime,
                          appointment.endTime
                        );
                        
                        // Определяем стиль записи
                        const appointmentStyle = getAppointmentStyle(appointment);
                        
                        return (
                          <div
                            key={appointment.id}
                            className={`absolute left-0 right-0 ml-2 px-2 py-1 rounded border cursor-pointer ${appointmentStyle}`}
                            style={{ top: '0%', height: '95%' }}
                            onClick={() => onAppointmentSelect(appointment)}
                          >
                            <div className="font-semibold">
                              {appointment.startTime} - {appointment.endTime}
                            </div>
                            <div>
                              {appointment.firstName} {appointment.lastName}
                            </div>
                            {appointment.service?.name && (
                              <div className="text-gray-600">
                                {appointment.service.name}
                              </div>
                            )}
                            <div className="text-gray-600">
                              {getSpecialistName(appointment.specialistId)}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-4">Записи на сегодня</h4>
            {dayAppointments.length === 0 ? (
              <div className="text-gray-500">Нет записей на этот день</div>
            ) : (
              <div className="space-y-3">
                {dayAppointments.map(appointment => {
                  // Определяем стиль записи
                  const appointmentStyle = getAppointmentStyle(appointment);
                  
                  return (
                    <div
                      key={appointment.id}
                      className={`p-3 rounded border cursor-pointer ${appointmentStyle}`}
                      onClick={() => onAppointmentSelect(appointment)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">
                            {appointment.startTime} - {appointment.endTime}
                          </div>
                          <div>
                            {appointment.firstName} {appointment.lastName}
                          </div>
                          {appointment.service?.name && (
                            <div className="text-gray-600">
                              {appointment.service.name}
                            </div>
                          )}
                          <div className="text-gray-600">
                            {getSpecialistName(appointment.specialistId)}
                          </div>
                        </div>
                        <div className="text-xs px-2 py-1 bg-white rounded">
                          {appointment.status === 'pending' && 'Ожидает'}
                          {appointment.status === 'confirmed' && 'Подтверждено'}
                          {appointment.status === 'completed' && 'Завершено'}
                          {appointment.status === 'cancelled' && 'Отменено'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Навигация по календарю
  const renderNavigation = () => {
    return (
      <div className="mb-4 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={handlePrevious}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={handleToday}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            Сегодня
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <FaChevronRight />
          </button>
        </div>
        <h2 className="text-xl font-semibold">
          {view === 'month' && `${monthName} ${year}`}
          {view === 'week' && `${weekDays[0]?.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} - ${weekDays[6]?.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`}
          {view === 'day' && currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </h2>
      </div>
    );
  };

  return (
    <div>
      {renderNavigation()}
      
      {view === 'month' && renderMonthCalendar()}
      {view === 'week' && renderWeekCalendar()}
      {view === 'day' && renderDayCalendar()}
    </div>
  );
};

export default AppointmentCalendar; 