const fs = require('fs');
const path = require('path');

// Параметры запроса (можно изменить на нужные)
// const specialistId = 'cca3b11c-f4b7-4268-acc7-f323e0579f1d'; // ID специалиста - Лилия Бакеева
const specialistId = '6f60fb81-335e-426c-94e2-53bc8f8417e9'; // ID специалиста - Дмитрий Бакеев
// const date = '2024-05-20'; // Понедельник
const date = '2024-05-21'; // Вторник
// const date = '2024-05-22'; // Среда
// const date = '2024-05-26'; // Воскресенье
const serviceDuration = 120; // Длительность услуги в минутах

// Путь к файлам
const specialistsFilePath = path.join(process.cwd(), 'public', 'data', 'specialists', 'specialists.json');
const appointmentsFilePath = path.join(process.cwd(), 'public', 'data', 'appointments', 'appointments.json');

// Функция для получения доступных временных слотов
async function getAvailableTimeSlots() {
  console.log(`Проверяем доступные временные слоты для специалиста ${specialistId} на дату ${date} (длительность: ${serviceDuration} мин)`);
  
  try {
    // Проверка существования файла специалистов
    if (!fs.existsSync(specialistsFilePath)) {
      console.error(`Файл специалистов не найден: ${specialistsFilePath}`);
      return;
    }
    
    // Чтение и парсинг файла специалистов
    const specialistsData = fs.readFileSync(specialistsFilePath, 'utf8');
    const specialists = JSON.parse(specialistsData);
    
    // Поиск нужного специалиста
    const specialist = specialists.find(s => s.id === specialistId);
    if (!specialist) {
      console.error(`Специалист с ID ${specialistId} не найден`);
      return;
    }
    
    console.log(`Найден специалист: ${specialist.firstName} ${specialist.lastName}`);
    
    // Проверка рабочего графика
    if (!specialist.workSchedule || !specialist.workSchedule.enabled) {
      console.log(`У специалиста не настроен или отключен рабочий график`);
      return;
    }
    
    // Получение дня недели
    const requestDate = new Date(date);
    const dayOfWeek = requestDate.getDay(); // 0 - воскресенье, 1 - понедельник, ...
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    
    console.log(`День недели: ${dayOfWeek} (${dayNames[dayOfWeek]})`);
    
    // Проверка, является ли этот день рабочим
    const workDay = specialist.workSchedule.workDays.find(day => day.day === dayOfWeek);
    if (!workDay || !workDay.active) {
      console.log(`У специалиста выходной день: ${dayNames[dayOfWeek]}`);
      return;
    }
    
    console.log(`Рабочее время: ${workDay.startTime} - ${workDay.endTime}`);
    
    // Проверка отпуска
    const isOnVacation = specialist.workSchedule.vacations.some(vacation => {
      if (!vacation.enabled) return false;
      
      const startDate = new Date(vacation.startDate);
      const endDate = new Date(vacation.endDate);
      
      // Сбрасываем время для корректного сравнения только дат
      const checkDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      checkDate.setHours(0, 0, 0, 0);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
    
    if (isOnVacation) {
      console.log(`Специалист в отпуске на дату ${date}`);
      return;
    }
    
    // Получение существующих записей
    let appointments = [];
    if (fs.existsSync(appointmentsFilePath)) {
      const appointmentsData = fs.readFileSync(appointmentsFilePath, 'utf8');
      appointments = JSON.parse(appointmentsData);
    }
    
    // Фильтрация записей для указанного специалиста и даты
    const appointmentsOnDate = appointments.filter(appointment => 
      appointment.specialistId === specialistId && 
      appointment.date === date &&
      (appointment.status === 'CONFIRMED' || appointment.status === 'PENDING')
    );
    
    console.log(`Найдено записей на эту дату: ${appointmentsOnDate.length}`);
    
    // Время работы
    const startHour = parseInt(workDay.startTime.split(':')[0]);
    const startMinute = parseInt(workDay.startTime.split(':')[1]);
    const endHour = parseInt(workDay.endTime.split(':')[0]);
    const endMinute = parseInt(workDay.endTime.split(':')[1]);
    
    // Создаем временные рамки рабочего дня
    const workStartTime = new Date(`${date}T${workDay.startTime}`);
    const workEndTime = new Date(`${date}T${workDay.endTime}`);
    
    // Получаем все перерывы для этого дня
    const lunchBreaks = workDay.lunchBreaks
      .filter(br => br.enabled)
      .map(br => ({
        start: new Date(`${date}T${br.startTime}`),
        end: new Date(`${date}T${br.endTime}`)
      }));
    
    if (lunchBreaks.length > 0) {
      console.log(`У специалиста ${lunchBreaks.length} перерыв(ов) в этот день:`);
      lunchBreaks.forEach((br, index) => {
        console.log(`  Перерыв ${index + 1}: ${br.start.toTimeString().slice(0, 5)} - ${br.end.toTimeString().slice(0, 5)}`);
      });
    }
    
    // Преобразуем существующие записи в формат с временными рамками
    const bookedSlots = appointmentsOnDate.map(appointment => ({
      start: new Date(`${date}T${appointment.startTime || appointment.timeStart}`),
      end: new Date(`${date}T${appointment.endTime || appointment.timeEnd}`),
    }));
    
    if (bookedSlots.length > 0) {
      console.log(`Забронированные слоты:`);
      bookedSlots.forEach((slot, index) => {
        console.log(`  Слот ${index + 1}: ${slot.start.toTimeString().slice(0, 5)} - ${slot.end.toTimeString().slice(0, 5)}`);
      });
    }
    
    // Создаем временные слоты с шагом 30 минут
    const slotStepMinutes = 30;
    const timeSlots = [];
    
    // Длительность слота в миллисекундах
    const slotDurationMs = serviceDuration * 60 * 1000;
    
    // Текущее время для итерации
    let currentTime = new Date(workStartTime);
    
    console.log(`\nГенерация временных слотов с длительностью ${serviceDuration} минут:`);
    
    // Перебираем все возможные временные слоты в рабочем дне
    while (currentTime.getTime() + slotDurationMs <= workEndTime.getTime()) {
      const slotStart = currentTime.toTimeString().substring(0, 5); // HH:MM
      
      const slotEndTime = new Date(currentTime.getTime() + slotDurationMs);
      const slotEnd = slotEndTime.toTimeString().substring(0, 5); // HH:MM
      
      // Проверяем, не попадает ли слот на перерыв
      let isInBreak = lunchBreaks.some(breakTime => {
        const result = (currentTime < breakTime.end && slotEndTime > breakTime.start) ||
          (currentTime <= breakTime.start && slotEndTime >= breakTime.end);
          
        if (result) {
          console.log(`  Слот ${slotStart}-${slotEnd} попадает на перерыв ${breakTime.start.toTimeString().slice(0, 5)}-${breakTime.end.toTimeString().slice(0, 5)}`);
        }
        
        return result;
      });
      
      if (isInBreak) {
        // Если слот попадает на перерыв, пропускаем его
        currentTime = new Date(currentTime.getTime() + slotStepMinutes * 60 * 1000);
        continue;
      }
      
      // Проверяем, свободен ли слот от существующих записей
      let isAvailable = !bookedSlots.some(bookedSlot => {
        const result = (currentTime < bookedSlot.end && slotEndTime > bookedSlot.start) ||
          (currentTime <= bookedSlot.start && slotEndTime >= bookedSlot.end);
          
        if (result) {
          console.log(`  Слот ${slotStart}-${slotEnd} пересекается с существующей записью ${bookedSlot.start.toTimeString().slice(0, 5)}-${bookedSlot.end.toTimeString().slice(0, 5)}`);
        }
        
        return result;
      });
      
      timeSlots.push({
        start: slotStart,
        end: slotEnd,
        isAvailable
      });
      
      // Переходим к следующему временному слоту
      currentTime = new Date(currentTime.getTime() + slotStepMinutes * 60 * 1000);
    }
    
    console.log(`\nДоступные временные слоты:`);
    const availableSlots = timeSlots.filter(slot => slot.isAvailable);
    
    if (availableSlots.length === 0) {
      console.log(`  Нет доступных временных слотов`);
    } else {
      availableSlots.forEach(slot => {
        console.log(`  ${slot.start} - ${slot.end}`);
      });
    }
    
    console.log(`\nВсего временных слотов: ${timeSlots.length}, из них доступно: ${availableSlots.length}`);
    
  } catch (error) {
    console.error('Ошибка при получении доступных временных слотов:', error);
  }
}

getAvailableTimeSlots(); 