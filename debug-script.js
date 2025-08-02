// Скрипт для проверки редиректов

console.log('Запуск скрипта для проверки редиректов...');

// URL для проверки
const urls = [
  '/cabinet',
  '/cabinet/profile',
  '/cabinet/settings'
];

// Прокси для перехвата fetch запросов
const originalFetch = global.fetch;
global.fetch = async function(url, options) {
  console.log(`Запрос: ${url}`);
  try {
    const response = await originalFetch(url, options);
    console.log(`Ответ: ${response.url}, Статус: ${response.status}`);
    
    if(response.redirected) {
      console.log(`Редирект: ${response.url}`);
    }
    
    return response;
  } catch (error) {
    console.error(`Ошибка при запросе ${url}:`, error);
    throw error;
  }
};

// Проверяем каждый URL
async function checkUrls() {
  for (const url of urls) {
    console.log(`\nПроверка URL: ${url}`);
    try {
      const response = await fetch(`http://localhost:3000${url}`);
      console.log(`Результат: ${response.url}, Статус: ${response.status}`);
    } catch (error) {
      console.error(`Ошибка при проверке ${url}:`, error);
    }
  }
}

checkUrls()
  .then(() => console.log('Проверка завершена.'))
  .catch(error => console.error('Ошибка:', error)); 