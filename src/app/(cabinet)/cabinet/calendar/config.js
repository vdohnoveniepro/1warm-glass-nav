// config.js для страницы календаря
// Эта конфигурация указывает Next.js отключить статический рендеринг
// и использовать только клиентский рендеринг для этой страницы

// Опция dynamic принудительно делает страницу динамической
export const dynamic = 'force-dynamic';

// Опция для отключения кэширования
export const fetchCache = 'force-no-store';

// Опция для отключения повторной валидации
export const revalidate = 0;

// Используем Node.js runtime для страницы
export const runtime = 'nodejs';

// Добавляем опцию, чтобы указать, что страница должна быть клиентской
export const generateStaticParams = () => [];

// Отключаем генерацию метаданных на сервере
export const generateMetadata = () => {
  return {
    title: 'Календарь - Vdohnovenie',
    description: 'Календарь записей для специалистов'
  };
}; 