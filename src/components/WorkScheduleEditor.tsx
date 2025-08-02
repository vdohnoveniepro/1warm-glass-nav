import React, { useState } from 'react';
import { FaClock, FaCalendarAlt, FaUtensils, FaPlane } from 'react-icons/fa';

export interface WorkDay {
  day: number;
  active: boolean;
  startTime: string;
  endTime: string;
}

export interface WorkSchedule {
  enabled: boolean;
  workDays: WorkDay[];
  lunchBreak: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  vacation: {
    enabled: boolean;
    startDate: string;
    endDate: string;
  };
}

interface WorkScheduleEditorProps {
  value: WorkSchedule;
  onChange: (value: WorkSchedule) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 0, label: 'Воскресенье' }
];

export default function WorkScheduleEditor({ value, onChange }: WorkScheduleEditorProps) {
  const [activeTab, setActiveTab] = useState<'workDays' | 'lunch' | 'vacation'>('workDays');
  
  // Инициализация рабочего расписания с дефолтными значениями, если не задано
  const initializeSchedule = () => {
    const defaultWorkDays = DAYS_OF_WEEK.map(day => ({
      day: day.value,
      active: [1, 2, 3, 4, 5].includes(day.value), // Пн-Пт активны по умолчанию
      startTime: '09:00',
      endTime: '18:00'
    }));
    
    const newSchedule: WorkSchedule = {
      enabled: true,
      workDays: defaultWorkDays,
      lunchBreak: {
        enabled: true,
        startTime: '13:00',
        endTime: '14:00'
      },
      vacation: {
        enabled: false,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    };
    
    onChange(newSchedule);
  };
  
  // Переключатель активности расписания
  const toggleScheduleEnabled = () => {
    if (!value.enabled && (!value.workDays || value.workDays.length === 0)) {
      // Если включаем расписание, а оно еще не инициализировано
      initializeSchedule();
    } else {
      onChange({ ...value, enabled: !value.enabled });
    }
  };
  
  // Обновление активности рабочего дня
  const updateDayActive = (dayNum: number, active: boolean) => {
    const updatedDays = value.workDays.map(day => 
      day.day === dayNum ? { ...day, active } : day
    );
    onChange({ ...value, workDays: updatedDays });
  };
  
  // Обновление времени начала рабочего дня
  const updateDayStartTime = (dayNum: number, startTime: string) => {
    const updatedDays = value.workDays.map(day => 
      day.day === dayNum ? { ...day, startTime } : day
    );
    onChange({ ...value, workDays: updatedDays });
  };
  
  // Обновление времени окончания рабочего дня
  const updateDayEndTime = (dayNum: number, endTime: string) => {
    const updatedDays = value.workDays.map(day => 
      day.day === dayNum ? { ...day, endTime } : day
    );
    onChange({ ...value, workDays: updatedDays });
  };
  
  // Обновление настроек обеденного перерыва
  const updateLunchBreak = (field: string, fieldValue: string | boolean) => {
    onChange({
      ...value,
      lunchBreak: {
        ...value.lunchBreak,
        [field]: fieldValue
      }
    });
  };
  
  // Обновление настроек отпуска
  const updateVacation = (field: string, fieldValue: string | boolean) => {
    onChange({
      ...value,
      vacation: {
        ...value.vacation,
        [field]: fieldValue
      }
    });
  };
  
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Заголовок и переключатель */}
      <div className="p-4 flex justify-between items-center border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 flex items-center">
          <FaClock className="mr-2 text-[#48a9a6]" />
          Рабочее расписание
        </h3>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={toggleScheduleEnabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#48a9a6]"></div>
        </label>
      </div>
      
      {value.enabled && (
        <>
          {/* Табы */}
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'workDays' ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]' : 'text-gray-500'}`}
              onClick={() => setActiveTab('workDays')}
            >
              <FaCalendarAlt className="inline-block mr-1 mb-1" /> Дни работы
            </button>
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'lunch' ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]' : 'text-gray-500'}`}
              onClick={() => setActiveTab('lunch')}
            >
              <FaUtensils className="inline-block mr-1 mb-1" /> Обед
            </button>
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'vacation' ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]' : 'text-gray-500'}`}
              onClick={() => setActiveTab('vacation')}
            >
              <FaPlane className="inline-block mr-1 mb-1" /> Отпуск
            </button>
          </div>
          
          {/* Содержимое табов */}
          <div className="p-4">
            {/* Таб "Дни работы" */}
            {activeTab === 'workDays' && (
              <div className="space-y-3">
                {DAYS_OF_WEEK.map(day => {
                  const workDay = value.workDays.find(wd => wd.day === day.value) || {
                    day: day.value, active: false, startTime: '09:00', endTime: '18:00'
                  };
                  
                  return (
                    <div key={day.value} className="flex items-center space-x-3">
                      <div className="w-32 flex items-center">
                        <input
                          type="checkbox"
                          id={`day-${day.value}`}
                          checked={workDay.active}
                          onChange={(e) => updateDayActive(day.value, e.target.checked)}
                          className="w-4 h-4 text-[#48a9a6] border-gray-300 rounded focus:ring-[#48a9a6]"
                        />
                        <label
                          htmlFor={`day-${day.value}`}
                          className={`ml-2 text-sm ${workDay.active ? 'font-medium text-gray-700' : 'text-gray-500'}`}
                        >
                          {day.label}
                        </label>
                      </div>
                      
                      {workDay.active && (
                        <div className="flex flex-1 space-x-2 items-center">
                          <input
                            type="time"
                            value={workDay.startTime}
                            onChange={(e) => updateDayStartTime(day.value, e.target.value)}
                            className="block w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="time"
                            value={workDay.endTime}
                            onChange={(e) => updateDayEndTime(day.value, e.target.value)}
                            className="block w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Таб "Обеденный перерыв" */}
            {activeTab === 'lunch' && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="lunch-enabled"
                    checked={value.lunchBreak.enabled}
                    onChange={(e) => updateLunchBreak('enabled', e.target.checked)}
                    className="w-4 h-4 text-[#48a9a6] border-gray-300 rounded focus:ring-[#48a9a6]"
                  />
                  <label
                    htmlFor="lunch-enabled"
                    className="ml-2 text-sm font-medium text-gray-700"
                  >
                    Обеденный перерыв
                  </label>
                </div>
                
                {value.lunchBreak.enabled && (
                  <div className="ml-6 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Начало</label>
                        <input
                          type="time"
                          value={value.lunchBreak.startTime}
                          onChange={(e) => updateLunchBreak('startTime', e.target.value)}
                          className="block w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Конец</label>
                        <input
                          type="time"
                          value={value.lunchBreak.endTime}
                          onChange={(e) => updateLunchBreak('endTime', e.target.value)}
                          className="block w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      В это время специалист будет недоступен для записи
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Таб "Отпуск" */}
            {activeTab === 'vacation' && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="vacation-enabled"
                    checked={value.vacation.enabled}
                    onChange={(e) => updateVacation('enabled', e.target.checked)}
                    className="w-4 h-4 text-[#48a9a6] border-gray-300 rounded focus:ring-[#48a9a6]"
                  />
                  <label
                    htmlFor="vacation-enabled"
                    className="ml-2 text-sm font-medium text-gray-700"
                  >
                    Отпуск/Отсутствие
                  </label>
                </div>
                
                {value.vacation.enabled && (
                  <div className="ml-6 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Дата начала</label>
                        <input
                          type="date"
                          value={value.vacation.startDate}
                          onChange={(e) => updateVacation('startDate', e.target.value)}
                          className="block w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Дата окончания</label>
                        <input
                          type="date"
                          value={value.vacation.endDate}
                          onChange={(e) => updateVacation('endDate', e.target.value)}
                          className="block w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      В этот период специалист будет недоступен для записи
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 