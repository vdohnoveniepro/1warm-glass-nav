const fs = require('fs');
const path = require('path');

// Путь к файлам
const specialistsFilePath = path.join(process.cwd(), 'public', 'data', 'specialists', 'specialists.json');

// Функция для проверки рабочих дней специалистов
async function validateSpecialistWorkdays() {
  console.log('Проверка рабочих дней специалистов...');
  
  try {
    // Проверка существования файла специалистов
    if (!fs.existsSync(specialistsFilePath)) {
      console.error(`Файл специалистов не найден: ${specialistsFilePath}`);
      return;
    }
    
    // Чтение и парсинг файла
    const data = fs.readFileSync(specialistsFilePath, 'utf8');
    const specialists = JSON.parse(data);
    
    console.log(`Найдено ${specialists.length} специалистов`);
    
    // Проверка каждого специалиста
    specialists.forEach(specialist => {
      console.log(`\nСпециалист: ${specialist.firstName} ${specialist.lastName}`);
      
      if (!specialist.workSchedule) {
        console.log(`  - Рабочий график не настроен`);
        return;
      }
      
      if (!specialist.workSchedule.enabled) {
        console.log(`  - Рабочий график отключен`);
        return;
      }
      
      // Проверка рабочих дней
      const workDays = specialist.workSchedule.workDays;
      if (!workDays || !Array.isArray(workDays)) {
        console.log(`  - Некорректный формат рабочих дней`);
        return;
      }
      
      const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      
      // Проверка каждого дня недели
      workDays.forEach(day => {
        const dayName = dayNames[day.day];
        const status = day.active ? 'Рабочий' : 'Выходной';
        console.log(`  - ${dayName}: ${status}`);
        
        if (day.active) {
          console.log(`    Время работы: ${day.startTime} - ${day.endTime}`);
          
          // Проверка перерывов
          if (day.lunchBreaks && Array.isArray(day.lunchBreaks)) {
            const enabledBreaks = day.lunchBreaks.filter(br => br.enabled);
            if (enabledBreaks.length > 0) {
              console.log(`    Перерывы (${enabledBreaks.length}):`);
              enabledBreaks.forEach(br => {
                console.log(`      ${br.startTime} - ${br.endTime}`);
                
                // Проверка, не занимает ли перерыв весь рабочий день
                const workStartHour = parseInt(day.startTime.split(':')[0]);
                const workStartMinute = parseInt(day.startTime.split(':')[1]);
                const workEndHour = parseInt(day.endTime.split(':')[0]);
                const workEndMinute = parseInt(day.endTime.split(':')[1]);
                
                const breakStartHour = parseInt(br.startTime.split(':')[0]);
                const breakStartMinute = parseInt(br.startTime.split(':')[1]);
                const breakEndHour = parseInt(br.endTime.split(':')[0]);
                const breakEndMinute = parseInt(br.endTime.split(':')[1]);
                
                const workStartMinutes = workStartHour * 60 + workStartMinute;
                const workEndMinutes = workEndHour * 60 + workEndMinute;
                const breakStartMinutes = breakStartHour * 60 + breakStartMinute;
                const breakEndMinutes = breakEndHour * 60 + breakEndMinute;
                
                const workDuration = workEndMinutes - workStartMinutes;
                const breakDuration = breakEndMinutes - breakStartMinutes;
                
                if (breakDuration >= workDuration) {
                  console.log(`      !!! ОШИБКА: Перерыв занимает весь рабочий день или больше`);
                }
                
                if (breakStartMinutes <= workStartMinutes && breakEndMinutes >= workEndMinutes) {
                  console.log(`      !!! ОШИБКА: Перерыв полностью перекрывает рабочий день`);
                }
              });
            } else {
              console.log(`    Перерывы: нет`);
            }
          }
        }
      });
      
      // Проверка отпусков
      const vacations = specialist.workSchedule.vacations;
      if (vacations && Array.isArray(vacations)) {
        const enabledVacations = vacations.filter(v => v.enabled);
        if (enabledVacations.length > 0) {
          console.log(`  - Отпуска (${enabledVacations.length}):`);
          enabledVacations.forEach(v => {
            console.log(`    ${v.startDate} - ${v.endDate}`);
          });
        } else {
          console.log(`  - Отпуска: нет`);
        }
      }
    });
    
    console.log('\nПроверка завершена');
    
  } catch (error) {
    console.error('Ошибка при проверке рабочих дней специалистов:', error);
  }
}

validateSpecialistWorkdays(); 