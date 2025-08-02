@echo off
echo Запуск отладки миграции базы данных...

:: Проверяем работает ли сервер
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
  echo Сервер не запущен, запускаем в фоновом режиме...
  start /B npm run dev
  
  echo Ожидаем запуск сервера...
  :: Ждем 15 секунд, чтобы сервер успел запуститься
  timeout /t 15 /nobreak >nul
)

:: Выполняем запрос на отладку миграции
echo Отправляем запрос на отладку миграции...
curl -X POST http://localhost:3000/api/db/migrate/debug

echo Отладка миграции завершена! 