import React from 'react';
import { FaClock } from 'react-icons/fa';

interface TimeSlot {
  start: string;
  end: string;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
}) => {
  // Сортировка слотов по времени начала
  const sortedSlots = [...slots].sort((a, b) => 
    a.start.localeCompare(b.start)
  );

  // Форматирование времени для отображения (из "14:30" в "14:30")
  const formatTime = (time: string): string => {
    return time;
  };

  return (
    <div className="time-slot-picker">
      {sortedSlots.length === 0 ? (
        <div className="text-gray-500 text-center py-4">
          Нет доступных временных слотов
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sortedSlots.map((slot, index) => {
            const isSelected = 
              selectedSlot && 
              selectedSlot.start === slot.start && 
              selectedSlot.end === slot.end;
            
            return (
              <button
                key={`${slot.start}-${slot.end}-${index}`}
                className={`
                  py-2 px-3 rounded-lg text-xs font-medium transition-colors
                  flex flex-col items-center justify-center
                  ${isSelected 
                    ? 'bg-[#48a9a6] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-[#48a9a6]/10 hover:text-[#48a9a6]'}
                `}
                onClick={() => onSelectSlot(slot)}
              >
                <FaClock className="mb-1" />
                <span>{formatTime(slot.start)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimeSlotPicker; 