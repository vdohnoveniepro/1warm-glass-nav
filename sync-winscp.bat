@echo off
echo Запуск синхронизации с сервером через WinSCP...

REM Путь к исполняемому файлу WinSCP (измените на ваш)
set WINSCP="C:\Program Files (x86)\WinSCP\WinSCP.exe"

REM Параметры подключения
set HOST=176.109.101.126
set PORT=21
set USERNAME=ваш_ftp_логин
set PASSWORD=ваш_ftp_пароль
set LOCAL_PATH="D:\Сайт\vdohnovenie"
set REMOTE_PATH="/var/www/admin78/data/www/vdohnovenie.pro/"

REM Запуск WinSCP в режиме синхронизации
REM -criteria=time,size - сравнивать файлы по времени и размеру
REM -preview - показать предварительный просмотр изменений
REM -filemask - исключить указанные файлы и папки
%WINSCP% /command ^
    "option batch abort" ^
    "option confirm off" ^
    "open ftp://%USERNAME%:%PASSWORD%@%HOST%:%PORT%" ^
    "lcd %LOCAL_PATH%" ^
    "cd %REMOTE_PATH%" ^
    "synchronize remote -delete -criteria=time,size -filemask="|.git/;node_modules/;.next/;.env;.env.local" %LOCAL_PATH% %REMOTE_PATH%" ^
    "exit"

echo Синхронизация завершена!
pause