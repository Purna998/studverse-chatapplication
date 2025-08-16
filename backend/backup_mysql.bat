@echo off
echo Creating MySQL backup...
set DATE=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE=%DATE: =0%

mysqldump -h localhost -P 3308 -u root -proot studverse > studverse_backup_%DATE%.sql

echo Backup created: studverse_backup_%DATE%.sql
pause
