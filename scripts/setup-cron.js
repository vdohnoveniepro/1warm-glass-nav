/**
 * Скрипт для настройки cron-задачи для автоматического обновления статуса записей
 * Используется в среде разработки или в продакшене при необходимости
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

// Генерация API ключа для cron-задачи (если он еще не существует)
const generateApiKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Проверка и создание .env файла с API ключом
const setupEnvFile = () => {
  const envPath = path.join(process.cwd(), '.env.local');
  
  // Проверяем существует ли файл
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Проверяем есть ли уже API ключ в файле
  if (!envContent.includes('CRON_API_KEY=')) {
    const apiKey = generateApiKey();
    const newEnvContent = envContent + `\n# API ключ для cron-задач\nCRON_API_KEY=${apiKey}\n`;
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log('✅ API ключ для cron-задачи добавлен в .env.local');
  } else {
    console.log('✅ API ключ для cron-задачи уже существует в .env.local');
  }
};

// Получение API ключа из .env файла
const getApiKey = () => {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/CRON_API_KEY=([^\s]+)/);
    
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

// Настройка cron-задачи в системе (Linux/macOS)
const setupCronJob = () => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error('❌ Не удалось получить API ключ из .env.local');
    return;
  }
  
  // Определяем URL для запроса в зависимости от окружения
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/cron/update-appointment-status`;
  
  // Создаем команду для cron
  const command = `0 * * * * curl -X GET "${apiUrl}" -H "Authorization: Bearer ${apiKey}" > /dev/null 2>&1`;
  
  // Получаем текущие cron-задачи
  exec('crontab -l', (error, stdout) => {
    let crontab = '';
    
    if (!error) {
      crontab = stdout;
    }
    
    // Проверяем, есть ли уже наша задача
    if (!crontab.includes(apiUrl)) {
      // Добавляем новую задачу
      const newCrontab = crontab + `\n# Автоматическое обновление статуса записей в системе Вдохновение\n${command}\n`;
      
      // Сохраняем временный файл с новыми задачами
      const tempFile = path.join(process.cwd(), 'temp-crontab');
      fs.writeFileSync(tempFile, newCrontab);
      
      // Устанавливаем новые задачи
      exec(`crontab ${tempFile}`, (err) => {
        // Удаляем временный файл
        fs.unlinkSync(tempFile);
        
        if (err) {
          console.error('❌ Ошибка при установке cron-задачи:', err);
        } else {
          console.log('✅ Cron-задача успешно установлена');
        }
      });
    } else {
      console.log('✅ Cron-задача уже существует');
    }
  });
};

// Проверка ОС
const checkOS = () => {
  const platform = process.platform;
  
  if (platform === 'win32') {
    console.log('⚠️ Windows обнаружена. Для Windows требуется установка Task Scheduler вручную.');
    console.log('Инструкция:');
    console.log('1. Запустите Task Scheduler (Планировщик заданий)');
    console.log('2. Создайте новую задачу, которая будет запускаться каждый час');
    console.log(`3. Команда: curl -X GET "${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/update-appointment-status" -H "Authorization: Bearer ${getApiKey()}"`);
    return false;
  }
  
  return true;
};

// Главная функция
const main = () => {
  console.log('🔄 Настройка автоматического обновления статуса записей...');
  
  // Настраиваем .env файл
  setupEnvFile();
  
  // Проверяем ОС и настраиваем cron, если это не Windows
  if (checkOS()) {
    setupCronJob();
  }
  
  console.log('\n📝 Для ручного запуска обновления статусов используйте команду:');
  console.log(`curl -X GET "${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/update-appointment-status" -H "Authorization: Bearer ${getApiKey()}"\n`);
};

// Запускаем скрипт
main(); 