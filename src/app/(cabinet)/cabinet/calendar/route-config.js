// Конфигурация маршрута для календаря
export const dynamic = 'force-dynamic'; // Полностью динамический рендеринг
export const revalidate = 0;  // Перепроверка на каждый запрос
export const fetchCache = 'force-no-store'; // Отключаем кэширование
export const runtime = 'nodejs';  // Использовать Node.js для рендеринга

// Опция для отключения предварительной генерации страницы
export const generateStaticParams = () => [];

// Опция для принудительного использования клиентского рендеринга
export const unstable_skipMiddlewareUrlNormalize = true;

// Опции для кеширования
export const headers = () => {
  return [
    {
      source: '/cabinet/calendar',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, max-age=0',
        },
      ],
    },
  ];
}; 