export interface WorkDay {
  day: number;  // 0-6, где 0 - воскресенье, 6 - суббота
  active: boolean;
  startTime: string;  // Формат "HH:MM"
  endTime: string;    // Формат "HH:MM"
  lunchBreaks: LunchBreak[];
}

export interface LunchBreak {
  id: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface Vacation {
  id: string;
  enabled: boolean;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface WorkSchedule {
  enabled: boolean;
  workDays: WorkDay[];
  vacations: Vacation[];
}

export interface TimeSlot {
  startTime: string;  // Формат "HH:MM"
  endTime: string;    // Формат "HH:MM"
  available: boolean;
}

export interface DaySchedule {
  date: string;       // Формат "YYYY-MM-DD"
  dayOfWeek: number;  // 0-6
  slots: TimeSlot[];
}

export interface AvailableTimeSlots {
  specialistId: string;
  scheduleData: DaySchedule[];
} 