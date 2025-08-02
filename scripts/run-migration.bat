@echo off
echo Запуск миграции базы данных...

:: Проверяем работает ли сервер
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
  echo Сервер не запущен, запускаем в фоновом режиме...
  start /B npm run dev
  
  echo Ожидаем запуск сервера...
  :: Ждем 15 секунд, чтобы сервер успел запуститься
  timeout /t 15 /nobreak >nul
)

:: Выполняем запрос на миграцию
echo Отправляем запрос на миграцию...
curl -X POST http://localhost:3000/api/db/migrate

echo Миграция завершена! 