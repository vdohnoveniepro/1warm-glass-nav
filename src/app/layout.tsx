import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { AuthProvider } from "@/lib/AuthContext";
import { ToastProvider, ToastRegistrar } from '@/components/ui/Toast';
import { getSettings } from "@/lib/settings";
import { StoreProvider } from "@/lib/StoreContext";
import { WorkContext } from "@/lib/WorkContext";
import ScrollToTop from "@/components/ScrollToTop";
import Script from "next/script";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import AuthModalProvider from '@/components/AuthModalProvider';
import PageVisitTracker from '@/components/PageVisitTracker';
import AppWrapper from '@/components/AppWrapper';
// Временно отключаем компонент, вызывающий проблемы в Telegram Mini App
// import ClientTelegramLoader from '@/components/ClientTelegramLoader';
import { getTelegramInitData, isTelegramWebApp } from '@/lib/telegram-config';
import ProfileAlertProvider from '@/components/Notifications/ProfileAlertProvider';

// Импорт конфигурации EventEmitter для исправления предупреждения о превышении лимита слушателей
import '../utils/eventEmitterConfig';

// Оптимизация загрузки шрифтов
const inter = Inter({ 
  subsets: ["latin", "cyrillic"],
  display: 'swap', // Улучшает показатели CLS
  preload: true, // Предзагрузка шрифта для улучшения производительности
});

// Добавляем скрипт перехвата перезагрузки страницы
const PAGE_RELOAD_TRACKING = `
  console.log("Page reload or initial load detected at: " + new Date().toISOString());
  window.addEventListener('beforeunload', () => {
    console.log("Page is being unloaded at: " + new Date().toISOString());
  });
`;

// Отключаем скрипт принудительного обновления, который вызывает бесконечный цикл
const TELEGRAM_FORCE_REFRESH = `
  // Проверяем, запущено ли приложение в Telegram
  function isTelegramWebApp() {
    return window.Telegram && window.Telegram.WebApp;
  }

  // Функция для установки заголовков авторизации для Telegram
  function setupTelegramAuth() {
    if (isTelegramWebApp()) {
      console.log('Настройка авторизации для Telegram WebApp');
      
      // Сохраняем флаг, что мы в Telegram WebApp
      localStorage.setItem('isTelegramWebApp', 'true');
      
      // Добавляем перехватчик для fetch запросов
      const originalFetch = window.fetch;
      window.fetch = function(input, init) {
        // Получаем токен из localStorage
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          // Создаем новый объект init, если он отсутствует
          const modifiedInit = init || {};
          
          // Создаем новые заголовки, если они отсутствуют
          const headers = new Headers(modifiedInit.headers || {});
          
          // Добавляем заголовок авторизации
          headers.set('Authorization', 'Bearer ' + token);
          
          // Добавляем заголовок Telegram
          headers.set('X-Telegram-App', 'true');
          
          // Обновляем заголовки в init
          modifiedInit.headers = headers;
          
          // Вызываем оригинальный fetch с модифицированными параметрами
          return originalFetch.call(this, input, modifiedInit);
        }
        
        return originalFetch.call(this, input, init);
      };
    }
  }

  // Запускаем настройку авторизации для Telegram WebApp
  if (isTelegramWebApp()) {
    // Небольшая задержка для загрузки основного контента
    setTimeout(setupTelegramAuth, 300);
  }
`;

export const metadata: Metadata = {
  title: "Вдохновение - центр психологической помощи",
  description: "Центр психологической помощи для решения эмоциональных проблем и улучшения качества жизни", 
  // Отключаем кеширование страницы
  other: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

// Переносим клиентский компонент в отдельный файл
import TelegramAppHeaders from '@/components/TelegramAppHeaders';

// Корневой layout компонент
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSettings();
  const faviconPath = settings?.favicon || '/site-icon.ico';
  
  // Добавляем версию файла в URL вместо случайной метки времени для лучшего кэширования
  const version = settings?.version || '1.0';

  return (
    <html lang="ru" suppressHydrationWarning={true}>
      <head>
        {/* Мета-теги для отключения кеширования */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        
        {/* Предзагрузка критических ресурсов */}
        <link rel="preload" href="/images/logo.png" as="image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Telegram WebApp SDK */}
        <script src="https://telegram.org/js/telegram-web-app.js"></script>

        {/* Обновленные ссылки на фавиконы */}
        <link rel="icon" href={`${faviconPath}?v=${version}`} />
        <link rel="shortcut icon" href={`${faviconPath}?v=${version}`} />
        <link rel="apple-touch-icon" sizes="180x180" href={`/apple-touch-icon.png?v=${version}`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`/favicon-32x32.png?v=${version}`} />
        <link rel="icon" type="image/png" sizes="16x16" href={`/favicon-16x16.png?v=${version}`} />

        {/* Скрипт для принудительного обновления фавикона */}
        <script dangerouslySetInnerHTML={{
          __html: `
            // Обновляем фавикон только при изменении версии в URL
            let currentVersion = localStorage.getItem('faviconVersion');
            let newVersion = '${version}';
            
            if (currentVersion !== newVersion) {
              // Функция для обновления фавикона
              function updateFavicon() {
                const links = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
                
                links.forEach(link => {
                  const href = link.getAttribute('href');
                  if (href) {
                    link.setAttribute('href', href);
                  }
                });
                
                localStorage.setItem('faviconVersion', newVersion);
              }
              
              // Вызываем обновление при загрузке страницы
              document.addEventListener('DOMContentLoaded', updateFavicon);
            }

            // Добавляем отслеживание перезагрузки страницы
            ${PAGE_RELOAD_TRACKING}
            
            // Добавляем настройку авторизации для Telegram WebApp
            ${TELEGRAM_FORCE_REFRESH}
          `
        }} />
      </head>
      <body className={inter.className}>
        <StoreProvider>
            <WorkContext>
                <AuthProvider>
                    <ToastProvider>
                        <ToastRegistrar />
                        <AuthModalProvider />
                        <ScrollToTop />
                        <PageVisitTracker />
                        {/* Временно отключаем компонент, вызывающий проблемы */}
                        {/* <ClientTelegramLoader /> */}
                        <TelegramAppHeaders />
                        <ProfileAlertProvider>
                          <div className="mb-0">
                            <Header />
                          </div>
                          <AppWrapper>
                            {children}
                          </AppWrapper>
                          <BottomNav />
                        </ProfileAlertProvider>
                        <Analytics />
                        <SpeedInsights />
                    </ToastProvider>
                </AuthProvider>
            </WorkContext>
        </StoreProvider>
      </body>
    </html>
  )
}
