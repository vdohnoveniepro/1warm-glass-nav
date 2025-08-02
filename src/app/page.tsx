import Image from "next/image";
import Link from "next/link";
import { FaArrowRight, FaStore } from 'react-icons/fa';
import { IoNewspaperOutline, IoPersonCircleOutline } from 'react-icons/io5';
import { RiServiceLine } from 'react-icons/ri';
import { MdEvent } from 'react-icons/md';
import { getSettings } from "@/lib/settings";
import fs from 'fs';
import path from 'path';
import HomeReviewsButton from "@/components/HomeReviewsButton";
import HomePageClient from "./page-client";

// Отключаем кэширование для этой страницы
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Интерфейс для товаров
interface ProductItem {
  id: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  enabled: boolean;
}

// Интерфейс для кнопки магазина
interface ShopButton {
  id: string;
  enabled: boolean;
  buttonText: string;
  buttonUrl: string;
  buttonImage: string;
  showProducts: boolean;
  products: ProductItem[];
}

// Интерфейс для настроек магазина
interface ShopSettings {
  buttons: ShopButton[];
}

// Функция для чтения настроек из файла
async function getShopSettingsFromFile() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'shop_settings.json');
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('Ошибка при чтении настроек из файла:', error);
  }
  return null;
}

// Функция для чтения настроек напрямую из БД
async function getShopSettingsFromDB() {
  try {
    const { db } = await import('@/lib/db');
    const stmt = db.prepare('SELECT value FROM settings WHERE name = ?');
    const result = stmt.get('shop_settings');
    
    if (result && typeof result === 'object' && 'value' in result) {
      const valueStr = result.value as string;
      return JSON.parse(valueStr);
    }
  } catch (error) {
    console.error('Ошибка при чтении настроек из БД:', error);
  }
  return null;
}

// Функция для определения класса сетки в зависимости от количества товаров
function getProductGridClass(count: number): string {
  // На мобильных устройствах всегда показываем максимум 2 товара в ряд
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3 md:grid-cols-3 max-sm:grid-cols-2',
    4: 'grid-cols-4 md:grid-cols-4 max-sm:grid-cols-2'
  };
  
  return gridClasses[count as 1|2|3|4] || 'grid-cols-4 max-sm:grid-cols-2';
}

export default async function Home() {
  // Получаем настройки магазина несколькими способами
  let shopSettings: ShopSettings = {
    buttons: []
  };
  
  // Значения по умолчанию
  const defaultButton: ShopButton = {
    id: 'default',
    enabled: false,
    buttonText: 'Магазин',
    buttonUrl: 'https://www.wildberries.ru/',
    buttonImage: '/images/shop.jpg',
    showProducts: false,
    products: []
  };
  
  // Способ 1: Через getSettings
  try {
    const settings = await getSettings();
    console.log('Настройки через getSettings:', settings);
    
    if (settings?.shop_settings) {
      // Проверяем, в новом ли формате настройки
      if (Array.isArray(settings.shop_settings.buttons)) {
        // Новый формат
        shopSettings = settings.shop_settings;
      } else {
        // Старый формат - преобразуем
        shopSettings = {
          buttons: [{
            id: 'legacy',
            enabled: settings.shop_settings.enabled || false,
            buttonText: settings.shop_settings.buttonText || 'Магазин',
            buttonUrl: settings.shop_settings.buttonUrl || 'https://www.wildberries.ru/',
            buttonImage: settings.shop_settings.buttonImage || '/images/shop.jpg',
            showProducts: settings.shop_settings.showProducts || false,
            products: settings.shop_settings.products || []
          }]
        };
      }
      
      console.log('Настройки магазина через getSettings:', shopSettings);
    }
  } catch (error) {
    console.error('Ошибка при получении настроек через getSettings:', error);
  }
  
  // Способ 2: Напрямую из БД
  try {
    const dbSettings = await getShopSettingsFromDB();
    if (dbSettings) {
      // Проверяем, в новом ли формате настройки
      if (Array.isArray(dbSettings.buttons)) {
        // Новый формат
        shopSettings = dbSettings;
      } else {
        // Старый формат - преобразуем
        shopSettings = {
          buttons: [{
            id: 'legacy',
            enabled: dbSettings.enabled || false,
            buttonText: dbSettings.buttonText || 'Магазин',
            buttonUrl: dbSettings.buttonUrl || 'https://www.wildberries.ru/',
            buttonImage: dbSettings.buttonImage || '/images/shop.jpg',
            showProducts: dbSettings.showProducts || false,
            products: dbSettings.products || []
          }]
        };
      }
      
      console.log('Настройки магазина из БД:', shopSettings);
    }
  } catch (error) {
    console.error('Ошибка при получении настроек из БД:', error);
  }
  
  // Способ 3: Из файла
  try {
    const fileSettings = await getShopSettingsFromFile();
    if (fileSettings) {
      // Проверяем, в новом ли формате настройки
      if (Array.isArray(fileSettings.buttons)) {
        // Новый формат
        shopSettings = fileSettings;
      } else {
        // Старый формат - преобразуем
        shopSettings = {
          buttons: [{
            id: 'legacy',
            enabled: fileSettings.enabled || false,
            buttonText: fileSettings.buttonText || 'Магазин',
            buttonUrl: fileSettings.buttonUrl || 'https://www.wildberries.ru/',
            buttonImage: fileSettings.buttonImage || '/images/shop.jpg',
            showProducts: fileSettings.showProducts || false,
            products: fileSettings.products || []
          }]
        };
      }
      
      console.log('Настройки магазина из файла:', shopSettings);
    }
  } catch (error) {
    console.error('Ошибка при получении настроек из файла:', error);
  }
  
  console.log('Итоговые настройки магазина:', shopSettings);
  
  // Если нет кнопок, добавляем кнопку по умолчанию
  if (!shopSettings.buttons || shopSettings.buttons.length === 0) {
    shopSettings.buttons = [defaultButton];
  }
  
  // Принудительно включаем кнопку для отладки
  // shopSettings.enabled = true;

  return (
    <div className="min-h-screen bg-[#EAE8E1] pb-20">
      {/* Клиентский компонент для блокировки перенаправлений */}
      <HomePageClient />
      
      <div className="max-w-3xl mx-auto">
        {/* Главный баннер/изображение */}
        <div className="px-4 pt-0 pb-6">
          <div className="w-full rounded-[30px] overflow-hidden border-4 border-white shadow-lg">
            <div className="relative" style={{ aspectRatio: '21/9' }}>
        <Image
                src="/images/meditation-banner.jpg" 
                alt="Медитация" 
                fill 
                className="object-cover"
          priority
        />
            </div>
          </div>
        </div>

        {/* Четыре карточки в сетке 2x2 */}
        <div className="px-4 grid grid-cols-2 gap-4 mb-6">
          {/* Услуги */}
          <Link href="/services" className="block rounded-xl shadow-md overflow-hidden relative h-36 group transition-transform hover:scale-[1.02] duration-200">
            {/* Фоновое изображение с явным border-radius */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              <Image 
                src="/images/services.jpg" 
                alt="Услуги" 
                fill 
                className="object-cover object-center"
              />
            </div>
            
            {/* Содержимое карточки */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col">
              <div className="p-3 -mx-1 mb-[-1px] bg-red-200/70 backdrop-blur-sm">
                <div className="flex items-center">
                  <RiServiceLine size={20} className="text-gray-800 mr-2" />
                  <h3 className="text-gray-800 text-lg font-semibold">Услуги</h3>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-gray-800 text-xs font-medium">ОНЛАЙН ЗАПИСЬ</p>
                  <span className="text-gray-800 flex items-center text-xs">
                    <FaArrowRight size={10} />
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Статьи */}
          <Link href="/blog" className="block rounded-xl shadow-md overflow-hidden relative h-36 group transition-transform hover:scale-[1.02] duration-200">
            {/* Фоновое изображение с явным border-radius */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              <Image 
                src="/images/articles.jpg" 
                alt="Статьи" 
                fill 
                className="object-cover object-center"
              />
            </div>
            
            {/* Содержимое карточки */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col">
              <div className="p-3 -mx-1 mb-[-1px] bg-amber-50/70 backdrop-blur-sm">
                <div className="flex items-center">
                  <IoNewspaperOutline size={20} className="text-gray-800 mr-2" />
                  <h3 className="text-gray-800 text-lg font-semibold">Статьи</h3>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-gray-800 text-xs font-medium">Записки Эзотерика</p>
                  <span className="text-gray-800 flex items-center text-xs">
                    <FaArrowRight size={10} />
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Кабинет */}
          <Link href="/cabinet" className="block rounded-xl shadow-md overflow-hidden relative h-36 group transition-transform hover:scale-[1.02] duration-200">
            {/* Фоновое изображение с явным border-radius */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              <Image 
                src="/images/cabinet.jpg" 
                alt="Кабинет" 
                fill 
                className="object-cover object-center"
              />
            </div>
            
            {/* Содержимое карточки */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col">
              <div className="p-3 -mx-1 mb-[-1px] bg-blue-100/70 backdrop-blur-sm">
                <div className="flex items-center">
                  <IoPersonCircleOutline size={20} className="text-gray-800 mr-2" />
                  <h3 className="text-gray-800 text-lg font-semibold">Кабинет</h3>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-gray-800 text-xs font-medium">Ваш кабинет</p>
                  <span className="text-gray-800 flex items-center text-xs">
                    <FaArrowRight size={10} />
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Мероприятия */}
          <Link href="/events" className="block rounded-xl shadow-md overflow-hidden relative h-36 group transition-transform hover:scale-[1.02] duration-200">
            {/* Фоновое изображение с явным border-radius */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
            <Image
                src="/images/events.jpg" 
                alt="Мероприятия" 
                fill 
                className="object-cover object-center"
              />
            </div>
            
            {/* Содержимое карточки */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col">
              <div className="p-3 -mx-1 mb-[-1px] bg-yellow-100/70 backdrop-blur-sm">
                <div className="flex items-center">
                  <MdEvent size={20} className="text-gray-800 mr-2" />
                  <h3 className="text-gray-800 text-lg font-semibold">Мероприятия</h3>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-gray-800 text-xs font-medium">Запись на события</p>
                  <span className="text-gray-800 flex items-center text-xs">
                    <FaArrowRight size={10} />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
        
        {/* Кнопка Отзывы на всю ширину */}
        <div className="px-4 mb-3">
          <HomeReviewsButton />
        </div>
        
        {/* Кнопка Команда на всю ширину - уменьшенная высота */}
        <div className="px-4 mb-6">
          <Link href="/specialists" className="block rounded-xl shadow-md overflow-hidden relative h-14 group transition-all hover:scale-[1.02] hover:shadow-lg duration-200">
            {/* Фоновое изображение с градиентным оверлеем */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
          <Image
                src="/images/team.webp" 
                alt="Команда специалистов" 
                fill 
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#48a9a6] to-[#48a9a6]/20"></div>
            </div>
            
            {/* Содержимое карточки в одну строку */}
            <div className="absolute inset-0 flex items-center px-4 justify-between">
              <div className="flex items-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-white text-lg font-bold leading-tight">Команда специалистов</h3>
                </div>
              </div>
              <div className="bg-white/20 rounded-full p-1 backdrop-blur-sm">
                <FaArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </Link>
        </div>

        {/* Кнопки Магазина (отображаются в зависимости от настроек) */}
        {shopSettings.buttons.filter(button => button.enabled).map((button, index) => (
          <div key={button.id} className="px-4 mb-6">
            <a 
              href={button.buttonUrl} 
          target="_blank"
          rel="noopener noreferrer"
              className="block rounded-xl shadow-md overflow-hidden relative h-32 group transition-all hover:scale-[1.02] hover:shadow-lg duration-200"
        >
              {/* Фоновое изображение */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
          <Image
                  src={button.buttonImage} 
                  alt={button.buttonText} 
                  fill 
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/30"></div>
              </div>
              
              {/* Содержимое карточки */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center">
                  <FaStore className="w-8 h-8 text-white mr-3" />
                  <h3 className="text-white text-2xl font-bold">{button.buttonText}</h3>
                </div>
                <div className="bg-white/20 rounded-full p-2 backdrop-blur-sm ml-4">
                  <FaArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </a>
            
            {/* Товары (отображаются в зависимости от настроек) */}
            {button.showProducts && button.products && button.products.length > 0 && (
              <div className="mt-3">
                <div className={`grid gap-3 ${getProductGridClass(button.products.filter(product => product.enabled).length)}`}>
                  {button.products
                    .filter(product => product.enabled)
                    .map((product) => (
                      <a 
                        key={product.id} 
                        href={product.productUrl} 
          target="_blank"
          rel="noopener noreferrer"
                        className="relative rounded-lg overflow-hidden shadow-md h-24 sm:h-24 max-sm:h-28 transition-transform hover:scale-105"
        >
                        <div className="absolute inset-0">
          <Image
                            src={product.imageUrl} 
                            alt={product.title} 
                            fill 
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors"></div>
                        </div>
                        <div className="absolute inset-0 flex items-end justify-center pb-2">
                          <div className="text-white text-center p-1 px-2 bg-black/50 backdrop-blur-sm rounded-md text-xs max-w-[90%] overflow-hidden">
                            <span className="font-medium truncate block">{product.title}</span>
                          </div>
                        </div>
                      </a>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
