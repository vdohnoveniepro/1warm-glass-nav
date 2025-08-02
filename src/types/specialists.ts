export interface Schedule {
  dayOfWeek: number; // 1-7 (понедельник = 1, ..., воскресенье = 7)
  startTime: string;
  endTime: string;
}

export interface Specialist {
  id: string;
  name: string;
  schedule?: Schedule[];
  // другие поля специалиста
} 