'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaMinus, FaSave } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';

interface WorkScheduleModalProps {
  specialistId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface WorkDay {
  day: number;
  active: boolean;
  startTime: string;
  endTime: string;
  lunchBreaks: LunchBreak[];
}

interface LunchBreak {
  id: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface Vacation {
  id: string;
  enabled: boolean;
  startDate: string;
  endDate: string;
  description?: string;
}

interface WorkSchedule {
  enabled: boolean;
  workDays: WorkDay[];
  vacations: Vacation[];
  bookingPeriodMonths: number; // Период доступности бронирования в месяцах
}

// Дни недели на русском, начиная с понедельника
const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
// Сокращения дней недели
const dayShortNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
// Соответствие между индексом в массиве dayNames и значением day в WorkDay
const dayMapping = [1, 2, 3, 4, 5, 6, 0]; // 0-воскресенье, 1-понедельник и т.д.

const WorkScheduleModal = ({ specialistId, isOpen, onClose }: WorkScheduleModalProps) => {
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>({
    enabled: true,
    workDays: Array(7).fill(null).map((_, index) => ({
      day: dayMapping[index],
      active: dayMapping[index] > 0 && dayMapping[index] < 6, // По умолчанию рабочие дни - будни (пн-пт)
      startTime: '09:00',
      endTime: '18:00',
      lunchBreaks: [
        {
          id: `${Date.now()}${index}`,
          enabled: true,
          startTime: '13:00',
          endTime: '14:00'
        }
      ]
    })),
    vacations: [],
    bookingPeriodMonths: 2 // По умолчанию 2 месяца
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'workdays' | 'vacation' | 'settings'>('workdays');
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && specialistId) {
      fetchWorkSchedule();
    }
  }, [isOpen, specialistId]);

  // Функция для получения отсортированных дней недели, начиная с понедельника
  const getSortedWorkDays = () => {
    // Создаем новый массив с правильным порядком дней
    const sortedDays = [...workSchedule.workDays].sort((a, b) => {
      // Преобразуем day в индекс в нашем массиве dayNames
      const indexA = dayMapping.indexOf(a.day);
      const indexB = dayMapping.indexOf(b.day);
      return indexA - indexB;
    });
    
    return sortedDays;
  };

  const fetchWorkSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/specialists/${specialistId}/schedule`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`Ошибка при загрузке графика работы: ${response.status} ${errorText}`);
        // Не выбрасываем ошибку, а просто продолжаем использовать график по умолчанию
        console.log('Используем график работы по умолчанию');
      } else {
        const data = await response.json();
        
        if (data.success && data.data) {
          setWorkSchedule(data.data);
        } else {
          console.log('Используем график работы по умолчанию');
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке графика работы:', error);
      // Не показываем уведомление об ошибке, так как используем график по умолчанию
      console.log('Используем график работы по умолчанию из-за ошибки');
    } finally {
      setLoading(false);
    }
  };

  const saveWorkSchedule = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/specialists/${specialistId}/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workSchedule),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось сохранить график работы');
      }
      
      toast.success('График работы успешно сохранен');
      
      // Обновляем специалиста в основном файле данных для синхронизации
      try {
        await fetch(`/api/specialists/${specialistId}/update-schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workSchedule }),
        });
      } catch (syncError) {
        console.error('Ошибка при синхронизации графика:', syncError);
        // Продолжаем выполнение, даже если синхронизация не удалась
      }

      // Обновляем страницу, чтобы отобразить изменения в календаре
      window.location.reload();
      
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении графика работы:', error);
      toast.error('Не удалось сохранить график работы');
    } finally {
      setSaving(false);
    }
  };

  const updateWorkDay = (index: number, field: keyof WorkDay, value: any) => {
    setWorkSchedule(prev => {
      const newWorkDays = [...prev.workDays];
      newWorkDays[index] = {
        ...newWorkDays[index],
        [field]: value
      };
      return { ...prev, workDays: newWorkDays };
    });
  };

  const updateLunchBreak = (dayIndex: number, breakIndex: number, field: keyof LunchBreak, value: any) => {
    setWorkSchedule(prev => {
      const newWorkDays = [...prev.workDays];
      const newBreaks = [...newWorkDays[dayIndex].lunchBreaks];
      newBreaks[breakIndex] = {
        ...newBreaks[breakIndex],
        [field]: value
      };
      newWorkDays[dayIndex] = {
        ...newWorkDays[dayIndex],
        lunchBreaks: newBreaks
      };
      return { ...prev, workDays: newWorkDays };
    });
  };

  const addLunchBreak = (dayIndex: number) => {
    setWorkSchedule(prev => {
      const newWorkDays = [...prev.workDays];
      newWorkDays[dayIndex] = {
        ...newWorkDays[dayIndex],
        lunchBreaks: [
          ...newWorkDays[dayIndex].lunchBreaks,
          {
            id: `${Date.now()}`,
            enabled: true,
            startTime: '13:00',
            endTime: '14:00'
          }
        ]
      };
      return { ...prev, workDays: newWorkDays };
    });
  };

  const removeLunchBreak = (dayIndex: number, breakIndex: number) => {
    setWorkSchedule(prev => {
      const newWorkDays = [...prev.workDays];
      const newBreaks = [...newWorkDays[dayIndex].lunchBreaks];
      newBreaks.splice(breakIndex, 1);
      newWorkDays[dayIndex] = {
        ...newWorkDays[dayIndex],
        lunchBreaks: newBreaks
      };
      return { ...prev, workDays: newWorkDays };
    });
  };

  const addVacation = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    setWorkSchedule(prev => ({
      ...prev,
      vacations: [
        ...prev.vacations,
        {
          id: `${Date.now()}`,
          enabled: true,
          startDate: formatDate(today),
          endDate: formatDate(tomorrow),
          description: 'Отпуск'
        }
      ]
    }));
  };

  const updateVacation = (index: number, field: keyof Vacation, value: any) => {
    setWorkSchedule(prev => {
      const newVacations = [...prev.vacations];
      newVacations[index] = {
        ...newVacations[index],
        [field]: value
      };
      return { ...prev, vacations: newVacations };
    });
  };

  const removeVacation = (index: number) => {
    setWorkSchedule(prev => {
      const newVacations = [...prev.vacations];
      newVacations.splice(index, 1);
      return { ...prev, vacations: newVacations };
    });
  };

  // Получаем отсортированные дни недели для отображения
  const sortedWorkDays = getSortedWorkDays();

  // Находим WorkDay по dayMapping[index]
  const findWorkDayIndex = (dayMappingIndex: number) => {
    return workSchedule.workDays.findIndex(day => day.day === dayMapping[dayMappingIndex]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Настройка графика работы</h2>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
            </div>
          ) : (
            <>
              <div className="flex mb-4 border-b">
                <button
                  className={`px-4 py-2 ${activeTab === 'workdays' ? 'border-b-2 border-[#48a9a6] text-[#48a9a6]' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('workdays')}
                >
                  Рабочие дни
                </button>
                <button
                  className={`px-4 py-2 ${activeTab === 'vacation' ? 'border-b-2 border-[#48a9a6] text-[#48a9a6]' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('vacation')}
                >
                  Отпуск
                </button>
                <button
                  className={`px-4 py-2 ${activeTab === 'settings' ? 'border-b-2 border-[#48a9a6] text-[#48a9a6]' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('settings')}
                >
                  Настройки
                </button>
              </div>
              
              {activeTab === 'workdays' && (
                <div>
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="schedule-enabled"
                      checked={workSchedule.enabled}
                      onChange={(e) => setWorkSchedule(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="mr-2"
                    />
                    <label htmlFor="schedule-enabled">График работы активен</label>
                  </div>

                  {/* Кнопки дней недели */}
                  <div className="mb-4">
                    <h3 className="font-medium mb-2">Рабочие дни</h3>
                    <div className="flex flex-wrap gap-2">
                      {dayNames.map((dayName, index) => {
                        const workDayIndex = findWorkDayIndex(index);
                        const isActive = workSchedule.workDays[workDayIndex]?.active;
                        
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setActiveDayIndex(activeDayIndex === index ? null : index)}
                            className={`px-4 py-2 rounded-md border transition-colors ${
                              activeDayIndex === index
                                ? 'bg-[#48a9a6] text-white border-[#48a9a6]'
                                : isActive
                                ? 'bg-[#48a9a6]/10 border-[#48a9a6]/30 text-[#48a9a6]'
                                : 'bg-gray-100 border-gray-200 text-gray-500'
                            }`}
                          >
                            {dayShortNames[index]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Настройки выбранного дня */}
                  {activeDayIndex !== null && (
                    <div className="border rounded-lg p-4 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">{dayNames[activeDayIndex]}</h3>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`day-active-${activeDayIndex}`}
                            checked={workSchedule.workDays[findWorkDayIndex(activeDayIndex)]?.active}
                            onChange={(e) => updateWorkDay(findWorkDayIndex(activeDayIndex), 'active', e.target.checked)}
                            className="mr-2"
                          />
                          <label htmlFor={`day-active-${activeDayIndex}`}>
                            {workSchedule.workDays[findWorkDayIndex(activeDayIndex)]?.active ? 'Рабочий день' : 'Выходной'}
                          </label>
                        </div>
                      </div>

                      {workSchedule.workDays[findWorkDayIndex(activeDayIndex)]?.active && (
                        <>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label htmlFor={`start-time-${activeDayIndex}`} className="block text-sm text-gray-600 mb-1">
                                Начало рабочего дня
                              </label>
                              <input
                                type="time"
                                id={`start-time-${activeDayIndex}`}
                                value={workSchedule.workDays[findWorkDayIndex(activeDayIndex)]?.startTime}
                                onChange={(e) => updateWorkDay(findWorkDayIndex(activeDayIndex), 'startTime', e.target.value)}
                                className="w-full p-2 border rounded"
                              />
                            </div>
                            <div>
                              <label htmlFor={`end-time-${activeDayIndex}`} className="block text-sm text-gray-600 mb-1">
                                Конец рабочего дня
                              </label>
                              <input
                                type="time"
                                id={`end-time-${activeDayIndex}`}
                                value={workSchedule.workDays[findWorkDayIndex(activeDayIndex)]?.endTime}
                                onChange={(e) => updateWorkDay(findWorkDayIndex(activeDayIndex), 'endTime', e.target.value)}
                                className="w-full p-2 border rounded"
                              />
                            </div>
                          </div>

                          <div className="mb-2">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium">Перерывы</h4>
                              <button
                                type="button"
                                onClick={() => addLunchBreak(findWorkDayIndex(activeDayIndex))}
                                className="text-sm flex items-center text-[#48a9a6] hover:text-[#48a9a6]/80"
                              >
                                <FaPlus className="mr-1" /> Добавить перерыв
                              </button>
                            </div>

                            {workSchedule.workDays[findWorkDayIndex(activeDayIndex)]?.lunchBreaks.map((breakTime, breakIndex) => (
                              <div key={breakTime.id} className="mb-4 p-3 border rounded bg-gray-50">
                                <div className="flex items-center mb-2">
                                  <input
                                    type="checkbox"
                                    id={`break-enabled-${activeDayIndex}-${breakIndex}`}
                                    checked={breakTime.enabled}
                                    onChange={(e) => updateLunchBreak(findWorkDayIndex(activeDayIndex), breakIndex, 'enabled', e.target.checked)}
                                    className="mr-2"
                                  />
                                  <label htmlFor={`break-enabled-${activeDayIndex}-${breakIndex}`} className="text-sm font-medium">
                                    Перерыв {breakIndex + 1}
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => removeLunchBreak(findWorkDayIndex(activeDayIndex), breakIndex)}
                                    className="ml-auto text-red-500 hover:text-red-700"
                                  >
                                    <FaMinus />
                                  </button>
                                </div>

                                {breakTime.enabled && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label htmlFor={`break-start-${activeDayIndex}-${breakIndex}`} className="block text-xs text-gray-600 mb-1">
                                        Начало перерыва
                                      </label>
                                      <input
                                        type="time"
                                        id={`break-start-${activeDayIndex}-${breakIndex}`}
                                        value={breakTime.startTime}
                                        onChange={(e) => updateLunchBreak(findWorkDayIndex(activeDayIndex), breakIndex, 'startTime', e.target.value)}
                                        className="w-full p-2 border rounded"
                                      />
                                    </div>
                                    <div>
                                      <label htmlFor={`break-end-${activeDayIndex}-${breakIndex}`} className="block text-xs text-gray-600 mb-1">
                                        Конец перерыва
                                      </label>
                                      <input
                                        type="time"
                                        id={`break-end-${activeDayIndex}-${breakIndex}`}
                                        value={breakTime.endTime}
                                        onChange={(e) => updateLunchBreak(findWorkDayIndex(activeDayIndex), breakIndex, 'endTime', e.target.value)}
                                        className="w-full p-2 border rounded"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'vacation' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Периоды отпуска</h3>
                    <button
                      type="button"
                      onClick={addVacation}
                      className="px-3 py-1.5 bg-[#48a9a6] text-white rounded flex items-center"
                    >
                      <FaPlus className="mr-1" /> Добавить отпуск
                    </button>
                  </div>

                  {workSchedule.vacations.length === 0 ? (
                    <p className="text-gray-500 italic">Нет запланированных отпусков</p>
                  ) : (
                    <div className="space-y-4">
                      {workSchedule.vacations.map((vacation, index) => (
                        <div key={vacation.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`vacation-enabled-${index}`}
                                checked={vacation.enabled}
                                onChange={(e) => updateVacation(index, 'enabled', e.target.checked)}
                                className="mr-2"
                              />
                              <label htmlFor={`vacation-enabled-${index}`} className="font-medium">
                                Отпуск {index + 1}
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVacation(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FaTimes />
                            </button>
                          </div>

                          {vacation.enabled && (
                            <>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <label htmlFor={`vacation-start-${index}`} className="block text-sm text-gray-600 mb-1">
                                    Дата начала
                                  </label>
                                  <input
                                    type="date"
                                    id={`vacation-start-${index}`}
                                    value={vacation.startDate}
                                    onChange={(e) => updateVacation(index, 'startDate', e.target.value)}
                                    className="w-full p-2 border rounded"
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`vacation-end-${index}`} className="block text-sm text-gray-600 mb-1">
                                    Дата окончания
                                  </label>
                                  <input
                                    type="date"
                                    id={`vacation-end-${index}`}
                                    value={vacation.endDate}
                                    onChange={(e) => updateVacation(index, 'endDate', e.target.value)}
                                    className="w-full p-2 border rounded"
                                  />
                                </div>
                              </div>
                              <div>
                                <label htmlFor={`vacation-desc-${index}`} className="block text-sm text-gray-600 mb-1">
                                  Описание (необязательно)
                                </label>
                                <input
                                  type="text"
                                  id={`vacation-desc-${index}`}
                                  value={vacation.description || ''}
                                  onChange={(e) => updateVacation(index, 'description', e.target.value)}
                                  placeholder="Например: Ежегодный отпуск"
                                  className="w-full p-2 border rounded"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Вкладка Настройки */}
              {activeTab === 'settings' && (
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">Настройки бронирования</h2>
                  
                  <div className="mb-4">
                    <label htmlFor="bookingPeriod" className="block text-sm font-medium text-gray-700 mb-1">
                      Период доступности бронирования
                    </label>
                    <select
                      id="bookingPeriod"
                      value={workSchedule.bookingPeriodMonths}
                      onChange={(e) => setWorkSchedule(prev => ({
                        ...prev,
                        bookingPeriodMonths: parseInt(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                    >
                      <option value={2}>2 месяца</option>
                      <option value={6}>6 месяцев</option>
                      <option value={12}>12 месяцев</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Определяет, на какой период вперед клиенты могут бронировать услуги
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-blue-700">
                      Настройка периода доступности бронирования влияет на то, насколько далеко вперед клиенты могут видеть и выбирать даты в календаре при записи на услуги.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex justify-end p-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 mr-2 border rounded text-gray-700 hover:bg-gray-100"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={saveWorkSchedule}
            disabled={saving || loading}
            className="px-4 py-2 bg-[#48a9a6] text-white rounded hover:bg-[#48a9a6]/90 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <>
                <span className="mr-2 inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Сохранение...
              </>
            ) : (
              <>
                <FaSave className="mr-2" /> Сохранить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkScheduleModal; 